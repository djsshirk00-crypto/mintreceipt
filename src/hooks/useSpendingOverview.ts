import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTotalBudgetSummary } from './useBudgets';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subWeeks, subMonths, subQuarters, subYears, format 
} from 'date-fns';

export type OverviewPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface PeriodData {
  label: string;
  income: number;
  spent: number;
  startDate: Date;
  endDate: Date;
}

export interface SpendingOverviewData {
  periods: PeriodData[];
  currentPeriod: PeriodData;
  netIncome: number;
}

function getPeriodRanges(period: OverviewPeriod): { periods: number; getRange: (offset: number) => { start: Date; end: Date; label: string } } {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return {
        periods: 8,
        getRange: (offset) => {
          const start = startOfWeek(subWeeks(now, offset), { weekStartsOn: 1 });
          const end = endOfWeek(subWeeks(now, offset), { weekStartsOn: 1 });
          return { start, end, label: format(start, 'MMM d') };
        }
      };
    case 'month':
      return {
        periods: 6,
        getRange: (offset) => {
          const start = startOfMonth(subMonths(now, offset));
          const end = endOfMonth(subMonths(now, offset));
          return { start, end, label: format(start, 'MMM') };
        }
      };
    case 'quarter':
      return {
        periods: 4,
        getRange: (offset) => {
          const start = startOfQuarter(subQuarters(now, offset));
          const end = endOfQuarter(subQuarters(now, offset));
          return { start, end, label: `Q${Math.floor(start.getMonth() / 3) + 1} ${format(start, 'yy')}` };
        }
      };
    case 'year':
      return {
        periods: 5,
        getRange: (offset) => {
          const start = startOfYear(subYears(now, offset));
          const end = endOfYear(subYears(now, offset));
          return { start, end, label: format(start, 'yyyy') };
        }
      };
  }
}

export function useSpendingOverview(period: OverviewPeriod = 'month') {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Get current month's budget summary for income
  const { data: budgetSummary } = useTotalBudgetSummary(currentMonth, currentYear);
  
  return useQuery({
    queryKey: ['spending-overview', period],
    queryFn: async () => {
      const { periods: periodCount, getRange } = getPeriodRanges(period);
      const results: PeriodData[] = [];
      
      // Fetch spending data for each period
      for (let i = periodCount - 1; i >= 0; i--) {
        const { start, end, label } = getRange(i);
        
        // Get spending from receipts (total_amount is source of truth for overall spending)
        const { data: receipts } = await supabase
          .from('receipts')
          .select('total_amount')
          .in('status', ['processed', 'reviewed'])
          .gte('receipt_date', format(start, 'yyyy-MM-dd'))
          .lte('receipt_date', format(end, 'yyyy-MM-dd'));
        
        const spent = receipts?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;
        
        // For income, we use budget data for the period's month
        const periodMonth = start.getMonth() + 1;
        const periodYear = start.getFullYear();
        
        const { data: budgets } = await supabase
          .from('budgets')
          .select('amount, categories!inner(type)')
          .eq('month', periodMonth)
          .eq('year', periodYear);
        
        const income = budgets
          ?.filter((b: any) => b.categories?.type === 'income')
          .reduce((sum, b) => sum + (Number(b.amount) || 0), 0) || 0;
        
        results.push({
          label,
          income,
          spent,
          startDate: start,
          endDate: end,
        });
      }
      
      const currentPeriod = results[results.length - 1] || {
        label: 'Current',
        income: budgetSummary?.totalIncome || 0,
        spent: budgetSummary?.totalSpent || 0,
        startDate: new Date(),
        endDate: new Date(),
      };
      
      return {
        periods: results,
        currentPeriod,
        netIncome: currentPeriod.income - currentPeriod.spent,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
