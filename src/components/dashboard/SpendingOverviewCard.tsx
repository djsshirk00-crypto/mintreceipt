import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpendingOverview, OverviewPeriod } from '@/hooks/useSpendingOverview';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronDown, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const PERIOD_OPTIONS: { value: OverviewPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  to?: string;
  onClick?: () => void;
  expandable?: boolean;
  isExpanded?: boolean;
  colorClass?: string;
}

function SummaryRow({ icon, label, value, to, onClick, expandable, isExpanded, colorClass }: SummaryRowProps) {
  const content = (
    <div className={cn(
      'flex items-center gap-3 p-3 min-h-[52px]',
      'hover:bg-muted/50 active:scale-[0.99] transition-all rounded-lg',
      (to || onClick) && 'cursor-pointer'
    )}>
      <span className="text-lg">{icon}</span>
      <span className="flex-1 font-medium text-foreground">{label}</span>
      <span className={cn('font-semibold', colorClass || 'text-foreground')}>
        ${Math.abs(value).toLocaleString()}
      </span>
      {to && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
      {expandable && (
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
      )}
      {!to && !expandable && onClick && (
        <Info className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return content;
}

export function SpendingOverviewCard() {
  const [period, setPeriod] = useState<OverviewPeriod>('month');
  const [spendExpanded, setSpendExpanded] = useState(false);
  const navigate = useNavigate();
  
  const { data, isLoading } = useSpendingOverview(period);
  
  const handleNetIncomeInfo = () => {
    toast.info('Net Income = Income - Total Spend', {
      description: 'This shows how much you saved (or overspent) in the current period.',
    });
  };

  const netIncomeColor = (data?.netIncome || 0) >= 0 ? 'text-success' : 'text-destructive';
  const netIncomeIcon = (data?.netIncome || 0) >= 0 
    ? <TrendingUp className="h-5 w-5 text-success" />
    : <TrendingDown className="h-5 w-5 text-destructive" />;

  // Prepare chart data
  const chartData = data?.periods.map(p => ({
    label: p.label,
    income: p.income,
    spent: p.spent,
  })) || [];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Period Toggle */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={cn(
                'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all',
                period === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : chartData.length > 0 ? (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`,
                    name === 'income' ? 'Income' : 'Spent'
                  ]}
                />
                <Bar dataKey="income" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`income-${index}`} 
                      fill={index === chartData.length - 1 ? 'hsl(var(--success))' : 'hsl(var(--success) / 0.4)'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="spent" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {chartData.map((_, index) => (
                    <Cell 
                      key={`spent-${index}`} 
                      fill={index === chartData.length - 1 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground) / 0.3)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No data for this period
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-destructive" />
            <span>Spent</span>
          </div>
        </div>

        {/* Summary Rows */}
        <div className="border-t border-border pt-2 space-y-1">
          <SummaryRow
            icon="💰"
            label="Income"
            value={data?.currentPeriod.income || 0}
            to="/budget?filter=income"
          />
          
          <Collapsible open={spendExpanded} onOpenChange={setSpendExpanded}>
            <CollapsibleTrigger asChild>
              <div>
                <SummaryRow
                  icon="💸"
                  label="Total Spend"
                  value={data?.currentPeriod.spent || 0}
                  expandable
                  isExpanded={spendExpanded}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-8 py-2">
                <Link 
                  to="/transactions" 
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all transactions
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          <SummaryRow
            icon={netIncomeIcon}
            label="Net Income"
            value={data?.netIncome || 0}
            onClick={handleNetIncomeInfo}
            colorClass={netIncomeColor}
          />
        </div>
      </CardContent>
    </Card>
  );
}
