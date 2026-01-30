import { useReceipts } from '@/hooks/useReceipts';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReceiptCard } from '@/components/receipt/ReceiptCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ReviewedReceiptsPage() {
  const { data: receipts, isLoading } = useReceipts('reviewed');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reviewed Receipts</h1>
            <p className="text-muted-foreground mt-1">
              All your reviewed receipts. Hover over a receipt to delete it.
            </p>
          </div>
        </div>

        {/* Stats */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? <Skeleton className="h-8 w-12" /> : receipts?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Reviewed</p>
            </div>
          </CardContent>
        </Card>

        {/* Receipt List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : receipts && receipts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {receipts.map(receipt => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No reviewed receipts yet. Process and review receipts to see them here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
