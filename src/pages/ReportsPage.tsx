import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SpendingReports } from '@/components/receipt/SpendingReports';
import { SpendingOverviewCard } from '@/components/dashboard/SpendingOverviewCard';
import { SavingsGoalCard } from '@/components/dashboard/SavingsGoalCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { useAnnualIncome } from '@/hooks/useIncomeTransactions';
import { useSavingsRate } from '@/hooks/useSavingsGoal';
import { useAllRentalSummary } from '@/hooks/useRentalProperties';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Monthly Income vs Spending chart data ─────────────────────────────────
function useMonthlyComparison(months = 12) {
  return useQuery({
    queryKey: ['monthly-comparison', months],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const result = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');
        const label = format(date, 'MMM yy');

        const [{ data: incomeData }, { data: spendingData }] = await Promise.all([
          supabase
            .from('income_transactions')
            .select('amount')
            .eq('user_id', user.id)
            .gte('transaction_date', start)
            .lte('transaction_date', end),
          supabase
            .from('receipts')
            .select('total_amount')
            .eq('user_id', user.id)
            .in('status', ['reviewed'])
            .gte('receipt_date', start)
            .lte('receipt_date', end),
        ]);

        const income = (incomeData || []).reduce((s, t) => s + Number(t.amount), 0);
        const spending = (spendingData || []).reduce((s, t) => s + Number(t.total_amount), 0);
        const savings = Math.max(0, income - spending);
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        result.push({ label, income, spending, savings, savingsRate });
      }
      return result;
    },
  });
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      ))}
    </div>
  );
}

function SavingsRateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

// ── Annual Summary Section ─────────────────────────────────────────────────
function AnnualSummary() {
  const year = new Date().getFullYear();
  const { data: annualIncome, isLoading: incomeLoading } = useAnnualIncome(year);
  const { data: savingsData, isLoading: savingsLoading } = useSavingsRate(year);
  const { data: rentalData, isLoading: rentalLoading } = useAllRentalSummary(year);

  const isLoading = incomeLoading || savingsLoading || rentalLoading;

  const tiles = [
    {
      label: `${year} Total Income`,
      value: `$${(annualIncome?.total || 0).toLocaleString()}`,
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      color: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Savings Rate',
      value: `${(savingsData?.savingsRate || 0).toFixed(1)}%`,
      sub: `Goal: 20%`,
      icon: <PiggyBank className="h-4 w-4 text-purple-600" />,
      color: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      label: 'Total Saved',
      value: `$${(savingsData?.totalSaved || 0).toLocaleString()}`,
      sub: `Gap: $${(savingsData?.gap || 0).toLocaleString()}`,
      icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
      color: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Net Rental Income',
      value: `$${(rentalData?.totalNet || 0).toLocaleString()}`,
      icon: <Home className="h-4 w-4 text-amber-600" />,
      color: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((t, i) => (
        <Card key={i} className={cn('border-0', t.color)}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              {t.icon}
              <span className="text-xs text-muted-foreground">{t.label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-xl font-bold text-foreground">{t.value}</p>
            )}
            {t.sub && !isLoading && (
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { data: monthlyData, isLoading: chartLoading } = useMonthlyComparison(12);

  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Full picture of your income, spending, and savings.
          </p>
        </div>

        {/* Annual KPI Summary */}
        <AnnualSummary />

        {/* Savings Goal Tracker */}
        <SavingsGoalCard />

        {/* Charts */}
        <Tabs defaultValue="income-vs-spending">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full">
            <TabsTrigger value="income-vs-spending" className="text-xs px-3 py-1.5">
              Income vs Spending
            </TabsTrigger>
            <TabsTrigger value="savings-rate" className="text-xs px-3 py-1.5">
              Savings Rate
            </TabsTrigger>
            <TabsTrigger value="spending-detail" className="text-xs px-3 py-1.5">
              Spending Detail
            </TabsTrigger>
          </TabsList>

          {/* Income vs Spending Bar Chart */}
          <TabsContent value="income-vs-spending" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Income vs Spending — Last 12 Months
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="spending" name="Spending" fill="#f87171" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="savings" name="Saved" fill="#818cf8" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Savings Rate Line Chart */}
          <TabsContent value="savings-rate" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Savings Rate — Last 12 Months
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => `${v.toFixed(0)}%`}
                        domain={[0, 'auto']}
                      />
                      <Tooltip content={<SavingsRateTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine
                        y={20}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{ value: '20% Goal', position: 'right', fontSize: 10, fill: '#10b981' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="savingsRate"
                        name="Savings Rate"
                        stroke="#818cf8"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#818cf8' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {/* Month-by-month table */}
                {!chartLoading && monthlyData && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 font-medium text-muted-foreground">Month</th>
                          <th className="text-right py-1.5 font-medium text-muted-foreground">Income</th>
                          <th className="text-right py-1.5 font-medium text-muted-foreground">Spending</th>
                          <th className="text-right py-1.5 font-medium text-muted-foreground">Saved</th>
                          <th className="text-right py-1.5 font-medium text-muted-foreground">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-1.5 text-foreground">{row.label}</td>
                            <td className="py-1.5 text-right text-emerald-600">
                              ${row.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-1.5 text-right text-red-500">
                              ${row.spending.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-1.5 text-right text-purple-600">
                              ${row.savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className={cn(
                              'py-1.5 text-right font-medium',
                              row.savingsRate >= 20 ? 'text-emerald-600' : 'text-muted-foreground'
                            )}>
                              {row.savingsRate.toFixed(1)}%
                              {row.savingsRate >= 20 && ' ✓'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spending Detail (existing component) */}
          <TabsContent value="spending-detail" className="mt-4 space-y-4">
            <SpendingOverviewCard />
            <SpendingReports />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
