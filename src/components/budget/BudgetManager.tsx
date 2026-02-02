import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useExpenseCategories, useIncomeCategories } from '@/hooks/useCategories';
import { useBudgetsWithSpending, useBulkUpsertBudgets, useTotalBudgetSummary } from '@/hooks/useBudgets';
import { ChevronLeft, ChevronRight, Save, AlertTriangle, DollarSign, Wallet, TrendingUp, PiggyBank, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TransactionListDialog } from './TransactionListDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export function BudgetManager() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [actualIncomeInputs, setActualIncomeInputs] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expensesOpen, setExpensesOpen] = useState(true);
  
  // Transaction dialog state
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState<string | null>(null);

  const handleOpenAllTransactions = () => {
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    setSelectedCategoryIcon(null);
    setShowTransactions(true);
  };

  const handleOpenCategoryTransactions = (categoryId: string, categoryName: string, categoryIcon: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
    setSelectedCategoryIcon(categoryIcon);
    setShowTransactions(true);
  };

  const handleCloseTransactions = () => {
    setShowTransactions(false);
  };

  const { data: expenseCategories, isLoading: expenseLoading } = useExpenseCategories();
  const { data: incomeCategories, isLoading: incomeLoading } = useIncomeCategories();
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

  const handleActualIncomeChange = (categoryId: string, value: string) => {
    setActualIncomeInputs(prev => ({ ...prev, [categoryId]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const allCategories = [...(expenseCategories || []), ...(incomeCategories || [])];
    if (allCategories.length === 0) return;

    const budgets = allCategories
      .filter(c => !c.parent_id)
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
  const isLoading = expenseLoading || incomeLoading || budgetsLoading;

  // Get top-level categories only
  const topLevelExpense = expenseCategories?.filter(c => !c.parent_id) || [];
  const topLevelIncome = incomeCategories?.filter(c => !c.parent_id) || [];

  // Calculate totals
  const projectedIncome = topLevelIncome.reduce((sum, c) => sum + (parseFloat(budgetInputs[c.id] || '0') || 0), 0);
  const actualIncome = topLevelIncome.reduce((sum, c) => sum + (parseFloat(actualIncomeInputs[c.id] || '0') || 0), 0);
  const totalExpenses = topLevelExpense.reduce((sum, c) => sum + (parseFloat(budgetInputs[c.id] || '0') || 0), 0);
  const toBeAssigned = projectedIncome - totalExpenses;
  const isFullyAssigned = Math.abs(toBeAssigned) < 0.01;

  return (
    <div className="space-y-4 pb-24">
      {/* Month Navigation - Compact */}
      <div className="flex items-center justify-center gap-3 py-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-[140px] text-center">
          <span className="font-semibold text-lg">{monthName} {year}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary Cards - Mobile Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Projected Income */}
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Projected</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">${projectedIncome.toFixed(0)}</p>
          </CardContent>
        </Card>

        {/* Actual Income */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Actual</span>
            </div>
            <p className="text-xl font-bold text-blue-600">${actualIncome.toFixed(0)}</p>
          </CardContent>
        </Card>

        {/* Budgeted */}
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Budgeted</span>
            </div>
            <p className="text-xl font-bold text-primary">${totalExpenses.toFixed(0)}</p>
          </CardContent>
        </Card>

        {/* To Be Assigned */}
        <Card className={cn(
          "border",
          isFullyAssigned 
            ? "bg-emerald-500/10 border-emerald-500/20" 
            : toBeAssigned > 0 
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-destructive/10 border-destructive/20"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {isFullyAssigned ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className={cn("h-4 w-4", toBeAssigned > 0 ? "text-amber-600" : "text-destructive")} />
              )}
              <span className="text-xs text-muted-foreground">
                {isFullyAssigned ? 'Balanced' : toBeAssigned > 0 ? 'To Assign' : 'Over'}
              </span>
            </div>
            <p className={cn(
              "text-xl font-bold",
              isFullyAssigned 
                ? "text-emerald-600" 
                : toBeAssigned > 0 
                  ? "text-amber-600" 
                  : "text-destructive"
            )}>
              ${Math.abs(toBeAssigned).toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spent Summary - Clickable */}
      {summary && (
        <button 
          onClick={handleOpenAllTransactions}
          className="w-full"
        >
          <Card className="bg-muted/50 hover:bg-muted transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold">${summary.totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Spent this month</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>
      )}

      {/* Income Section - Collapsible */}
      <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold">Income</span>
                <span className="text-sm text-muted-foreground">({topLevelIncome.length})</span>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                incomeOpen && "rotate-180"
              )} />
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : topLevelIncome.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  No income categories yet
                </p>
              ) : (
                <div className="space-y-3">
                  {topLevelIncome.map(category => {
                    const projectedValue = budgetInputs[category.id] || '';
                    const actualValue = actualIncomeInputs[category.id] || '';

                    return (
                      <div key={category.id} className="p-3 rounded-lg bg-muted/30 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <Label className="font-medium text-sm">{category.name}</Label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Projected</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={projectedValue}
                                onChange={(e) => handleInputChange(category.id, e.target.value)}
                                placeholder="0"
                                className="pl-5 h-9 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Actual</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={actualValue}
                                onChange={(e) => handleActualIncomeChange(category.id, e.target.value)}
                                placeholder="0"
                                className="pl-5 h-9 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expenses Section - Collapsible */}
      <Collapsible open={expensesOpen} onOpenChange={setExpensesOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="font-semibold">Expenses</span>
                <span className="text-sm text-muted-foreground">({topLevelExpense.length})</span>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                expensesOpen && "rotate-180"
              )} />
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : topLevelExpense.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  No expense categories yet
                </p>
              ) : (
                <div className="space-y-3">
                  {topLevelExpense.map(category => {
                    const budgetData = budgetsWithSpending?.find(b => b.category_id === category.id);
                    const inputValue = budgetInputs[category.id] || '';
                    const budgetAmount = parseFloat(inputValue) || 0;
                    const spent = budgetData?.spent || 0;
                    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
                    const isOverBudget = percentage > 100;

                    return (
                      <div 
                        key={category.id} 
                        className="p-3 rounded-lg bg-muted/30 space-y-2"
                        onClick={() => handleOpenCategoryTransactions(category.id, category.name, category.icon)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <Label className="font-medium text-sm cursor-pointer">{category.name}</Label>
                          </div>
                          {isOverBudget && budgetAmount > 0 && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={inputValue}
                            onChange={(e) => handleInputChange(category.id, e.target.value)}
                            placeholder="0"
                            className="pl-5 h-9 text-sm"
                          />
                        </div>

                        {budgetAmount > 0 && (
                          <div className="space-y-1">
                            <Progress 
                              value={Math.min(percentage, 100)} 
                              className={cn(
                                "h-1.5",
                                isOverBudget && "[&>div]:bg-destructive"
                              )}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>${spent.toFixed(0)} spent</span>
                              <span className={isOverBudget ? 'text-destructive font-medium' : ''}>
                                {isOverBudget ? `$${(spent - budgetAmount).toFixed(0)} over` : `$${(budgetAmount - spent).toFixed(0)} left`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Floating Save Button */}
      {isDirty && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40 safe-area-bottom">
          <Button 
            onClick={handleSave} 
            disabled={bulkUpsert.isPending}
            className="w-full shadow-lg"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {bulkUpsert.isPending ? 'Saving...' : 'Save Budget'}
          </Button>
        </div>
      )}

      {/* Transaction List Dialog */}
      <TransactionListDialog
        open={showTransactions}
        onClose={handleCloseTransactions}
        categoryId={selectedCategoryId}
        categoryName={selectedCategoryName}
        categoryIcon={selectedCategoryIcon}
        month={month}
        year={year}
      />
    </div>
  );
}