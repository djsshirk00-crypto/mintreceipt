import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpendingStats, CategorySpending } from '@/hooks/useSpendingStats';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';

interface CategoryItemProps {
  category: CategorySpending;
  total: number;
  onClick: () => void;
}

function CategoryItem({ category, total, onClick }: CategoryItemProps) {
  const percentage = total > 0 ? (category.amount / total) * 100 : 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 w-full text-left',
        'rounded-lg hover:bg-muted/50 active:scale-[0.99] transition-all',
        'min-h-[52px] cursor-pointer'
      )}
    >
      <span className="text-xl flex-shrink-0">{category.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{category.categoryName}</p>
        <p className="text-xs text-muted-foreground">{percentage.toFixed(0)}% of total</p>
      </div>
      <div className="text-right flex items-center gap-2">
        <span className="font-semibold text-foreground">${category.amount.toFixed(0)}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function CategoryBreakdownList() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { data: spendingStats, isLoading } = useSpendingStats('this-month');
  
  const handleCategoryClick = useCallback((category: CategorySpending) => {
    const now = new Date();
    const params = new URLSearchParams();
    params.set('from', format(startOfMonth(now), 'yyyy-MM-dd'));
    params.set('to', format(endOfMonth(now), 'yyyy-MM-dd'));
    
    navigate(`/category/${category.categoryName.toLowerCase()}?${params.toString()}`);
  }, [navigate]);

  // Filter categories with spending
  const categoriesWithSpending = spendingStats?.categories.filter(c => c.amount > 0) || [];
  const topCategories = categoriesWithSpending.slice(0, 3);
  const remainingCategories = categoriesWithSpending.slice(3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Card>
          <CardContent className="p-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (categoriesWithSpending.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Spending by Category
        </h3>
        <Link 
          to="/reports" 
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View Reports
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Categories List */}
      <Card>
        <CardContent className="p-2">
          {/* Always show top 3 */}
          {topCategories.map(category => (
            <CategoryItem
              key={category.categoryId}
              category={category}
              total={spendingStats?.total || 0}
              onClick={() => handleCategoryClick(category)}
            />
          ))}

          {/* Collapsible for remaining categories */}
          {remainingCategories.length > 0 && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger className={cn(
                'flex items-center gap-2 w-full p-3',
                'text-sm text-muted-foreground hover:text-foreground',
                'rounded-lg hover:bg-muted/50 transition-colors'
              )}>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>{isOpen ? 'Show less' : `+${remainingCategories.length} more categories`}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {remainingCategories.map(category => (
                  <CategoryItem
                    key={category.categoryId}
                    category={category}
                    total={spendingStats?.total || 0}
                    onClick={() => handleCategoryClick(category)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
