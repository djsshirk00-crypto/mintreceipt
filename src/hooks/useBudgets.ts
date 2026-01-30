import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCategories } from './useCategories';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithCategory extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
  spent: number;
  remaining: number;
  percentage: number;
}

export function useBudgets(month: number, year: number) {
  return useQuery({
    queryKey: ['budgets', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      if (error) throw error;
      return data as Budget[];
    },
  });
}

export function useBudgetsWithSpending(month: number, year: number) {
  const { data: categories } = useCategories();
  
  return useQuery({
    queryKey: ['budgets-with-spending', month, year],
    queryFn: async () => {
      // Get budgets for the period
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      if (budgetError) throw budgetError;

      // Get spending from receipt_category_amounts for the period
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select('id, receipt_date')
        .gte('receipt_date', startDate.toISOString().split('T')[0])
        .lte('receipt_date', endDate.toISOString().split('T')[0])
        .eq('status', 'reviewed');

      if (receiptsError) throw receiptsError;

      const receiptIds = receipts?.map(r => r.id) || [];
      
      let categorySpending: Record<string, number> = {};
      
      if (receiptIds.length > 0) {
        const { data: amounts, error: amountsError } = await supabase
          .from('receipt_category_amounts')
          .select('category_id, amount')
          .in('receipt_id', receiptIds);

        if (amountsError) throw amountsError;

        // Sum spending by category
        categorySpending = (amounts || []).reduce((acc, item) => {
          acc[item.category_id] = (acc[item.category_id] || 0) + Number(item.amount);
          return acc;
        }, {} as Record<string, number>);
      }

      // Combine budgets with category info and spending
      const budgetsWithSpending: BudgetWithCategory[] = (budgets || []).map(budget => {
        const category = categories?.find(c => c.id === budget.category_id);
        const spent = categorySpending[budget.category_id] || 0;
        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
          ...budget,
          category_name: category?.name || 'Unknown',
          category_icon: category?.icon || '📦',
          category_color: category?.color || 'muted',
          spent,
          remaining,
          percentage,
        };
      });

      return budgetsWithSpending;
    },
    enabled: !!categories,
  });
}

export function useTotalBudgetSummary(month: number, year: number) {
  const { data: budgetsWithSpending } = useBudgetsWithSpending(month, year);
  
  return useQuery({
    queryKey: ['budget-summary', month, year, budgetsWithSpending],
    queryFn: () => {
      if (!budgetsWithSpending) return null;
      
      const totalBudget = budgetsWithSpending.reduce((sum, b) => sum + b.amount, 0);
      const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0);
      const totalRemaining = totalBudget - totalSpent;
      const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      return {
        totalBudget,
        totalSpent,
        totalRemaining,
        overallPercentage,
        categoryCount: budgetsWithSpending.length,
      };
    },
    enabled: !!budgetsWithSpending,
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      category_id, 
      amount, 
      month, 
      year 
    }: { 
      category_id: string; 
      amount: number; 
      month: number; 
      year: number;
    }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in');

      // Upsert: insert or update if exists
      const { data, error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category_id,
          amount,
          month,
          year,
        }, {
          onConflict: 'user_id,category_id,month,year',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Budget;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['budgets-with-spending', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      toast.success('Budget saved');
    },
    onError: (error) => {
      toast.error(`Failed to save budget: ${error.message}`);
    },
  });
}

export function useBulkUpsertBudgets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      budgets, 
      month, 
      year 
    }: { 
      budgets: { category_id: string; amount: number }[]; 
      month: number; 
      year: number;
    }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in');

      const upsertData = budgets.map(b => ({
        user_id: user.id,
        category_id: b.category_id,
        amount: b.amount,
        month,
        year,
      }));

      const { data, error } = await supabase
        .from('budgets')
        .upsert(upsertData, {
          onConflict: 'user_id,category_id,month,year',
        })
        .select();

      if (error) throw error;
      return data as Budget[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['budgets-with-spending', variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      toast.success('Budgets saved');
    },
    onError: (error) => {
      toast.error(`Failed to save budgets: ${error.message}`);
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets-with-spending'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      toast.success('Budget removed');
    },
    onError: (error) => {
      toast.error(`Failed to delete budget: ${error.message}`);
    },
  });
}
