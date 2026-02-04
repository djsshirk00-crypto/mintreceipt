import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CategoryLineItem } from '@/hooks/useCategoryLineItems';

interface CategoryLineItemRowProps {
  item: CategoryLineItem;
  onClick: () => void;
}

export function CategoryLineItemRow({ item, onClick }: CategoryLineItemRowProps) {
  const formattedDate = item.receiptDate
    ? format(parseISO(item.receiptDate), 'MMM d')
    : 'Unknown';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 w-full text-left',
        'rounded-lg hover:bg-muted/50 active:scale-[0.99] transition-all',
        'min-h-[52px] cursor-pointer border-b border-border last:border-0'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-foreground truncate">{item.merchant}</p>
          {item.parentHasMultipleItems && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
              Split
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="font-semibold text-foreground">${item.amount.toFixed(2)}</span>
      </div>
    </button>
  );
}
