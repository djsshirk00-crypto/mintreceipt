import { useState } from 'react';
import { Receipt, useDeleteReceipt } from '@/hooks/useReceipts';
import { Category, CATEGORY_CONFIG } from '@/types/receipt';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReceiptCardProps {
  receipt: Receipt;
  onClick?: () => void;
  selected?: boolean;
}

export function ReceiptCard({ receipt, onClick, selected }: ReceiptCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { signedUrl, loading: imageLoading } = useSignedUrl(receipt.image_path);
  const deleteReceipt = useDeleteReceipt();
  
  const categories: Category[] = ['groceries', 'household', 'clothing', 'other'];
  
  const categorySplits = categories
    .map(cat => ({
      category: cat,
      amount: receipt[`${cat}_amount` as keyof Receipt] as number || 0,
    }))
    .filter(s => s.amount > 0);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteReceipt.mutate({ id: receipt.id, image_path: receipt.image_path });
    setDeleteDialogOpen(false);
  };

  const merchantName = receipt.merchant || 'Unknown Merchant';
  const receiptDate = receipt.receipt_date 
    ? format(new Date(receipt.receipt_date), 'MMM d, yyyy')
    : format(new Date(receipt.created_at), 'MMM d, yyyy');

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-medium animate-fade-in relative group',
        selected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Delete button */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium text-foreground">{merchantName}</span>
                <span className="text-muted-foreground"> — {receiptDate}</span>
                <br /><br />
                This action cannot be undone. The receipt and its image will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-4">
          {/* Receipt thumbnail */}
          {receipt.image_path && (
            <div className="shrink-0 w-16 h-20 rounded-md overflow-hidden bg-muted">
              {imageLoading ? (
                <Skeleton className="w-full h-full" />
              ) : signedUrl ? (
                <img 
                  src={signedUrl} 
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {merchantName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {receiptDate}
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
