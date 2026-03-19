import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfYear, endOfYear, format } from 'date-fns';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_rate: number;
  target_amount: number | null;
  year: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Fetch savings goal for a year ─────────────────────────────────────────
export function useSavingsGoal(year?: number) {
  const targetYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['savings-goal', targetYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', targetYear)
        .maybeSingle();

      if (error) throw error;
      return data as SavingsGoal | null;
    },
  });
}

// ── Upsert savings goal ────────────────────────────────────────────────────
export function useUpsertSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goal: { target_rate: number; target_amount?: number | null; year?: number; name?: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const year = goal.year || new Date().getFullYear();
      const { data, error } = await supabase
        .from('savings_goals')
        .upsert({
          user_id: user.id,
          year,
          target_rate: goal.target_rate,
          target_amount: goal.target_amount ?? null,
          name: goal.name || 'Savings Goal',
          notes: goal.notes ?? null,
        }, { onConflict: 'user_id,year' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
      queryClient.invalidateQueries({ queryKey: ['savings-rate'] });
      toast.success('Savings goal updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update savings goal: ${error.message}`);
    },
  });
}

// ── Calculate actual savings rate ─────────────────────────────────────────
// Savings = M1/investment outflows from receipts categorized as "Savings / Investment"
// Rate = savings / total income * 100
export function useSavingsRate(year?: number) {
  const targetYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['savings-rate', targetYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const start = format(startOfYear(new Date(targetYear, 0)), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date(targetYear, 0)), 'yyyy-MM-dd');

      // Total income for the year
      const { data: incomeData } = await supabase
        .from('income_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      const totalIncome = (incomeData || []).reduce((sum, t) => sum + Number(t.amount), 0);

      // Total savings: receipts categorized as savings/investment
      // Look for categories with name containing 'Savings' or 'Investment'
      const { data: savingsCats } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', '%saving%');

      const savingsCatIds = (savingsCats || []).map(c => c.id);

      let totalSaved = 0;
      if (savingsCatIds.length > 0) {
        const { data: savingsReceipts } = await supabase
          .from('receipts')
          .select('total_amount')
          .eq('user_id', user.id)
          .in('status', ['reviewed'])
          .gte('receipt_date', start)
          .lte('receipt_date', end);

        // Also check receipt_category_amounts for savings categories
        const { data: catAmounts } = await supabase
          .from('receipt_category_amounts')
          .select('amount, category_id')
          .in('category_id', savingsCatIds);

        totalSaved = (catAmounts || []).reduce((sum, a) => sum + Number(a.amount), 0);
      }

      const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;
      const targetSavings = totalIncome * 0.20; // default 20%

      return {
        totalIncome,
        totalSaved,
        savingsRate,
        targetSavings,
        gap: Math.max(0, targetSavings - totalSaved),
        monthlyGap: Math.max(0, (targetSavings - totalSaved) / 12),
      };
    },
  });
}
