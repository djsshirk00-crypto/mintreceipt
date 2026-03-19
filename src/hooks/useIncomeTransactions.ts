import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export type IncomeType = 'salary' | 'commission' | 'rental' | 'interest' | 'reimbursement' | 'other';

export interface IncomeTransaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category_id: string | null;
  income_type: IncomeType;
  source: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurrence_interval: string | null;
  notes: string | null;
  import_source: string | null;
  external_id: string | null;
  rental_property_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewIncomeTransaction {
  amount: number;
  description: string;
  category_id?: string | null;
  income_type: IncomeType;
  source?: string | null;
  transaction_date: string;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  notes?: string | null;
  import_source?: string;
  external_id?: string | null;
  rental_property_id?: string | null;
}

// ── Fetch all income transactions ──────────────────────────────────────────
export function useIncomeTransactions(filters?: {
  startDate?: Date;
  endDate?: Date;
  incomeType?: IncomeType;
}) {
  return useQuery({
    queryKey: ['income-transactions', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('income_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('transaction_date', format(filters.startDate, 'yyyy-MM-dd'));
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', format(filters.endDate, 'yyyy-MM-dd'));
      }
      if (filters?.incomeType) {
        query = query.eq('income_type', filters.incomeType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as IncomeTransaction[];
    },
  });
}

// ── Monthly income summary ─────────────────────────────────────────────────
export function useMonthlyIncome(month: number, year: number) {
  return useQuery({
    queryKey: ['monthly-income', month, year],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('income_transactions')
        .select('amount, income_type')
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      if (error) throw error;

      const transactions = data || [];
      const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const byType: Record<string, number> = {};
      transactions.forEach(t => {
        byType[t.income_type] = (byType[t.income_type] || 0) + Number(t.amount);
      });

      return { total, byType, transactions };
    },
  });
}

// ── Annual income summary ──────────────────────────────────────────────────
export function useAnnualIncome(year: number) {
  return useQuery({
    queryKey: ['annual-income', year],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const start = format(startOfYear(new Date(year, 0)), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date(year, 0)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('income_transactions')
        .select('amount, income_type, transaction_date')
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      const transactions = data || [];
      const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      // Monthly breakdown
      const monthly: Record<string, number> = {};
      transactions.forEach(t => {
        const month = t.transaction_date.substring(0, 7); // YYYY-MM
        monthly[month] = (monthly[month] || 0) + Number(t.amount);
      });

      // By type
      const byType: Record<string, number> = {};
      transactions.forEach(t => {
        byType[t.income_type] = (byType[t.income_type] || 0) + Number(t.amount);
      });

      return { total, monthly, byType, transactions };
    },
  });
}

// ── Add income transaction ─────────────────────────────────────────────────
export function useAddIncomeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transaction: NewIncomeTransaction) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('income_transactions')
        .insert({ ...transaction, user_id: user.id, import_source: transaction.import_source || 'manual' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-income'] });
      queryClient.invalidateQueries({ queryKey: ['annual-income'] });
      queryClient.invalidateQueries({ queryKey: ['savings-rate'] });
      toast.success('Income added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add income: ${error.message}`);
    },
  });
}

// ── Update income transaction ──────────────────────────────────────────────
export function useUpdateIncomeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncomeTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('income_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-income'] });
      queryClient.invalidateQueries({ queryKey: ['annual-income'] });
      queryClient.invalidateQueries({ queryKey: ['savings-rate'] });
      toast.success('Income updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update income: ${error.message}`);
    },
  });
}

// ── Delete income transaction ──────────────────────────────────────────────
export function useDeleteIncomeTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-income'] });
      queryClient.invalidateQueries({ queryKey: ['annual-income'] });
      queryClient.invalidateQueries({ queryKey: ['savings-rate'] });
      toast.success('Income deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete income: ${error.message}`);
    },
  });
}
