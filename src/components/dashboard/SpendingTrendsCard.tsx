import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWeeklyTrend, useMonthlyTrend } from '@/hooks/useSpendingStats';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type TrendView = 'weekly' | 'monthly';

export function SpendingTrendsCard() {
  const [view, setView] = useState<TrendView>('weekly');
  const { data: weeklyTrend, isLoading: weeklyLoading } = useWeeklyTrend();
  const { data: monthlyTrend, isLoading: monthlyLoading } = useMonthlyTrend();

  const isLoading = view === 'weekly' ? weeklyLoading : monthlyLoading;
  const trendData = view === 'weekly' 
    ? weeklyTrend?.map(w => ({ label: w.week, total: w.total }))
    : monthlyTrend?.map(m => ({ label: m.month, total: m.total }));

  const hasData = trendData && trendData.some(d => d.total > 0);

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
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
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
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
