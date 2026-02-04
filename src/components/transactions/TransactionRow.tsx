import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Split } from 'lucide-react';
import { Receipt } from '@/hooks/useReceipts';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CategorySplit {
  name: string;
  icon: string;
  amount: number;
}

interface TransactionRowProps {
  receipt: Receipt;
  onEdit: (receipt: Receipt) => void;
}

// Get all category splits with non-zero amounts
function getCategorySplits(receipt: Receipt): CategorySplit[] {
  const splits: CategorySplit[] = [];
  
  if (receipt.groceries_amount > 0) {
    splits.push({ name: 'Groceries', icon: '🥬', amount: receipt.groceries_amount });
  }
  if (receipt.household_amount > 0) {
    splits.push({ name: 'Household', icon: '🏠', amount: receipt.household_amount });
  }
  if (receipt.clothing_amount > 0) {
    splits.push({ name: 'Clothing', icon: '👕', amount: receipt.clothing_amount });
  }
  if (receipt.other_amount > 0) {
    splits.push({ name: 'Other', icon: '📦', amount: receipt.other_amount });
  }
  
  return splits.sort((a, b) => b.amount - a.amount);
}

export function TransactionRow({ receipt, onEdit }: TransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const splits = getCategorySplits(receipt);
  const hasSplits = splits.length > 1;
  const primaryCategory = splits[0] || { name: 'Other', icon: '📦', amount: 0 };
  
  const handleClick = (e: React.MouseEvent) => {
    // If clicking the expand button area, don't open edit
    if ((e.target as HTMLElement).closest('[data-expand-trigger]')) {
      return;
    }
    onEdit(receipt);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card 
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.99]",
          isExpanded && "ring-1 ring-primary/20"
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Expand trigger for split transactions */}
            {hasSplits ? (
              <CollapsibleTrigger asChild>
                <button 
                  data-expand-trigger
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg flex-shrink-0 hover:bg-muted/80 transition-colors"
                  onClick={handleExpandClick}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <span className="relative">
                      {primaryCategory.icon}
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {splits.length}
                      </span>
                    </span>
                  )}
                </button>
              </CollapsibleTrigger>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg flex-shrink-0">
                {primaryCategory.icon}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {receipt.merchant || 'Unknown Merchant'}
                </p>
                {hasSplits && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 shrink-0">
                    <Split className="h-2.5 w-2.5" />
                    Split
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {receipt.receipt_date 
                  ? format(parseISO(receipt.receipt_date), 'MMM d, yyyy')
                  : format(parseISO(receipt.created_at), 'MMM d, yyyy')
                }
              </p>
            </div>
            
            <div className="text-right flex-shrink-0">
              <p className="font-semibold">
                ${Number(receipt.total_amount || 0).toFixed(2)}
              </p>
              {!hasSplits && (
                <p className="text-xs text-muted-foreground">
                  {primaryCategory.name}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Expanded split details */}
      <CollapsibleContent>
        <div className="ml-8 mt-1 space-y-1 pb-2">
          {splits.map((split, index) => (
            <div 
              key={split.name}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/30",
                "border-l-2 border-muted-foreground/20"
              )}
            >
              <span className="text-sm">{split.icon}</span>
              <span className="flex-1 text-sm text-muted-foreground">
                {split.name}
              </span>
              <span className="text-sm font-medium">
                ${split.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
