import { Category, CATEGORY_CONFIG, CategoryTotals } from '@/types/receipt';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CategorySummaryCardProps {
  category: Category;
  amount: number;
  totalAmount: number;
  onClick?: () => void;
}

export function CategorySummaryCard({ 
  category, 
  amount, 
  totalAmount,
  onClick 
}: CategorySummaryCardProps) {
  const config = CATEGORY_CONFIG[category];
  const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-medium',
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full text-xl',
            `category-${category}`
          )}>
            {config.icon}
          </div>
          <span className="font-medium text-foreground">{config.label}</span>
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-bold text-foreground">
            ${amount.toFixed(2)}
          </p>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn('h-full rounded-full transition-all', `bg-${category}`)}
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

interface CategorySummaryGridProps {
  totals: CategoryTotals;
}

export function CategorySummaryGrid({ totals }: CategorySummaryGridProps) {
  const categories: Category[] = ['groceries', 'household', 'clothing', 'other'];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map(category => (
        <CategorySummaryCard
          key={category}
          category={category}
          amount={totals[category]}
          totalAmount={totals.total}
        />
      ))}
    </div>
  );
}
