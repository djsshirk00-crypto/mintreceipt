import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTotalBudgetSummary } from '@/hooks/useBudgets';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  isLoading?: boolean;
}

function MetricCard({ label, value, icon, colorClass, isLoading }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/30 min-h-[88px] justify-center">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', colorClass || 'bg-muted')}>
        {icon}
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-16" />
      ) : (
        <p className="text-lg font-bold text-foreground">${value.toLocaleString()}</p>
      )}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function FinancialPulse() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const { data: summary, isLoading } = useTotalBudgetSummary(month, year);
  
  const income = summary?.totalIncome || 0;
  const spent = summary?.totalSpent || 0;
  const remaining = income - spent;
  const percentUsed = income > 0 ? Math.min((spent / income) * 100, 100) : 0;
  
  // Health status based on percentage used
  const getHealthStatus = () => {
    if (percentUsed < 70) return { color: 'bg-success/20 text-success', label: 'On Track', icon: <TrendingDown className="h-4 w-4" /> };
    if (percentUsed < 90) return { color: 'bg-warning/20 text-warning', label: 'Watch Spending', icon: <TrendingUp className="h-4 w-4" /> };
    return { color: 'bg-destructive/20 text-destructive', label: 'Over Budget', icon: <TrendingUp className="h-4 w-4" /> };
  };
  
  const health = getHealthStatus();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
          <span className={cn('text-xs px-2 py-1 rounded-full font-medium', health.color)}>
            {health.label}
          </span>
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2">
          <Link to="/budget?filter=income" className="block active:scale-[0.98] transition-transform">
            <MetricCard
              label="Income"
              value={income}
              icon={<TrendingUp className="h-4 w-4 text-success" />}
              colorClass="bg-success/20"
              isLoading={isLoading}
            />
          </Link>
          
          <Link to="/transactions?range=this-month" className="block active:scale-[0.98] transition-transform">
            <MetricCard
              label="Spent"
              value={spent}
              icon={<TrendingDown className="h-4 w-4 text-destructive" />}
              colorClass="bg-destructive/20"
              isLoading={isLoading}
            />
          </Link>
          
          <Link to="/budget" className="block active:scale-[0.98] transition-transform">
            <MetricCard
              label="Left"
              value={Math.max(0, remaining)}
              icon={<Wallet className="h-4 w-4 text-primary" />}
              colorClass="bg-primary/20"
              isLoading={isLoading}
            />
          </Link>
        </div>
        
        {/* Progress Bar */}
        <Link to="/budget" className="block">
          <div className="space-y-2">
            <Progress 
              value={percentUsed} 
              className={cn(
                'h-3 cursor-pointer transition-all hover:scale-[1.02]',
                percentUsed >= 90 && '[&>div]:bg-destructive',
                percentUsed >= 70 && percentUsed < 90 && '[&>div]:bg-warning'
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percentUsed.toFixed(0)}% used</span>
              <span>${remaining >= 0 ? remaining.toLocaleString() : 0} remaining</span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
