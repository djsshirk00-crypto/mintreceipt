import { AppLayout } from '@/components/layout/AppLayout';
import { BudgetManager } from '@/components/budget/BudgetManager';

export default function BudgetPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budget</h1>
          <p className="text-muted-foreground mt-1">
            Set and track your zero-based budget for each category.
          </p>
        </div>
        
        <BudgetManager />
      </div>
    </AppLayout>
  );
}
