import { useReceipts, useProcessReceipt } from '@/hooks/useReceipts';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReceiptUploader } from '@/components/receipt/ReceiptUploader';
import { ReceiptCard } from '@/components/receipt/ReceiptCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Inbox as InboxIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export default function InboxPage() {
  const { data: receipts, isLoading } = useReceipts();
  const processReceipt = useProcessReceipt();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const inboxReceipts = receipts?.filter(r => r.status === 'inbox' || r.status === 'processing') || [];

  const handleProcess = async (receiptId: string) => {
    setProcessingIds(prev => new Set(prev).add(receiptId));
    try {
      await processReceipt.mutateAsync(receiptId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(receiptId);
        return next;
      });
    }
  };

  const handleProcessAll = async () => {
    for (const receipt of inboxReceipts.filter(r => r.status === 'inbox')) {
      await handleProcess(receipt.id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receipt Inbox</h1>
            <p className="text-muted-foreground mt-1">
              Receipts waiting to be processed and categorized.
            </p>
          </div>

          {inboxReceipts.length > 0 && (
            <Button 
              onClick={handleProcessAll}
              disabled={processingIds.size > 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${processingIds.size > 0 ? 'animate-spin' : ''}`} />
              Process All ({inboxReceipts.filter(r => r.status === 'inbox').length})
            </Button>
          )}
        </div>

        {/* Compact uploader */}
        <ReceiptUploader compact />

        {/* Receipt list */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : inboxReceipts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {inboxReceipts.map(receipt => (
              <div key={receipt.id} className="relative">
                <ReceiptCard receipt={receipt} />
                {receipt.status === 'inbox' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-4 right-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProcess(receipt.id);
                    }}
                    disabled={processingIds.has(receipt.id)}
                  >
                    {processingIds.has(receipt.id) ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </>
                    ) : (
                      'Process'
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <InboxIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Inbox is empty
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                All your receipts have been processed! Upload a new receipt to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
