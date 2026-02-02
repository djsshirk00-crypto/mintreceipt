import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CategorySpending } from '@/hooks/useSpendingStats';
import { ChevronRight } from 'lucide-react';

interface DynamicCategorySummaryCardProps {
  category: CategorySpending;
  totalAmount: number;
  onClick?: () => void;
}

export const DynamicCategorySummaryCard = React.forwardRef<HTMLDivElement, DynamicCategorySummaryCardProps>(
  function DynamicCategorySummaryCard({ category, totalAmount, onClick }, ref) {
    const percentage = totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0;

    return (
      <Card 
        ref={ref}
        className={cn(
          'transition-all duration-200 hover:shadow-medium min-h-[52px]',
          onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
        )}
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl">
              {category.icon}
            </div>
            <span className="font-medium text-foreground truncate flex-1">{category.categoryName}</span>
            {onClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-2xl font-bold text-foreground">
              ${category.amount.toFixed(2)}
            </p>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all bg-primary"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
DynamicCategorySummaryCard.displayName = 'DynamicCategorySummaryCard';

interface DynamicCategorySummaryGridProps {
  categories: CategorySpending[];
  total: number;
  onCategoryClick?: (category: CategorySpending) => void;
}

export const DynamicCategorySummaryGrid = React.forwardRef<HTMLDivElement, DynamicCategorySummaryGridProps>(
  function DynamicCategorySummaryGrid({ categories, total, onCategoryClick }, ref) {
    // Filter out categories with 0 amount for cleaner display, but always show at least empty state
    const nonZeroCategories = categories.filter(c => c.amount > 0);
    const displayCategories = nonZeroCategories.length > 0 ? nonZeroCategories : categories.slice(0, 4);

    return (
      <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {displayCategories.map(category => (
          <DynamicCategorySummaryCard
            key={category.categoryId}
            category={category}
            totalAmount={total}
            onClick={onCategoryClick ? () => onCategoryClick(category) : undefined}
          />
        ))}
      </div>
    );
  }
);
DynamicCategorySummaryGrid.displayName = 'DynamicCategorySummaryGrid';
