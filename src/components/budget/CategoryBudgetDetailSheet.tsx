import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Plus, Edit2, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category, CategoryWithChildren } from '@/hooks/useCategories';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface CategoryBudgetDetailSheetProps {
  category: CategoryWithChildren | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetAmount: number;
  spentAmount: number;
  month: number;
  year: number;
  onBudgetChange: (amount: number) => void;
  onEditCategory: (category: Category) => void;
  onAddSubcategory: (parentId: string, type: 'expense' | 'income') => void;
  onDeleteCategory: (category: Category) => void;
}

export function CategoryBudgetDetailSheet({
  category,
  open,
  onOpenChange,
  budgetAmount,
  spentAmount,
  month,
  year,
  onBudgetChange,
  onEditCategory,
  onAddSubcategory,
  onDeleteCategory,
}: CategoryBudgetDetailSheetProps) {
  const navigate = useNavigate();
  const [localBudget, setLocalBudget] = useState(budgetAmount.toString());

  // Sync local state when category changes
  if (open && budgetAmount.toString() !== localBudget && localBudget === '') {
    setLocalBudget(budgetAmount.toString());
  }

  if (!category) return null;

  const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
  const isOverBudget = percentage > 100;
  const remaining = budgetAmount - spentAmount;

  const handleBudgetBlur = () => {
    const value = parseFloat(localBudget) || 0;
    onBudgetChange(value);
  };

  const handleViewTransactions = () => {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    const params = new URLSearchParams();
    params.set('category', category.name.toLowerCase());
    params.set('from', format(startDate, 'yyyy-MM-dd'));
    params.set('to', format(endDate, 'yyyy-MM-dd'));
    
    onOpenChange(false);
    navigate(`/transactions?${params.toString()}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                {category.icon}
              </div>
              <SheetTitle className="text-xl">{category.name}</SheetTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  onOpenChange(false);
                  onEditCategory(category);
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Category
                </DropdownMenuItem>
                {!category.is_system && (
                  <DropdownMenuItem 
                    onClick={() => {
                      onOpenChange(false);
                      onDeleteCategory(category);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Category
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Monthly Budget Input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Monthly Budget
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={localBudget}
                onChange={(e) => setLocalBudget(e.target.value)}
                onBlur={handleBudgetBlur}
                placeholder="0"
                className="pl-7 h-12 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Spending Progress */}
          {budgetAmount > 0 && (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Spending
              </Label>
              <div className="space-y-2">
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={cn(
                    "h-3",
                    isOverBudget && "[&>div]:bg-destructive"
                  )}
                />
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    ${spentAmount.toFixed(2)} of ${budgetAmount.toFixed(2)}
                  </span>
                  <span className={cn(
                    "font-medium",
                    isOverBudget ? "text-destructive" : "text-emerald-600"
                  )}>
                    {isOverBudget 
                      ? `$${Math.abs(remaining).toFixed(2)} over`
                      : `$${remaining.toFixed(2)} left`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subcategories */}
          {category.children && category.children.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Subcategories
                </Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  {category.children.map((sub) => (
                    <div 
                      key={sub.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sub.icon}</span>
                        <span className="font-medium">{sub.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Add Subcategory Button */}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => {
              onOpenChange(false);
              onAddSubcategory(category.id, category.type as 'expense' | 'income');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subcategory
          </Button>

          <Separator />

          {/* View Transactions Button */}
          <Button
            variant="secondary"
            className="w-full h-12"
            onClick={handleViewTransactions}
          >
            View Transactions
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}