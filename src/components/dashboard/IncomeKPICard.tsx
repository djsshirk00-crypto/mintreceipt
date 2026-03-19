import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, Home, PiggyBank } from 'lucide-react';
import { useMonthlyIncome } from '@/hooks/useIncomeTransactions';
import { useAllRentalSummary } from '@/hooks/useRentalProperties';
import { useSavingsRate } from '@/hooks/useSavingsGoal';
import { cn } from '@/lib/utils';

interface KPITileProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ReactNode;
  colorClass: string;
  to?: string;
  isLoading?: boolean;
}

function KPITile({ label, value, subLabel, icon, colorClass, to, isLoading }: KPITileProps) {
  const content = (
    <div className={cn(
      'flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-card',
      'hover:shadow-sm transition-shadow',
      to && 'cursor-pointer active:scale-[0.98] transition-transform'
    )}>
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', colorClass)}>
        {icon}
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
      )}
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {subLabel && !isLoading && (
        <p className="text-xs text-muted-foreground">{subLabel}</p>
      )}
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

export function IncomeKPICard() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: monthlyIncome, isLoading: incomeLoading } = useMonthlyIncome(month, year);
  const { data: rentalData, isLoading: rentalLoading } = useAllRentalSummary(year);
  const { data: savingsData, isLoading: savingsLoading } = useSavingsRate(year);

  const totalMonthlyIncome = monthlyIncome?.total ?? 0;
  const netRental = rentalData?.totalNet ?? 0;
  const savingsRate = savingsData?.savingsRate ?? 0;
  const totalSaved = savingsData?.totalSaved ?? 0;

  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <KPITile
        label="Income This Month"
        value={fmt(totalMonthlyIncome)}
        icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        colorClass="bg-emerald-100 dark:bg-emerald-900/30"
        to="/income"
        isLoading={incomeLoading}
      />
      <KPITile
        label="Net Rental Income"
        value={fmt(netRental)}
        subLabel={`${year} YTD`}
        icon={<Home className="h-4 w-4 text-blue-600" />}
        colorClass="bg-blue-100 dark:bg-blue-900/30"
        to="/rentals"
        isLoading={rentalLoading}
      />
      <KPITile
        label="Savings Rate"
        value={`${savingsRate.toFixed(1)}%`}
        subLabel={`$${totalSaved.toLocaleString()} saved`}
        icon={<PiggyBank className="h-4 w-4 text-purple-600" />}
        colorClass="bg-purple-100 dark:bg-purple-900/30"
        to="/reports"
        isLoading={savingsLoading}
      />
      <KPITile
        label="Saved YTD"
        value={fmt(totalSaved)}
        subLabel={`Goal: ${savingsData ? (savingsData.totalIncome * 0.2).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}`}
        icon={<Wallet className="h-4 w-4 text-amber-600" />}
        colorClass="bg-amber-100 dark:bg-amber-900/30"
        to="/reports"
        isLoading={savingsLoading}
      />
    </div>
  );
}
