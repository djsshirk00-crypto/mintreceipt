import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpendingStats, useWeeklyTrend, useMonthlyTrend, useCustomSpendingStats, TimeRange } from '@/hooks/useSpendingStats';
import { DynamicCategorySummaryGrid } from './DynamicCategorySummary';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Link } from 'react-router-dom';

export function SpendingReports() {
  const [timeRange, setTimeRange] = useState<TimeRange>('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  
  const { data: spendingStats, isLoading } = useSpendingStats(timeRange);
  const { data: customStats, isLoading: isCustomLoading } = useCustomSpendingStats(
    timeRange === 'custom' ? customStartDate ?? null : null,
    timeRange === 'custom' ? customEndDate ?? null : null
  );
  const { data: weeklyTrend } = useWeeklyTrend();
  const { data: monthlyTrend } = useMonthlyTrend();

  // Use custom stats when in custom mode, otherwise use preset stats
  const displayStats = timeRange === 'custom' ? customStats : spendingStats;
  const displayLoading = timeRange === 'custom' ? isCustomLoading : isLoading;

  // Calculate trend
  const calculateTrend = () => {
    if (!weeklyTrend || weeklyTrend.length < 2) return { direction: 'flat', percentage: 0 };
    
    const current = weeklyTrend[weeklyTrend.length - 1]?.total || 0;
    const previous = weeklyTrend[weeklyTrend.length - 2]?.total || 0;
    
    if (previous === 0) return { direction: 'flat', percentage: 0 };
    
    const change = ((current - previous) / previous) * 100;
    
    if (change > 5) return { direction: 'up', percentage: Math.abs(change) };
    if (change < -5) return { direction: 'down', percentage: Math.abs(change) };
    return { direction: 'flat', percentage: Math.abs(change) };
  };

  const trend = calculateTrend();

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-semibold text-foreground">Spending Reports</h2>
        <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="this-week">This Week</TabsTrigger>
            <TabsTrigger value="last-week">Last Week</TabsTrigger>
            <TabsTrigger value="this-month">This Month</TabsTrigger>
            <TabsTrigger value="last-month">Last Month</TabsTrigger>
            <TabsTrigger value="all-time">All Time</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </div>

        {/* Custom Date Range Picker */}
        {timeRange === 'custom' && (
          <div className="flex flex-wrap gap-4 mt-4">
            <DatePicker
              label="From"
              date={customStartDate}
              onSelect={setCustomStartDate}
            />
            <DatePicker
              label="To"
              date={customEndDate}
              onSelect={setCustomEndDate}
            />
          </div>
        )}

        <TabsContent value={timeRange} className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/budget">
              <Card className="hover:shadow-medium transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                      {displayLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground">
                          ${displayStats?.total.toFixed(2) || '0.00'}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    {displayLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {displayStats?.receiptCount || 0}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">Receipts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    trend.direction === 'up' ? 'bg-destructive/20 text-destructive' :
                    trend.direction === 'down' ? 'bg-success/20 text-success' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {trend.direction === 'up' ? <TrendingUp className="h-6 w-6" /> :
                     trend.direction === 'down' ? <TrendingDown className="h-6 w-6" /> :
                     <Minus className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      trend.direction === 'up' ? 'text-destructive' :
                      trend.direction === 'down' ? 'text-success' :
                      'text-foreground'
                    }`}>
                      {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                      {trend.percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">vs Last Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {displayLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : displayStats && displayStats.categories.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Spending by Category - {displayStats.label}
              </h3>
              <DynamicCategorySummaryGrid 
                categories={displayStats.categories} 
                total={displayStats.total}
              />
            </div>
          ) : timeRange === 'custom' && (!customStartDate || !customEndDate) ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Select a date range to view spending data.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No spending data for this period.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Weekly Trend Chart */}
      {weeklyTrend && weeklyTrend.some(w => w.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend}>
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Total']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {weeklyTrend.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === weeklyTrend.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend Chart */}
      {monthlyTrend && monthlyTrend.some(m => m.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Total']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
