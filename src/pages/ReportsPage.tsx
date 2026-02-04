import { AppLayout } from '@/components/layout/AppLayout';
import { SpendingReports } from '@/components/receipt/SpendingReports';

export default function ReportsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analyze your spending trends and patterns.
          </p>
        </div>
        
        <SpendingReports />
      </div>
    </AppLayout>
  );
}
