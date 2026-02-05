import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useReceipts, useReviewReceipt, useDeleteReceipt, useProcessReceipt, useProcessingTimeout, Receipt } from '@/hooks/useReceipts';
import { useCategories } from '@/hooks/useCategories';
import { useSpendingStats } from '@/hooks/useSpendingStats';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReceiptCard } from '@/components/receipt/ReceiptCard';
import { ReceiptImageViewer } from '@/components/receipt/ReceiptImageViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Edit2, CheckSquare, List, RefreshCw, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LineItemsDisplay } from '@/components/receipt/LineItemsDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Category, CATEGORY_CONFIG, LineItem } from '@/types/receipt';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();
  const { data: receipts, isLoading } = useReceipts();
  const { data: weeklyStats, isLoading: isLoadingStats } = useSpendingStats('this-week');
  const reviewReceipt = useReviewReceipt();
  const deleteReceipt = useDeleteReceipt();
  const processReceipt = useProcessReceipt();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [editedLineItems, setEditedLineItems] = useState<LineItem[] | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustments, setAdjustments] = useState({
    groceries_amount: 0,
    household_amount: 0,
    clothing_amount: 0,
    other_amount: 0,
  });
  const isMobile = useIsMobile();

  // Enable processing timeout check
  useProcessingTimeout();

  // Show both processing and processed receipts (new streamlined flow)
  const processingReceipts = receipts?.filter(r => r.status === 'processing') || [];
  const processedReceipts = receipts?.filter(r => r.status === 'processed') || [];
  const failedReceipts = receipts?.filter(r => r.status === 'failed') || [];
  const pendingReceipts = [...processingReceipts, ...processedReceipts, ...failedReceipts];

  const handleSelectReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setEditedLineItems(receipt.line_items ? [...receipt.line_items] : null);
    setAdjustMode(false);
    setAdjustments({
      groceries_amount: receipt.groceries_amount,
      household_amount: receipt.household_amount,
      clothing_amount: receipt.clothing_amount,
      other_amount: receipt.other_amount,
    });
  };

  // Recalculate category totals from line items
  const recalculateCategoryTotals = (items: LineItem[]) => {
    const totals = { groceries_amount: 0, household_amount: 0, clothing_amount: 0, other_amount: 0 };
    items.forEach(item => {
      const key = `${item.category}_amount` as keyof typeof totals;
      if (key in totals) {
        totals[key] += item.amount;
      }
    });
    return totals;
  };

  const handleLineItemCategoryChange = (index: number, newCategory: Category) => {
    if (!editedLineItems) return;
    
    const updated = [...editedLineItems];
    updated[index] = { ...updated[index], category: newCategory };
    setEditedLineItems(updated);
    
    // Recalculate category totals
    const newTotals = recalculateCategoryTotals(updated);
    setAdjustments(newTotals);
  };

  // Save line item history for AI learning
  const saveLineItemHistory = async (items: LineItem[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const item of items) {
        const normalized = item.description.toLowerCase().trim();
        
        // Check if this item already exists
        const { data: existing } = await supabase
          .from('line_item_history')
          .select('id, occurrence_count')
          .eq('user_id', user.id)
          .eq('normalized_description', normalized)
          .eq('legacy_category', item.category)
          .single();

        if (existing) {
          // Update occurrence count
          await supabase
            .from('line_item_history')
            .update({ 
              occurrence_count: existing.occurrence_count + 1,
              last_used_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Insert new record
          await supabase
            .from('line_item_history')
            .insert({
              user_id: user.id,
              description: item.description,
              normalized_description: normalized,
              legacy_category: item.category,
            });
        }
      }
    } catch (error) {
      console.error('Failed to save line item history:', error);
    }
  };

  const handleAccept = async () => {
    if (!selectedReceipt) return;
    
    // Check if line items were edited
    const lineItemsChanged = JSON.stringify(editedLineItems) !== JSON.stringify(selectedReceipt.line_items);
    
    if (lineItemsChanged && editedLineItems) {
      // Save the line items with new categories and recalculated totals
      const newTotals = recalculateCategoryTotals(editedLineItems);
      await reviewReceipt.mutateAsync({
        id: selectedReceipt.id,
        action: 'adjust',
        adjustments: {
          ...newTotals,
          line_items: editedLineItems as any,
        },
      });
      
      // Save to history for AI learning
      await saveLineItemHistory(editedLineItems);
      toast.success('Receipt reviewed and categories saved for AI learning!');
    } else {
      await reviewReceipt.mutateAsync({
        id: selectedReceipt.id,
        action: 'accept',
      });
      
      // Save original line items to history
      if (selectedReceipt.line_items) {
        await saveLineItemHistory(selectedReceipt.line_items);
      }
    }
    
    setSelectedReceipt(null);
    setEditedLineItems(null);
  };

  const handleAdjust = async () => {
    if (!selectedReceipt) return;
    await reviewReceipt.mutateAsync({
      id: selectedReceipt.id,
      action: 'adjust',
      adjustments: {
        ...adjustments,
        line_items: editedLineItems as any,
      },
    });
    
    // Save to history for AI learning
    if (editedLineItems) {
      await saveLineItemHistory(editedLineItems);
    }
    
    setSelectedReceipt(null);
    setEditedLineItems(null);
    setAdjustMode(false);
  };

  const handleRetry = async (receipt: Receipt) => {
    try {
      await processReceipt.mutateAsync(receipt.id);
      toast.success('Retrying processing...');
    } catch (error) {
      toast.error('Failed to retry processing');
    }
  };

  const handleDelete = async (receipt: Receipt) => {
    try {
      await deleteReceipt.mutateAsync({ id: receipt.id, image_path: receipt.image_path });
    } catch (error) {
      // Error toast is handled in the hook
    }
  };

  const categories: Category[] = ['groceries', 'household', 'clothing', 'other'];

  // Check if any line items have been modified
  const hasLineItemChanges = editedLineItems && 
    JSON.stringify(editedLineItems) !== JSON.stringify(selectedReceipt?.line_items);

  const closeReviewSheet = () => {
    setSelectedReceipt(null);
    setEditedLineItems(null);
  };

  // Review content shared between Dialog and Sheet
  const ReviewContent = () => {
    if (!selectedReceipt) return null;

    return (
      <div className={cn(
        "space-y-4",
        isMobile ? "pb-20" : ""
      )}>
        {/* Receipt image */}
        <div className={isMobile ? "max-h-48 overflow-hidden rounded-lg" : ""}>
          <ReceiptImageViewer imagePath={selectedReceipt.image_path} />
        </div>

        {/* Merchant & total info */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {selectedReceipt.merchant || 'Unknown Merchant'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedReceipt.receipt_date 
                ? format(new Date(selectedReceipt.receipt_date), 'MMMM d, yyyy')
                : format(new Date(selectedReceipt.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              ${Number(selectedReceipt.total_amount || 0).toFixed(2)}
            </p>
            {selectedReceipt.confidence_score && (
              <p className="text-xs text-muted-foreground">
                {Math.round(selectedReceipt.confidence_score * 100)}% confidence
              </p>
            )}
          </div>
        </div>

        {/* Tabs for Line Items and Category Breakdown */}
        <Tabs defaultValue="line-items" className="w-full">
          <TabsList className={cn("grid w-full grid-cols-2", isMobile && "h-12")}>
            <TabsTrigger value="line-items" className={cn("gap-1", isMobile && "min-h-[44px]")}>
              <List className="h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="categories" className={isMobile ? "min-h-[44px]" : ""}>
              Categories
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="line-items" className="mt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Tap a category to change it. Your corrections help the AI learn!
              </p>
              <LineItemsDisplay 
                lineItems={editedLineItems} 
                editable={true}
                onItemCategoryChange={handleLineItemCategoryChange}
                categories={dbCategories}
              />
              {hasLineItemChanges && (
                <p className="text-xs text-primary mt-2">
                  ✓ Category changes will be saved when you accept
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Category Breakdown</Label>
              {!adjustMode && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setAdjustMode(true)}
                  className={isMobile ? "min-h-[44px]" : ""}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Adjust
                </Button>
              )}
            </div>

            {categories.map(category => {
              const config = CATEGORY_CONFIG[category];
              const key = `${category}_amount` as keyof typeof adjustments;
              const value = adjustments[key];
              const isOther = category === 'other';

              const handleCategoryChange = (newValue: number) => {
                if (isOther) {
                  setAdjustments(prev => ({ ...prev, other_amount: newValue }));
                } else {
                  const total = Number(selectedReceipt.total_amount) || 0;
                  const otherCategories = ['groceries_amount', 'household_amount', 'clothing_amount'] as const;
                  
                  const newAdjustments = { ...adjustments, [key]: newValue };
                  const sumOfOthers = otherCategories.reduce((sum, k) => sum + newAdjustments[k], 0);
                  newAdjustments.other_amount = Math.max(0, Math.round((total - sumOfOthers) * 100) / 100);
                  
                  setAdjustments(newAdjustments);
                }
              };

              return (
                <div key={category} className={cn("flex items-center gap-3", isMobile && "min-h-[52px]")}>
                  <span className="text-xl">{config.icon}</span>
                  <span className="flex-1 font-medium">{config.label}</span>
                  {adjustMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28"
                      value={value}
                      onChange={(e) => handleCategoryChange(parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <span className="font-semibold">${value.toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    );
  };


  // Review actions shared between Dialog and Sheet
  const ReviewActions = () => (
    <div className={cn(
      "flex gap-2",
      isMobile && "fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom"
    )}>
      {adjustMode ? (
        <>
          <Button variant="outline" onClick={() => setAdjustMode(false)} className={cn("flex-1", isMobile && "min-h-[52px]")}>
            Cancel
          </Button>
          <Button onClick={handleAdjust} className={cn("flex-1", isMobile && "min-h-[52px]")}>
            <Check className="h-4 w-4 mr-2" />
            Save
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={closeReviewSheet} className={cn("flex-1", isMobile && "min-h-[52px]")}>
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button onClick={handleAccept} className={cn("flex-1", isMobile && "min-h-[52px]")}>
            <Check className="h-4 w-4 mr-2" />
            {hasLineItemChanges ? 'Save' : 'Accept'}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Review</h1>
          {!isMobile && (
            <p className="text-muted-foreground mt-1">
              Review and finalize your categorized receipts.
            </p>
          )}
        </div>

        {/* Pending review - moved to top, compact when empty */}
        <section>
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4">
            Ready for Review ({pendingReceipts.length})
          </h2>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : pendingReceipts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingReceipts.map(receipt => (
                <div key={receipt.id} className="relative">
                  <ReceiptCard 
                    receipt={receipt}
                    onClick={receipt.status === 'processed' ? () => handleSelectReceipt(receipt) : undefined}
                  />
                  {/* Processing overlay */}
                  {receipt.status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Processing...</p>
                      </div>
                    </div>
                  )}
                  {/* Failed overlay with retry/delete */}
                  {receipt.status === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-lg">
                      <div className="text-center p-4">
                        <p className="text-sm text-destructive font-medium mb-1">
                          {receipt.error_message || 'Processing failed'}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Would you like to try again?
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDelete(receipt)}
                            disabled={deleteReceipt.isPending}
                            className="min-h-[44px]"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleRetry(receipt)}
                            disabled={processReceipt.isPending}
                            className="min-h-[44px]"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Compact empty state
            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
                  <CheckSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No receipts pending review</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Weekly spending categories - compact rectangular widgets */}
        <section>
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4">
            This Week's Spending
          </h2>

          {isLoadingStats ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : weeklyStats?.categories && weeklyStats.categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {weeklyStats.categories.map(category => {
                const percentage = weeklyStats.total > 0 
                  ? (category.amount / weeklyStats.total) * 100 
                  : 0;
                
                return (
                  <button
                    key={category.categoryId}
                    onClick={() => navigate(`/category/${category.categoryId}`)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border bg-card text-left",
                      "hover:bg-muted/50 active:scale-[0.98] transition-all",
                      "min-h-[52px]"
                    )}
                  >
                    <span className="text-lg flex-shrink-0">{category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {category.categoryName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}%
                      </p>
                    </div>
                    <span className="font-semibold text-foreground text-sm flex-shrink-0">
                      ${category.amount.toFixed(0)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No spending this week</p>
              </CardContent>
            </Card>
          )}

          {weeklyStats?.total !== undefined && weeklyStats.total > 0 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">${weeklyStats.total.toFixed(2)}</span>
              </p>
            </div>
          )}
        </section>

        {/* Review Sheet for Mobile */}
        {isMobile ? (
          <Sheet open={!!selectedReceipt} onOpenChange={(open) => !open && closeReviewSheet()}>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader className="pb-4">
                <SheetTitle>Review Receipt</SheetTitle>
              </SheetHeader>
              <ReviewContent />
              <ReviewActions />
            </SheetContent>
          </Sheet>
        ) : (
          /* Review Dialog for Desktop */
          <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && closeReviewSheet()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Receipt</DialogTitle>
              </DialogHeader>

              {selectedReceipt && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Receipt image - left column */}
                  <ReceiptImageViewer imagePath={selectedReceipt.image_path} />

                  {/* Receipt details - right column */}
                  <ReviewContent />
                </div>
              )}

              <DialogFooter>
                <ReviewActions />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
