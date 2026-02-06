import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMonthlyTrend, useDailyWeeklyComparison, useDailyMonthlyComparison } from '@/hooks/useSpendingStats';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type TrendView = 'weekly' | 'monthly';

export function SpendingTrendsCard() {
  const [view, setView] = useState<TrendView>('weekly');
  const { data: dailyComparison, isLoading: weeklyLoading } = useDailyWeeklyComparison();
  const { data: monthlyComparison, isLoading: monthlyLoading } = useDailyMonthlyComparison();

  const isLoading = view === 'weekly' ? weeklyLoading : monthlyLoading;
  
  const weeklyData = dailyComparison?.map(d => ({
    label: d.day,
    thisWeek: d.thisWeek,
    lastWeek: d.lastWeek,
  }));

  const monthlyData = monthlyComparison?.map(m => ({ 
    label: m.week, 
    thisMonth: m.thisMonth,
    lastMonth: m.lastMonth,
  }));

  const hasWeeklyData = weeklyData && weeklyData.some(d => d.thisWeek > 0 || d.lastWeek > 0);
  const hasMonthlyData = monthlyData && monthlyData.some(d => d.thisMonth > 0 || d.lastMonth > 0);
  const hasData = view === 'weekly' ? hasWeeklyData : hasMonthlyData;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Spending Trends</CardTitle>
          <ToggleGroup 
            type="single" 
            value={view} 
            onValueChange={(v) => v && setView(v as TrendView)}
            className="h-9"
          >
            <ToggleGroupItem value="weekly" className="text-xs px-3 h-8">
              Weekly
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" className="text-xs px-3 h-8">
              Monthly
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No spending data to show trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Spending Trends</CardTitle>
        <ToggleGroup 
          type="single" 
          value={view} 
          onValueChange={(v) => v && setView(v as TrendView)}
          className="h-9"
        >
          <ToggleGroupItem value="weekly" className="text-xs px-3 h-8">
            Weekly
          </ToggleGroupItem>
          <ToggleGroupItem value="monthly" className="text-xs px-3 h-8">
            Monthly
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span className="text-muted-foreground">{view === 'weekly' ? 'This Week' : 'This Month'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-muted-foreground/50 rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-muted-foreground">{view === 'weekly' ? 'Last Week' : 'Last Month'}</span>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {view === 'weekly' ? (
              <LineChart data={weeklyData}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`, 
                    name === 'thisWeek' ? 'This Week' : 'Last Week'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                {/* Last week shadow line */}
                <Line 
                  type="monotone" 
                  dataKey="lastWeek" 
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  opacity={0.5}
                />
                {/* This week main line */}
                <Line 
                  type="monotone" 
                  dataKey="thisWeek" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            ) : (
              <LineChart data={monthlyData}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`, 
                    name === 'thisMonth' ? 'This Month' : 'Last Month'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                {/* Last month shadow line */}
                <Line 
                  type="monotone" 
                  dataKey="lastMonth" 
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  opacity={0.5}
                />
                {/* This month main line */}
                <Line 
                  type="monotone" 
                  dataKey="thisMonth" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
