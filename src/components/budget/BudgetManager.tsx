import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useCategories } from '@/hooks/useCategories';
import { useBudgetsWithSpending, useBulkUpsertBudgets, useTotalBudgetSummary } from '@/hooks/useBudgets';
import { ChevronLeft, ChevronRight, Save, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function BudgetManager() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: budgetsWithSpending, isLoading: budgetsLoading } = useBudgetsWithSpending(month, year);
  const { data: summary } = useTotalBudgetSummary(month, year);
  const bulkUpsert = useBulkUpsertBudgets();

  // Initialize budget inputs from existing budgets
  useEffect(() => {
    if (budgetsWithSpending) {
      const inputs: Record<string, string> = {};
      budgetsWithSpending.forEach(b => {
        inputs[b.category_id] = b.amount.toString();
      });
      setBudgetInputs(inputs);
      setIsDirty(false);
    }
  }, [budgetsWithSpending]);

  const handleInputChange = (categoryId: string, value: string) => {
    setBudgetInputs(prev => ({ ...prev, [categoryId]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!categories) return;

    const budgets = categories
      .filter(c => !c.parent_id) // Only top-level categories for now
      .map(c => ({
        category_id: c.id,
        amount: parseFloat(budgetInputs[c.id] || '0') || 0,
      }))
      .filter(b => b.amount > 0);

    await bulkUpsert.mutateAsync({ budgets, month, year });
    setIsDirty(false);
  };

  const navigateMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setMonth(newMonth);
    setYear(newYear);
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const totalBudgeted = Object.values(budgetInputs).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  const isLoading = categoriesLoading || budgetsLoading;

  // Get top-level categories only
  const topLevelCategories = categories?.filter(c => !c.parent_id) || [];

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Zero-Based Budget</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center font-medium">
            {monthName} {year}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${totalBudgeted.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
              </div>
            </div>

            {summary && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ${summary.totalSpent.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Spent</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    summary.totalRemaining >= 0 ? "bg-success/20" : "bg-destructive/20"
                  )}>
                    <span className={cn(
                      "text-xl",
                      summary.totalRemaining >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {summary.totalRemaining >= 0 ? '✓' : '!'}
                    </span>
                  </div>
                  <div>
                    <p className={cn(
                      "text-2xl font-bold",
                      summary.totalRemaining >= 0 ? "text-success" : "text-destructive"
                    )}>
                      ${Math.abs(summary.totalRemaining).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {summary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{summary.overallPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(summary.overallPercentage, 100)} 
                    className={cn(
                      "h-3",
                      summary.overallPercentage > 100 && "[&>div]:bg-destructive"
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Inputs by Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Set Category Budgets</CardTitle>
          <Button 
            onClick={handleSave} 
            disabled={!isDirty || bulkUpsert.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {bulkUpsert.isPending ? 'Saving...' : 'Save Budgets'}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : topLevelCategories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No categories found. Create categories first to set budgets.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topLevelCategories.map(category => {
                const budgetData = budgetsWithSpending?.find(b => b.category_id === category.id);
                const inputValue = budgetInputs[category.id] || '';
                const budgetAmount = parseFloat(inputValue) || 0;
                const spent = budgetData?.spent || 0;
                const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
                const isOverBudget = percentage > 100;

                return (
                  <div 
                    key={category.id} 
                    className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{category.icon}</span>
                      <Label className="font-medium">{category.name}</Label>
                      {isOverBudget && budgetAmount > 0 && (
                        <AlertTriangle className="h-4 w-4 text-destructive ml-auto" />
                      )}
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inputValue}
                        onChange={(e) => handleInputChange(category.id, e.target.value)}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>

                    {budgetAmount > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>${spent.toFixed(2)} spent</span>
                          <span className={isOverBudget ? 'text-destructive' : ''}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className={cn(
                            "h-2",
                            isOverBudget && "[&>div]:bg-destructive"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Progress Details */}
      {budgetsWithSpending && budgetsWithSpending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetsWithSpending.map(budget => {
                const isOverBudget = budget.percentage > 100;
                
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{budget.category_icon}</span>
                        <span className="font-medium">{budget.category_name}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-medium",
                          isOverBudget ? "text-destructive" : "text-foreground"
                        )}>
                          ${budget.spent.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground"> / ${budget.amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(budget.percentage, 100)} 
                      className={cn(
                        "h-2",
                        isOverBudget && "[&>div]:bg-destructive"
                      )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {isOverBudget 
                          ? `$${Math.abs(budget.remaining).toFixed(2)} over budget`
                          : `$${budget.remaining.toFixed(2)} remaining`
                        }
                      </span>
                      <span>{budget.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
