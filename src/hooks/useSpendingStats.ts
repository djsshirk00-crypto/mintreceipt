import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories, Category } from './useCategories';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from 'date-fns';

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
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;
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
          label = 'All Time';
          break;
      }

      // Build query
      let query = supabase
        .from('receipts')
        .select('id, total_amount, groceries_amount, household_amount, clothing_amount, other_amount, receipt_date, created_at, status')
        .in('status', ['processed', 'reviewed']);

      if (startDate) {
        query = query.gte('receipt_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('receipt_date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data: receipts, error } = await query;

      if (error) throw error;

      // Calculate totals by legacy category
      const legacyCategoryTotals: Record<string, number> = {
        groceries: 0,
        household: 0,
        clothing: 0,
        other: 0,
      };

      let total = 0;

      receipts?.forEach((r) => {
        legacyCategoryTotals.groceries += Number(r.groceries_amount) || 0;
        legacyCategoryTotals.household += Number(r.household_amount) || 0;
        legacyCategoryTotals.clothing += Number(r.clothing_amount) || 0;
        legacyCategoryTotals.other += Number(r.other_amount) || 0;
        total += Number(r.total_amount) || 0;
      });

      // Map to category spending with database categories
      const categories: CategorySpending[] = [];
      
      // Add database categories with their amounts
      if (dbCategories) {
        for (const cat of dbCategories) {
          const legacyKey = cat.name.toLowerCase();
          const amount = legacyCategoryTotals[legacyKey] || 0;
          
          categories.push({
            categoryId: cat.id,
            categoryName: cat.name,
            icon: cat.icon,
            color: cat.color,
            amount,
          });
        }
      } else {
        // Fallback to legacy categories if no db categories
        categories.push(
          { categoryId: 'groceries', categoryName: 'Groceries', icon: '🥬', color: 'groceries', amount: legacyCategoryTotals.groceries },
          { categoryId: 'household', categoryName: 'Household', icon: '🏠', color: 'household', amount: legacyCategoryTotals.household },
          { categoryId: 'clothing', categoryName: 'Clothing', icon: '👕', color: 'clothing', amount: legacyCategoryTotals.clothing },
          { categoryId: 'other', categoryName: 'Other', icon: '📦', color: 'other', amount: legacyCategoryTotals.other },
        );
      }

      // Sort by amount descending
      categories.sort((a, b) => b.amount - a.amount);

      return {
        label,
        startDate: startDate || new Date(0),
        endDate: endDate || now,
        total,
        categories,
        receiptCount: receipts?.length || 0,
      };
    },
    enabled: timeRange !== 'custom',
  });
}

export function useCustomSpendingStats(startDate: Date | null, endDate: Date | null) {
  const { data: dbCategories } = useCategories();

  return useQuery({
    queryKey: ['spending-stats', 'custom', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate) return null;

      // Build query with custom date range
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('id, total_amount, groceries_amount, household_amount, clothing_amount, other_amount, receipt_date, created_at, status')
        .in('status', ['processed', 'reviewed'])
        .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
        .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;

      // Calculate totals by legacy category
      const legacyCategoryTotals: Record<string, number> = {
        groceries: 0,
        household: 0,
        clothing: 0,
        other: 0,
      };

      let total = 0;

      receipts?.forEach((r) => {
        legacyCategoryTotals.groceries += Number(r.groceries_amount) || 0;
        legacyCategoryTotals.household += Number(r.household_amount) || 0;
        legacyCategoryTotals.clothing += Number(r.clothing_amount) || 0;
        legacyCategoryTotals.other += Number(r.other_amount) || 0;
        total += Number(r.total_amount) || 0;
      });

      // Map to category spending with database categories
      const categories: CategorySpending[] = [];
      
      if (dbCategories) {
        for (const cat of dbCategories) {
          const legacyKey = cat.name.toLowerCase();
          const amount = legacyCategoryTotals[legacyKey] || 0;
          
          categories.push({
            categoryId: cat.id,
            categoryName: cat.name,
            icon: cat.icon,
            color: cat.color,
            amount,
          });
        }
      } else {
        categories.push(
          { categoryId: 'groceries', categoryName: 'Groceries', icon: '🥬', color: 'groceries', amount: legacyCategoryTotals.groceries },
          { categoryId: 'household', categoryName: 'Household', icon: '🏠', color: 'household', amount: legacyCategoryTotals.household },
          { categoryId: 'clothing', categoryName: 'Clothing', icon: '👕', color: 'clothing', amount: legacyCategoryTotals.clothing },
          { categoryId: 'other', categoryName: 'Other', icon: '📦', color: 'other', amount: legacyCategoryTotals.other },
        );
      }

      // Sort by amount descending
      categories.sort((a, b) => b.amount - a.amount);

      const label = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

      return {
        label,
        startDate,
        endDate,
        total,
        categories,
        receiptCount: receipts?.length || 0,
      };
    },
    enabled: !!startDate && !!endDate,
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
