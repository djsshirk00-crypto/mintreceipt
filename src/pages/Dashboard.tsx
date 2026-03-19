import { AppLayout } from '@/components/layout/AppLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { PendingReviewAlert } from '@/components/dashboard/PendingReviewAlert';
import { SpendingBreakdownCard } from '@/components/dashboard/SpendingBreakdownCard';
import { SpendingTrendsCard } from '@/components/dashboard/SpendingTrendsCard';
import { CategoryBreakdownList } from '@/components/dashboard/CategoryBreakdownList';
import { IncomeKPICard } from '@/components/dashboard/IncomeKPICard';
import { SavingsGoalCard } from '@/components/dashboard/SavingsGoalCard';

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6 pb-28">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your financial snapshot at a glance.
          </p>
        </div>

        {/* Quick Actions - Upload + Manual Entry (receipt scanning stays front & center) */}
        <div data-tour="upload-zone">
          <QuickActions />
        </div>

        {/* Pending Review Alert (conditionally rendered) */}
        <div data-tour="status-cards">
          <PendingReviewAlert />
        </div>

        {/* Income KPI Cards — monthly income, rental net, savings rate, saved YTD */}
        <IncomeKPICard />

        {/* Savings Goal Tracker */}
        <SavingsGoalCard />

        {/* Spending Breakdown - Pie chart with budget-aware legend */}
        <div data-tour="spending-breakdown">
          <SpendingBreakdownCard />
        </div>

        {/* Spending Trends - Line chart with weekly/monthly toggle */}
        <div data-tour="spending-trends">
          <SpendingTrendsCard />
        </div>

        {/* Category Breakdown - Collapsible list */}
        <CategoryBreakdownList />
      </div>
    </AppLayout>
  );
}
