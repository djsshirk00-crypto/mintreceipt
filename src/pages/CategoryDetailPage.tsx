import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { parseISO, format, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCategoryLineItems } from '@/hooks/useCategoryLineItems';
import { CategoryLineItemRow } from '@/components/category/CategoryLineItemRow';
import { TransactionEditSheet } from '@/components/transactions/TransactionEditSheet';
import { useReceipts } from '@/hooks/useReceipts';

export default function CategoryDetailPage() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Parse date range from URL params
  const dateRange = useMemo(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (fromParam && toParam) {
      return {
        start: parseISO(fromParam),
        end: parseISO(toParam),
      };
    }
    
    // Default to current month
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  }, [searchParams]);

  const { data, isLoading, error } = useCategoryLineItems(
    categoryName,
    dateRange.start,
    dateRange.end
  );

  // Fetch receipts to pass to edit sheet
  const { data: receipts } = useReceipts();
  const selectedReceipt = useMemo(() => {
    if (!selectedReceiptId || !receipts) return null;
    return receipts.find(r => r.id === selectedReceiptId) || null;
  }, [selectedReceiptId, receipts]);

  // Format category name for display
  const displayCategoryName = categoryName
    ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
    : 'Category';

  // Format date range for display
  const dateRangeLabel = useMemo(() => {
    return format(dateRange.start, 'MMMM yyyy');
  }, [dateRange.start]);

  // Check for total mismatch (dev warning)
  const hasMismatch = data && Math.abs(data.expectedTotal - data.lineItemsTotal) > 0.01;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">
              {displayCategoryName}
            </h1>
            <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2 pt-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load category data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Data loaded */}
        {data && (
          <>
            {/* Summary Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Category Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${data.expectedTotal.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data.lineItems.length} item{data.lineItems.length !== 1 ? 's' : ''} from {data.uniqueReceiptCount} transaction{data.uniqueReceiptCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Dev warning for mismatch */}
                {hasMismatch && (
                  <Alert className="mt-3" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Category total mismatch: Expected ${data.expectedTotal.toFixed(2)}, 
                      Line items sum ${data.lineItemsTotal.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Line Items List */}
            {data.lineItems.length > 0 ? (
              <Card>
                <CardContent className="p-2">
                  {data.lineItems.map(item => (
                    <CategoryLineItemRow
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedReceiptId(item.receiptId)}
                    />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No spending in this category for the selected period.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Transaction Edit Sheet */}
      <TransactionEditSheet
        receipt={selectedReceipt}
        open={!!selectedReceiptId}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptId(null);
        }}
      />
    </AppLayout>
  );
}
