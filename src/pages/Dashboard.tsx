import { AppLayout } from '@/components/layout/AppLayout';
import { FinancialPulse } from '@/components/dashboard/FinancialPulse';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { PendingReviewAlert } from '@/components/dashboard/PendingReviewAlert';
import { SpendingOverviewCard } from '@/components/dashboard/SpendingOverviewCard';
import { CategoryBreakdownList } from '@/components/dashboard/CategoryBreakdownList';

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

        {/* Financial Pulse - Income/Spent/Remaining */}
        <div data-tour="financial-pulse">
          <FinancialPulse />
        </div>

        {/* Quick Actions - Upload + Manual Entry */}
        <div data-tour="upload-zone">
          <QuickActions />
        </div>

        {/* Pending Review Alert (conditionally rendered) */}
        <div data-tour="status-cards">
          <PendingReviewAlert />
        </div>

        {/* Spending Overview - Period-based charts */}
        <div data-tour="spending-reports">
          <SpendingOverviewCard />
        </div>

        {/* Category Breakdown - Collapsible list */}
        <CategoryBreakdownList />
      </div>
    </AppLayout>
  );
}
