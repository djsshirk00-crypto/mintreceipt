import { LineItem, CATEGORY_CONFIG, Category } from '@/types/receipt';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LineItemsDisplayProps {
  lineItems: LineItem[] | null;
  className?: string;
  editable?: boolean;
  onItemCategoryChange?: (index: number, newCategory: Category) => void;
}

const categories: Category[] = ['groceries', 'household', 'clothing', 'other'];

export function LineItemsDisplay({ 
  lineItems, 
  className,
  editable = false,
  onItemCategoryChange,
}: LineItemsDisplayProps) {
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
                {editable && onItemCategoryChange ? (
                  <Select
                    value={item.category}
                    onValueChange={(value) => onItemCategoryChange(index, value as Category)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => {
                        const catConfig = CATEGORY_CONFIG[cat];
                        return (
                          <SelectItem key={cat} value={cat}>
                            <span className="flex items-center gap-2">
                              <span>{catConfig.icon}</span>
                              <span>{catConfig.label}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                    {config.label}
                  </span>
                )}
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
