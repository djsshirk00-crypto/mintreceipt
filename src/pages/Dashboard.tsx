import { useReceipts, useReceiptStats } from '@/hooks/useReceipts';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReceiptUploader } from '@/components/receipt/ReceiptUploader';
import { MobileCameraCapture } from '@/components/receipt/MobileCameraCapture';
import { ReceiptCard } from '@/components/receipt/ReceiptCard';
import { SpendingReports } from '@/components/receipt/SpendingReports';
import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useReceiptStats();
  const { data: recentReceipts, isLoading: receiptsLoading } = useReceipts();
  const isMobile = useIsMobile();

  const processingCount = stats?.statusCounts.processing || 0;
  const processedCount = stats?.statusCounts.processed || 0;
  const failedCount = stats?.statusCounts.failed || 0;
  const pendingReviewCount = processingCount + processedCount;

  return (
    <AppLayout>
      <div className="space-y-8 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Drop your receipts and we'll handle the rest.
            </p>
          </div>
        </div>

        {/* Upload zone - mobile camera capture or desktop dropzone */}
        {/* data-tour attribute for onboarding highlight */}
        <div data-tour="upload-zone">
          {isMobile ? (
            <MobileCameraCapture />
          ) : (
            <ReceiptUploader />
          )}
        </div>

        {/* Status cards - data-tour for onboarding */}
        <div data-tour="status-cards" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/review">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 text-warning">
                  {processingCount > 0 ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <CheckSquare className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : pendingReviewCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {processingCount > 0 ? 'Processing...' : 'Ready for Review'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/transactions">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.statusCounts.reviewed || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-medium transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : failedCount}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spending Reports with dynamic categories - data-tour for onboarding */}
        <div data-tour="spending-reports">
          <SpendingReports />
        </div>

        {/* Recent receipts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Recent Receipts
            </h2>
            <Link 
              to="/transactions" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {receiptsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : recentReceipts && recentReceipts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {recentReceipts.slice(0, 4).map(receipt => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No receipts yet. Upload your first receipt to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
