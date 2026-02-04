import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useReceiptStats } from '@/hooks/useReceipts';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PendingReviewAlert() {
  const { data: stats, isLoading } = useReceiptStats();
  
  const processingCount = stats?.statusCounts.processing || 0;
  const processedCount = stats?.statusCounts.processed || 0;
  const pendingCount = processingCount + processedCount;
  
  // Don't render if no pending items
  if (!isLoading && pendingCount === 0) {
    return null;
  }
  
  const isProcessing = processingCount > 0;

  return (
    <Link to="/review" className="block">
      <Card className={cn(
        'border-warning/50 bg-warning/5 hover:bg-warning/10',
        'active:scale-[0.99] transition-all cursor-pointer'
      )}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning flex-shrink-0">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">
              {isProcessing 
                ? `${processingCount} receipt${processingCount > 1 ? 's' : ''} processing...`
                : `${pendingCount} receipt${pendingCount > 1 ? 's' : ''} ready for review`
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {isProcessing ? 'Please wait' : 'Tap to review'}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
