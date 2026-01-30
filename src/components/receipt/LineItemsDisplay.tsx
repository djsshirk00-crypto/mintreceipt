import { LineItem, CATEGORY_CONFIG, Category } from '@/types/receipt';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LineItemsDisplayProps {
  lineItems: LineItem[] | null;
  className?: string;
}

export function LineItemsDisplay({ lineItems, className }: LineItemsDisplayProps) {
  if (!lineItems || lineItems.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No line items available for this receipt.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-2">
        {lineItems.map((item, index) => {
          const config = CATEGORY_CONFIG[item.category as Category] || CATEGORY_CONFIG.other;
          
          return (
            <div 
              key={index}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base">{config.icon}</span>
                <span className="truncate flex-1">{item.description}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                >
                  {config.label}
                </Badge>
                <span className="font-medium w-16 text-right">
                  ${item.amount.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
