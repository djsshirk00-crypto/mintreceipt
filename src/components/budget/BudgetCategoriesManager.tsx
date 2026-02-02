import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useExpenseCategories, useIncomeCategories, useCategoriesWithHierarchy, useDeleteCategory, Category, CategoryWithChildren } from '@/hooks/useCategories';
import { useBudgetsWithSpending, useBulkUpsertBudgets, useTotalBudgetSummary } from '@/hooks/useBudgets';
import { ChevronLeft, ChevronRight, Save, AlertTriangle, DollarSign, Wallet, TrendingUp, PiggyBank, Check, Plus, Settings2, Edit2, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TransactionListDialog } from './TransactionListDialog';
import { CategoryBudgetDetailSheet } from './CategoryBudgetDetailSheet';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function BudgetCategoriesManager() {
  const now = new Date();
  const isMobile = useIsMobile();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [actualIncomeInputs, setActualIncomeInputs] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expensesOpen, setExpensesOpen] = useState(true);
  const [isManageMode, setIsManageMode] = useState(false);
  
  // Transaction dialog state
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState<string | null>(null);

  // Category detail sheet state
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [detailCategory, setDetailCategory] = useState<CategoryWithChildren | null>(null);

  // Category form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formInitialData, setFormInitialData] = useState<{
    name?: string;
    icon?: string;
    parent_id?: string;
    type?: 'expense' | 'income';
  }>({});

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

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
  const { data: hierarchyData } = useCategoriesWithHierarchy();
  const { data: budgetsWithSpending, isLoading: budgetsLoading } = useBudgetsWithSpending(month, year);
  const { data: summary } = useTotalBudgetSummary(month, year);
  const bulkUpsert = useBulkUpsertBudgets();
  const deleteCategory = useDeleteCategory();

  const allCategories = [...(expenseCategories || []), ...(incomeCategories || [])];
  const topLevelCategories = allCategories.filter(c => !c.parent_id);

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

  const handleOpenCreate = (parentId?: string, type: 'expense' | 'income' = 'expense') => {
    setEditingCategory(null);
    const defaultIcon = type === 'income' ? '💰' : '📦';
    setFormInitialData({ name: '', icon: defaultIcon, parent_id: parentId || '', type });
    setShowFormDialog(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormInitialData({});
    setShowFormDialog(true);
  };

  const handleCategoryRowClick = (category: Category) => {
    if (isManageMode) return;
    
    // Find hierarchical data for this category
    const withChildren = hierarchyData?.find(c => c.id === category.id);
    if (withChildren) {
      setDetailCategory(withChildren);
      setShowDetailSheet(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteCategory.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
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
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-between">
        <div /> {/* Spacer for centering month nav */}
        <Button
          variant={isManageMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsManageMode(!isManageMode)}
          className={cn(
            "gap-2 h-10",
            isManageMode && "bg-primary"
          )}
        >
          <Settings2 className="h-4 w-4" />
          {isManageMode ? 'Done' : 'Manage'}
          {isManageMode && (
            <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5">
              ON
            </Badge>
          )}
        </Button>
      </div>

      {/* Month Navigation - Compact (hidden in manage mode) */}
      {!isManageMode && (
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
      )}

      {/* Manage Mode Indicator */}
      {isManageMode && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Manage Mode:</strong> Tap edit or delete icons to modify categories. Tap "Done" when finished.
        </div>
      )}

      {/* Summary Cards - Mobile Grid (hidden in manage mode) */}
      {!isManageMode && (
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
      )}

      {/* Spent Summary - Clickable (hidden in manage mode) */}
      {!isManageMode && summary && (
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
                      <div 
                        key={category.id} 
                        className={cn(
                          "p-3 rounded-lg bg-muted/30 space-y-3 min-h-[52px]",
                          !isManageMode && "cursor-pointer hover:bg-muted/50 transition-colors"
                        )}
                        onClick={() => handleCategoryRowClick(category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <Label className="font-medium text-sm">{category.name}</Label>
                          </div>
                          {isManageMode && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(category);
                                }}
                              >
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              {!category.is_system && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(category);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {!isManageMode && (
                          <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Add Income Category Button */}
              {isManageMode && (
                <Button
                  variant="outline"
                  className="w-full mt-3 h-12"
                  onClick={() => handleOpenCreate(undefined, 'income')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Income Category
                </Button>
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
                        className={cn(
                          "p-3 rounded-lg bg-muted/30 space-y-2 min-h-[52px]",
                          !isManageMode && "cursor-pointer hover:bg-muted/50 transition-colors"
                        )}
                        onClick={() => handleCategoryRowClick(category)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <Label className="font-medium text-sm">{category.name}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOverBudget && budgetAmount > 0 && !isManageMode && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            {isManageMode && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(category);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                {!category.is_system && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm(category);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!isManageMode && (
                          <>
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
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Expense Category Button */}
              {isManageMode && (
                <Button
                  variant="outline"
                  className="w-full mt-3 h-12"
                  onClick={() => handleOpenCreate(undefined, 'expense')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense Category
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Floating Save Button */}
      {isDirty && !isManageMode && (
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

      {/* Category Detail Sheet */}
      <CategoryBudgetDetailSheet
        category={detailCategory}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        budgetAmount={detailCategory ? parseFloat(budgetInputs[detailCategory.id] || '0') || 0 : 0}
        spentAmount={detailCategory ? budgetsWithSpending?.find(b => b.category_id === detailCategory.id)?.spent || 0 : 0}
        month={month}
        year={year}
        onBudgetChange={(amount) => {
          if (detailCategory) {
            handleInputChange(detailCategory.id, amount.toString());
          }
        }}
        onEditCategory={handleOpenEdit}
        onAddSubcategory={handleOpenCreate}
        onDeleteCategory={(cat) => {
          setShowDetailSheet(false);
          setDeleteConfirm(cat);
        }}
      />

      {/* Create/Edit Dialog */}
      <CategoryFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        editingCategory={editingCategory}
        initialData={formInitialData}
        topLevelCategories={topLevelCategories}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? 
              {deleteConfirm && hierarchyData?.find(c => c.id === deleteConfirm.id)?.children.length 
                ? ' This will also delete all subcategories.'
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}