import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCategories, useExpenseCategories, useIncomeCategories } from './useCategories';
import { getCategorySpendingMap } from '@/lib/lineItemAggregation';

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
      if (!categories || categories.length === 0) {
        return [];
      }

      // Get budgets for the period
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      if (budgetError) throw budgetError;

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      // Get spending from line items (source of truth)
      const categorySpending = await getCategorySpendingMap(startDate, endDate, categories);

      // Combine budgets with category info and spending
      const budgetsWithSpending: BudgetWithCategory[] = (budgets || []).map(budget => {
        const category = categories.find(c => c.id === budget.category_id);
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
    enabled: !!categories && categories.length > 0,
  });
}

export function useTotalBudgetSummary(month: number, year: number) {
  const { data: budgetsWithSpending } = useBudgetsWithSpending(month, year);
  const { data: incomeCategories } = useIncomeCategories();
  const { data: expenseCategories } = useExpenseCategories();
  
  return useQuery({
    queryKey: ['budget-summary', month, year, budgetsWithSpending, incomeCategories, expenseCategories],
    queryFn: async () => {
      if (!budgetsWithSpending || !incomeCategories || !expenseCategories) return null;
      
      const incomeCategoryIds = new Set(incomeCategories.map(c => c.id));
      const expenseCategoryIds = new Set(expenseCategories.map(c => c.id));
      
      const incomeBudgets = budgetsWithSpending.filter(b => incomeCategoryIds.has(b.category_id));
      const expenseBudgets = budgetsWithSpending.filter(b => expenseCategoryIds.has(b.category_id));
      
      const totalIncome = incomeBudgets.reduce((sum, b) => sum + b.amount, 0);
      const totalExpenses = expenseBudgets.reduce((sum, b) => sum + b.amount, 0);
      
      // Calculate totalSpent from ALL receipt totals (absolute truth)
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('total_amount')
        .in('status', ['processed', 'reviewed'])
        .gte('receipt_date', startDate.toISOString().split('T')[0])
        .lte('receipt_date', endDate.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      const totalSpent = receipts?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;
      
      const toBeAssigned = totalIncome - totalExpenses;
      const overallPercentage = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;
      
      return {
        totalIncome,
        totalExpenses,
        totalSpent,
        toBeAssigned,
        overallPercentage,
        categoryCount: expenseBudgets.length,
      };
    },
    enabled: !!budgetsWithSpending && !!incomeCategories && !!expenseCategories,
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
