import { AppLayout } from '@/components/layout/AppLayout';
import { BudgetCategoriesManager } from '@/components/budget/BudgetCategoriesManager';
import { FinancialPulse } from '@/components/dashboard/FinancialPulse';
import { useIsMobile } from '@/hooks/use-mobile';

export default function BudgetPage() {
  const isMobile = useIsMobile();
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className={isMobile ? "text-2xl font-bold text-foreground" : "text-3xl font-bold text-foreground"}>
            Budget & Categories
          </h1>
          {!isMobile && (
            <p className="text-muted-foreground mt-1">
              Set budgets and manage your income and expense categories.
            </p>
          )}
        </div>
        
        {/* Financial Pulse - Income/Spent/Left */}
        <FinancialPulse />
        
        <BudgetCategoriesManager />
      </div>
    </AppLayout>
  );
}
