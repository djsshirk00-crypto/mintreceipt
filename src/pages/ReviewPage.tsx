import { useState } from 'react';
import { useReceipts, useReviewReceipt, Receipt } from '@/hooks/useReceipts';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReceiptCard } from '@/components/receipt/ReceiptCard';
import { CategorySummaryGrid } from '@/components/receipt/CategorySummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Edit2, CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Category, CATEGORY_CONFIG, CategoryTotals } from '@/types/receipt';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ReviewPage() {
  const { data: receipts, isLoading } = useReceipts();
  const reviewReceipt = useReviewReceipt();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustments, setAdjustments] = useState({
    groceries_amount: 0,
    household_amount: 0,
    clothing_amount: 0,
    other_amount: 0,
  });

  const processedReceipts = receipts?.filter(r => r.status === 'processed') || [];
  const reviewedReceipts = receipts?.filter(r => r.status === 'reviewed') || [];

  // Calculate totals for reviewed receipts
  const reviewedTotals: CategoryTotals = reviewedReceipts.reduce((acc, r) => ({
    groceries: acc.groceries + r.groceries_amount,
    household: acc.household + r.household_amount,
    clothing: acc.clothing + r.clothing_amount,
    other: acc.other + r.other_amount,
    total: acc.total + (Number(r.total_amount) || 0),
  }), { groceries: 0, household: 0, clothing: 0, other: 0, total: 0 });

  const handleSelectReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setAdjustMode(false);
    setAdjustments({
      groceries_amount: receipt.groceries_amount,
      household_amount: receipt.household_amount,
      clothing_amount: receipt.clothing_amount,
      other_amount: receipt.other_amount,
    });
  };

  const handleAccept = async () => {
    if (!selectedReceipt) return;
    await reviewReceipt.mutateAsync({
      id: selectedReceipt.id,
      action: 'accept',
    });
    setSelectedReceipt(null);
  };

  const handleAdjust = async () => {
    if (!selectedReceipt) return;
    await reviewReceipt.mutateAsync({
      id: selectedReceipt.id,
      action: 'adjust',
      adjustments,
    });
    setSelectedReceipt(null);
    setAdjustMode(false);
  };

  const categories: Category[] = ['groceries', 'household', 'clothing', 'other'];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weekly Review</h1>
          <p className="text-muted-foreground mt-1">
            Review and finalize your categorized receipts.
          </p>
        </div>

        {/* Summary for reviewed */}
        {reviewedTotals.total > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              This Week's Spending
            </h2>
            <CategorySummaryGrid totals={reviewedTotals} />
          </section>
        )}

        {/* Pending review */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Ready for Review ({processedReceipts.length})
          </h2>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : processedReceipts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {processedReceipts.map(receipt => (
                <ReceiptCard 
                  key={receipt.id} 
                  receipt={receipt}
                  onClick={() => handleSelectReceipt(receipt)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <CheckSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  All caught up!
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  No receipts pending review. Upload more receipts to continue tracking your spending.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Review Dialog */}
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Receipt</DialogTitle>
            </DialogHeader>

            {selectedReceipt && (
              <div className="space-y-6">
                {/* Receipt info */}
                <div className="flex gap-4">
                  {selectedReceipt.image_url && (
                    <div className="shrink-0 w-24 h-32 rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={selectedReceipt.image_url} 
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedReceipt.merchant || 'Unknown Merchant'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedReceipt.receipt_date 
                        ? format(new Date(selectedReceipt.receipt_date), 'MMMM d, yyyy')
                        : format(new Date(selectedReceipt.created_at), 'MMMM d, yyyy')}
                    </p>
                    <p className="text-2xl font-bold mt-2">
                      ${Number(selectedReceipt.total_amount || 0).toFixed(2)}
                    </p>
                    {selectedReceipt.confidence_score && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {Math.round(selectedReceipt.confidence_score * 100)}% confidence
                      </p>
                    )}
                  </div>
                </div>

                {/* Category splits */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Category Breakdown</Label>
                    {!adjustMode && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setAdjustMode(true)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Adjust
                      </Button>
                    )}
                  </div>

                  {categories.map(category => {
                    const config = CATEGORY_CONFIG[category];
                    const key = `${category}_amount` as keyof typeof adjustments;
                    const value = adjustMode ? adjustments[key] : selectedReceipt[`${category}_amount` as keyof Receipt] as number;

                    return (
                      <div key={category} className="flex items-center gap-3">
                        <span className="text-xl">{config.icon}</span>
                        <span className="flex-1 font-medium">{config.label}</span>
                        {adjustMode ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-28"
                            value={value}
                            onChange={(e) => setAdjustments(prev => ({
                              ...prev,
                              [key]: parseFloat(e.target.value) || 0,
                            }))}
                          />
                        ) : (
                          <span className="font-semibold">${value.toFixed(2)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {adjustMode ? (
                <>
                  <Button variant="outline" onClick={() => setAdjustMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdjust}>
                    <Check className="h-4 w-4 mr-2" />
                    Save Adjustments
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                    <X className="h-4 w-4 mr-2" />
                    Skip
                  </Button>
                  <Button onClick={handleAccept}>
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
