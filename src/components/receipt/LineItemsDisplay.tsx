import { LineItem, CATEGORY_CONFIG, Category } from '@/types/receipt';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category as DbCategory } from '@/hooks/useCategories';

interface LineItemsDisplayProps {
  lineItems: LineItem[] | null;
  className?: string;
  editable?: boolean;
  onItemCategoryChange?: (index: number, newCategory: string) => void;
  categories?: DbCategory[];
}

// Fallback legacy categories
const legacyCategories: Category[] = ['groceries', 'household', 'clothing', 'other'];

export function LineItemsDisplay({ 
  lineItems, 
  className,
  editable = false,
  onItemCategoryChange,
  categories,
}: LineItemsDisplayProps) {
  if (!lineItems || lineItems.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No line items available for this receipt.
      </div>
    );
  }

  // Get category display info - check dynamic categories first, then fall back to legacy
  const getCategoryInfo = (categoryId: string) => {
    // Check dynamic categories from database
    if (categories) {
      const dbCat = categories.find(c => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase());
      if (dbCat) {
        return { icon: dbCat.icon, label: dbCat.name };
      }
    }
    // Fall back to legacy config
    const legacyConfig = CATEGORY_CONFIG[categoryId as Category];
    if (legacyConfig) {
      return { icon: legacyConfig.icon, label: legacyConfig.label };
    }
    // Default fallback
    return { icon: '📦', label: categoryId };
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-2">
        {lineItems.map((item, index) => {
          const info = getCategoryInfo(item.category);
          
          return (
            <div 
              key={index}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base">{info.icon}</span>
                <span className="truncate flex-1">{item.description}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editable && onItemCategoryChange ? (
                  <Select
                    value={item.category}
                    onValueChange={(value) => onItemCategoryChange(index, value)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show dynamic categories if available */}
                      {categories && categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name.toLowerCase()}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </span>
                          </SelectItem>
                        ))
                      ) : (
                        /* Fall back to legacy categories */
                        legacyCategories.map((cat) => {
                          const catConfig = CATEGORY_CONFIG[cat];
                          return (
                            <SelectItem key={cat} value={cat}>
                              <span className="flex items-center gap-2">
                                <span>{catConfig.icon}</span>
                                <span>{catConfig.label}</span>
                              </span>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                    {info.label}
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
