import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpendingStats, useWeeklyTrend, useMonthlyTrend, useCustomSpendingStats, TimeRange, CategorySpending } from '@/hooks/useSpendingStats';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Color palette for pie chart slices
const CATEGORY_COLORS = [
  'hsl(142, 60%, 45%)',   // Green (Groceries)
  'hsl(210, 80%, 55%)',   // Blue (Household)
  'hsl(280, 70%, 55%)',   // Purple (Clothing)
  'hsl(30, 80%, 55%)',    // Orange (Other)
  'hsl(340, 70%, 55%)',   // Pink
  'hsl(180, 60%, 45%)',   // Teal
];

interface PieDataItem {
  name: string;
  value: number;
  icon: string;
  color: string;
  percentage: number;
  categoryData: CategorySpending;
}

interface CustomLegendProps {
  data: PieDataItem[];
  onCategoryClick: (category: CategorySpending) => void;
}

function CustomLegend({ data, onCategoryClick }: CustomLegendProps) {
  return (
    <div className="space-y-2 mt-4">
      {data.map((entry) => (
        <button
          key={entry.name}
          onClick={() => onCategoryClick(entry.categoryData)}
          className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left min-h-[52px]"
        >
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-base">{entry.icon}</span>
          <span className="text-sm font-medium text-foreground truncate flex-1">
            {entry.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {entry.percentage.toFixed(0)}%
          </span>
          <span className="text-sm font-semibold text-foreground">
            ${entry.value.toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function SpendingReports() {
  const navigate = useNavigate();
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

  // Handle category card click - navigate to transactions with filters
  const handleCategoryClick = useCallback((category: CategorySpending) => {
    if (!displayStats) return;
    
    const params = new URLSearchParams();
    params.set('category', category.categoryName.toLowerCase());
    params.set('from', format(displayStats.startDate, 'yyyy-MM-dd'));
    params.set('to', format(displayStats.endDate, 'yyyy-MM-dd'));
    
    navigate(`/transactions?${params.toString()}`);
  }, [displayStats, navigate]);

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
        <div className="flex flex-col gap-4 overflow-hidden">
          <h2 className="text-xl font-semibold text-foreground">Spending Reports</h2>
          <TabsList className="flex flex-wrap h-auto gap-1 w-full">
            <TabsTrigger value="this-week" className="text-xs px-2 py-1.5">This Week</TabsTrigger>
            <TabsTrigger value="last-week" className="text-xs px-2 py-1.5">Last Week</TabsTrigger>
            <TabsTrigger value="this-month" className="text-xs px-2 py-1.5">This Month</TabsTrigger>
            <TabsTrigger value="last-month" className="text-xs px-2 py-1.5">Last Month</TabsTrigger>
            <TabsTrigger value="all-time" className="text-xs px-2 py-1.5">All Time</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs px-2 py-1.5">Custom</TabsTrigger>
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

            <Link to="/reviewed">
              <Card className="hover:shadow-medium transition-shadow cursor-pointer">
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
            </Link>

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
            (() => {
              const pieData: PieDataItem[] = displayStats.categories
                .filter(c => c.amount > 0)
                .map((c, index) => ({
                  name: c.categoryName,
                  value: c.amount,
                  icon: c.icon,
                  color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                  percentage: displayStats.total > 0 ? (c.amount / displayStats.total) * 100 : 0,
                  categoryData: c,
                }));

              if (pieData.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No spending data for this period.</p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Spending Breakdown - {displayStats.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Donut Chart */}
                    <div className="h-64 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            onClick={(_, index) => handleCategoryClick(pieData[index].categoryData)}
                            className="cursor-pointer"
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                className="hover:opacity-80 transition-opacity"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Total */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-xl font-bold text-foreground">
                            ${displayStats.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Legend */}
                    <CustomLegend 
                      data={pieData} 
                      onCategoryClick={handleCategoryClick}
                    />
                  </CardContent>
                </Card>
              );
            })()
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
