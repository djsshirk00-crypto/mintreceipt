import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subWeeks, subMonths, format, addDays, differenceInDays 
} from 'date-fns';
import { useBudgets } from './useBudgets';

interface TrendPoint {
  label: string;
  current: number;
  previous: number;
}

interface CumulativeTrendData {
  points: TrendPoint[];
  currentTotal: number;
  previousTotal: number;
  totalBudget: number;
}

async function fetchDailyTotals(start: Date, end: Date) {
  const { data } = await supabase
    .from('receipts')
    .select('total_amount, receipt_date')
    .in('status', ['processed', 'reviewed'])
    .gte('receipt_date', format(start, 'yyyy-MM-dd'))
    .lte('receipt_date', format(end, 'yyyy-MM-dd'));

  const dailyMap: Record<string, number> = {};
  data?.forEach(r => {
    const d = r.receipt_date || '';
    dailyMap[d] = (dailyMap[d] || 0) + (Number(r.total_amount) || 0);
  });
  return dailyMap;
}

export function useCumulativeSpendingTrend(view: 'weekly' | 'monthly') {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data: budgets } = useBudgets(month, year);

  return useQuery({
    queryKey: ['cumulative-spending-trend', view],
    queryFn: async (): Promise<CumulativeTrendData> => {
      let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;

      if (view === 'weekly') {
        currentStart = startOfWeek(now, { weekStartsOn: 1 });
        currentEnd = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      } else {
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
      }

      const [currentDaily, prevDaily] = await Promise.all([
        fetchDailyTotals(currentStart, currentEnd),
        fetchDailyTotals(prevStart, prevEnd),
      ]);

      const totalDays = differenceInDays(currentEnd, currentStart) + 1;
      const points: TrendPoint[] = [];
      let cumCurrent = 0;
      let cumPrevious = 0;

      for (let i = 0; i < totalDays; i++) {
        const curDay = addDays(currentStart, i);
        const prevDay = addDays(prevStart, i);
        const curKey = format(curDay, 'yyyy-MM-dd');
        const prevKey = format(prevDay, 'yyyy-MM-dd');

        cumCurrent += currentDaily[curKey] || 0;
        cumPrevious += prevDaily[prevKey] || 0;

        const label = view === 'weekly' 
          ? format(curDay, 'EEE') 
          : format(curDay, 'd');

        // For monthly view, only show every few days to avoid clutter
        if (view === 'monthly' && totalDays > 14 && i % 3 !== 0 && i !== totalDays - 1) {
          points.push({ label: '', current: cumCurrent, previous: cumPrevious });
        } else {
          points.push({ label, current: cumCurrent, previous: cumPrevious });
        }
      }

      // Calculate total budget for the period
      const totalBudget = budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;

      return {
        points,
        currentTotal: cumCurrent,
        previousTotal: cumPrevious,
        totalBudget: view === 'monthly' ? totalBudget : 0,
      };
    },
  });
}
