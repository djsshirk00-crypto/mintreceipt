import { Category, CATEGORY_CONFIG } from '@/types/receipt';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: Category;
  amount?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function CategoryBadge({ 
  category, 
  amount, 
  size = 'md',
  showIcon = true 
}: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      `category-${category}`,
      sizeClasses[size]
    )}>
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
      {amount !== undefined && (
        <span className="font-semibold">
          ${amount.toFixed(2)}
        </span>
      )}
    </span>
  );
}
