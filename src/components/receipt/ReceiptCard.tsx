import { Receipt } from '@/hooks/useReceipts';
import { Category, CATEGORY_CONFIG } from '@/types/receipt';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReceiptCardProps {
  receipt: Receipt;
  onClick?: () => void;
  selected?: boolean;
}

export function ReceiptCard({ receipt, onClick, selected }: ReceiptCardProps) {
  const categories: Category[] = ['groceries', 'household', 'clothing', 'other'];
  
  const categorySplits = categories
    .map(cat => ({
      category: cat,
      amount: receipt[`${cat}_amount` as keyof Receipt] as number || 0,
    }))
    .filter(s => s.amount > 0);

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-medium animate-fade-in',
        selected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Receipt thumbnail */}
          {receipt.image_url && (
            <div className="shrink-0 w-16 h-20 rounded-md overflow-hidden bg-muted">
              <img 
                src={receipt.image_url} 
                alt="Receipt"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {receipt.merchant || 'Unknown Merchant'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {receipt.receipt_date 
                    ? format(new Date(receipt.receipt_date), 'MMM d, yyyy')
                    : format(new Date(receipt.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <StatusBadge status={receipt.status} size="sm" />
            </div>

            {/* Category splits */}
            {categorySplits.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categorySplits.map(({ category, amount }) => {
                  const config = CATEGORY_CONFIG[category];
                  return (
                    <span 
                      key={category}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        `category-${category}`
                      )}
                    >
                      <span>{config.icon}</span>
                      <span>${amount.toFixed(2)}</span>
                    </span>
                  );
                })}
              </div>
            ) : receipt.status === 'inbox' || receipt.status === 'processing' ? (
              <p className="text-sm text-muted-foreground italic mb-2">
                Awaiting categorization...
              </p>
            ) : null}

            {/* Total */}
            {receipt.total_amount && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">
                  ${Number(receipt.total_amount).toFixed(2)}
                </span>
              </div>
            )}

            {/* Confidence indicator */}
            {receipt.confidence_score && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${receipt.confidence_score * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(receipt.confidence_score * 100)}% confident
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
