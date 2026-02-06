import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCumulativeSpendingTrend } from '@/hooks/useSpendingTrends';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

type TrendView = 'weekly' | 'monthly';

export function SpendingTrendsCard() {
  const [view, setView] = useState<TrendView>('monthly');
  const { data, isLoading } = useCumulativeSpendingTrend(view);

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

  const hasData = data && data.points.some(p => p.current > 0 || p.previous > 0);

  const toggleGroup = (
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
  );

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Spending Trends</CardTitle>
          {toggleGroup}
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No spending data to show trends.</p>
        </CardContent>
      </Card>
    );
  }

  const currentTotal = data!.currentTotal;
  const previousTotal = data!.previousTotal;
  const diff = previousTotal - currentTotal;
  const isUnder = diff >= 0;
  const budget = data!.totalBudget;
  const periodLabel = view === 'monthly' ? 'this month' : 'this week';
  const comparisonLabel = view === 'monthly' ? 'avg. spend' : 'last week';

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Spending Trends</CardTitle>
        {toggleGroup}
      </CardHeader>
      <CardContent>
        {/* Summary header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Current spend {periodLabel}</p>
            <p className="text-2xl font-bold text-foreground">${currentTotal.toFixed(0)}</p>
          </div>
          {previousTotal > 0 && (
            <div className="flex items-center gap-1.5">
              {isUnder ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  ${Math.abs(diff).toFixed(0)} {isUnder ? 'below' : 'above'}
                </p>
                <p className="text-xs text-muted-foreground">{comparisonLabel}</p>
              </div>
            </div>
          )}
        </div>

        {/* Area chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data!.points}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={45}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(2)}`, 
                  name === 'current' ? (view === 'monthly' ? 'This Month' : 'This Week') : (view === 'monthly' ? 'Last Month' : 'Last Week')
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              {/* Budget reference line */}
              {budget > 0 && (
                <ReferenceLine 
                  y={budget} 
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="6 4"
                  strokeWidth={1}
                  label={{ 
                    value: 'BUDGET', 
                    position: 'right',
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))'
                  }}
                />
              )}
              {/* Previous period shadow area */}
              <Area
                type="monotone"
                dataKey="previous"
                stroke="none"
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.08}
              />
              {/* Current period line + fill */}
              <Area
                type="monotone"
                dataKey="current"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#spendGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span className="text-muted-foreground">{view === 'monthly' ? 'This Month' : 'This Week'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted-foreground/10" />
            <span className="text-muted-foreground">{view === 'monthly' ? 'Last Month' : 'Last Week'}</span>
          </div>
          {budget > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0 border-t border-dashed border-muted-foreground" />
              <span className="text-muted-foreground">Budget</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
