import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories, Category } from './useCategories';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns';
import { aggregateLineItemSpending } from '@/lib/lineItemAggregation';

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: number;
}

export interface SpendingPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
  total: number;
  categories: CategorySpending[];
}

export type TimeRange = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time' | 'custom';

export function useSpendingStats(timeRange: TimeRange = 'this-month') {
  const { data: dbCategories } = useCategories();

  return useQuery({
    queryKey: ['spending-stats', timeRange],
    queryFn: async () => {
      if (!dbCategories || dbCategories.length === 0) {
        return null;
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let label = '';

      switch (timeRange) {
        case 'this-week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          label = 'This Week';
          break;
        case 'last-week':
          startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          label = 'Last Week';
          break;
        case 'this-month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          label = format(now, 'MMMM yyyy');
          break;
        case 'last-month':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          label = format(subMonths(now, 1), 'MMMM yyyy');
          break;
        case 'all-time':
        default:
          // For all-time, use a very old start date
          startDate = new Date(2000, 0, 1);
          endDate = now;
          label = 'All Time';
          break;
      }

      // Use line items as source of truth for category spending
      const { total, categoryTotals, receiptCount } = await aggregateLineItemSpending(
        startDate,
        endDate,
        dbCategories
      );

      // Map to CategorySpending format
      const categories: CategorySpending[] = categoryTotals.map(ct => ({
        categoryId: ct.categoryId,
        categoryName: ct.categoryName,
        icon: ct.icon,
        color: ct.color,
        amount: ct.amount,
      }));

      return {
        label,
        startDate,
        endDate,
        total,
        categories,
        receiptCount,
      };
    },
    enabled: timeRange !== 'custom' && !!dbCategories && dbCategories.length > 0,
  });
}

export function useCustomSpendingStats(startDate: Date | null, endDate: Date | null) {
  const { data: dbCategories } = useCategories();

  return useQuery({
    queryKey: ['spending-stats', 'custom', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate || !dbCategories || dbCategories.length === 0) {
        return null;
      }

      // Use line items as source of truth for category spending
      const { total, categoryTotals, receiptCount } = await aggregateLineItemSpending(
        startDate,
        endDate,
        dbCategories
      );

      // Map to CategorySpending format
      const categories: CategorySpending[] = categoryTotals.map(ct => ({
        categoryId: ct.categoryId,
        categoryName: ct.categoryName,
        icon: ct.icon,
        color: ct.color,
        amount: ct.amount,
      }));

      const label = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

      return {
        label,
        startDate,
        endDate,
        total,
        categories,
        receiptCount,
      };
    },
    enabled: !!startDate && !!endDate && !!dbCategories && dbCategories.length > 0,
  });
}

export function useWeeklyTrend() {
  return useQuery({
    queryKey: ['weekly-trend'],
    queryFn: async () => {
      const weeks: Array<{ week: string; total: number; startDate: Date }> = [];
      const now = new Date();

      // Get last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

        const { data: receipts } = await supabase
          .from('receipts')
          .select('total_amount')
          .in('status', ['processed', 'reviewed'])
          .gte('receipt_date', format(weekStart, 'yyyy-MM-dd'))
          .lte('receipt_date', format(weekEnd, 'yyyy-MM-dd'));

        const total = receipts?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;

        weeks.push({
          week: format(weekStart, 'MMM d'),
          total,
          startDate: weekStart,
        });
      }

      return weeks;
    },
  });
}

export function useDailyWeeklyComparison() {
  return useQuery({
    queryKey: ['daily-weekly-comparison'],
    queryFn: async () => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      // Fetch this week's receipts
      const { data: thisWeekReceipts } = await supabase
        .from('receipts')
        .select('total_amount, receipt_date')
        .in('status', ['processed', 'reviewed'])
        .gte('receipt_date', format(thisWeekStart, 'yyyy-MM-dd'))
        .lte('receipt_date', format(now, 'yyyy-MM-dd'));

      // Fetch last week's receipts
      const { data: lastWeekReceipts } = await supabase
        .from('receipts')
        .select('total_amount, receipt_date')
        .in('status', ['processed', 'reviewed'])
        .gte('receipt_date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('receipt_date', format(lastWeekEnd, 'yyyy-MM-dd'));

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const result: Array<{ day: string; thisWeek: number; lastWeek: number }> = [];

      for (let i = 0; i < 7; i++) {
        const thisWeekDay = new Date(thisWeekStart);
        thisWeekDay.setDate(thisWeekStart.getDate() + i);
        const thisWeekDayStr = format(thisWeekDay, 'yyyy-MM-dd');

        const lastWeekDay = new Date(lastWeekStart);
        lastWeekDay.setDate(lastWeekStart.getDate() + i);
        const lastWeekDayStr = format(lastWeekDay, 'yyyy-MM-dd');

        const thisWeekTotal = thisWeekReceipts
          ?.filter(r => r.receipt_date === thisWeekDayStr)
          .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;

        const lastWeekTotal = lastWeekReceipts
          ?.filter(r => r.receipt_date === lastWeekDayStr)
          .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;

        result.push({
          day: days[i],
          thisWeek: thisWeekTotal,
          lastWeek: lastWeekTotal,
        });
      }

      return result;
    },
  });
}

export function useMonthlyTrend() {
  return useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async () => {
      const months: Array<{ month: string; total: number; startDate: Date }> = [];
      const now = new Date();

      // Get last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));

        const { data: receipts } = await supabase
          .from('receipts')
          .select('total_amount')
          .in('status', ['processed', 'reviewed'])
          .gte('receipt_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('receipt_date', format(monthEnd, 'yyyy-MM-dd'));

        const total = receipts?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0;

        months.push({
          month: format(monthStart, 'MMM'),
          total,
          startDate: monthStart,
        });
      }

      return months;
    },
  });
}
