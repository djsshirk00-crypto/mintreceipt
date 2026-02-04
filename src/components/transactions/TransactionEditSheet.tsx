import { useState, useEffect } from 'react';
import { Receipt, useUpdateReceipt, useDeleteReceipt } from '@/hooks/useReceipts';
import { useCategories } from '@/hooks/useCategories';
import { LineItem, Category } from '@/types/receipt';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReceiptImageViewer } from '@/components/receipt/ReceiptImageViewer';
import { LineItemsDisplay } from '@/components/receipt/LineItemsDisplay';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2, Image as ImageIcon, List } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TransactionEditSheetProps {
  receipt: Receipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionEditSheet({ receipt, open, onOpenChange }: TransactionEditSheetProps) {
  const { data: categories } = useCategories();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  
  const [showImage, setShowImage] = useState(false);
  const [editedLineItems, setEditedLineItems] = useState<LineItem[] | null>(null);
  const [formData, setFormData] = useState({
    merchant: '',
    receipt_date: '',
    total_amount: '',
    category: '',
  });

  // Reset form when receipt changes
  useEffect(() => {
    if (receipt) {
      // Determine primary category
      const amounts = [
        { name: 'groceries', amount: receipt.groceries_amount },
        { name: 'household', amount: receipt.household_amount },
        { name: 'clothing', amount: receipt.clothing_amount },
        { name: 'other', amount: receipt.other_amount },
      ];
      const primary = amounts.reduce((max, curr) => curr.amount > max.amount ? curr : max, amounts[3]);

      setFormData({
        merchant: receipt.merchant || '',
        receipt_date: receipt.receipt_date || format(parseISO(receipt.created_at), 'yyyy-MM-dd'),
        total_amount: String(receipt.total_amount || 0),
        category: primary.name,
      });

      // Initialize line items from receipt
      setEditedLineItems(receipt.line_items ? [...receipt.line_items] : null);
    }
  }, [receipt]);

  // Recalculate category totals from line items
  const recalculateCategoryTotals = (items: LineItem[]) => {
    const totals = { groceries_amount: 0, household_amount: 0, clothing_amount: 0, other_amount: 0 };
    items.forEach(item => {
      const categoryKey = item.category.toLowerCase();
      if (categoryKey === 'groceries') {
        totals.groceries_amount += item.amount;
      } else if (categoryKey === 'household') {
        totals.household_amount += item.amount;
      } else if (categoryKey === 'clothing') {
        totals.clothing_amount += item.amount;
      } else {
        totals.other_amount += item.amount;
      }
    });
    return totals;
  };

  // Handle category change for a line item
  const handleLineItemCategoryChange = (index: number, newCategory: string) => {
    if (!editedLineItems) return;
    
    const updated = [...editedLineItems];
    updated[index] = { ...updated[index], category: newCategory as Category };
    setEditedLineItems(updated);
  };

  // Save line items to history for AI learning
  const saveLineItemHistory = async (items: LineItem[]) => {
    if (!receipt) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const item of items) {
      const normalizedDescription = item.description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .substring(0, 100);

      if (!normalizedDescription) continue;

      // Upsert to line_item_history
      await supabase
        .from('line_item_history')
        .upsert({
          user_id: user.id,
          description: item.description.substring(0, 255),
          normalized_description: normalizedDescription,
          legacy_category: item.category,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,normalized_description',
        });
    }
  };

  // Check if line items have been modified
  const hasLineItemChanges = editedLineItems && receipt?.line_items &&
    JSON.stringify(editedLineItems) !== JSON.stringify(receipt.line_items);

  const handleSave = async () => {
    if (!receipt) return;

    const lineItemsChanged = editedLineItems && 
      JSON.stringify(editedLineItems) !== JSON.stringify(receipt.line_items);

    let categoryAmounts;
    let lineItemsToSave: LineItem[] | undefined = undefined;

    if (lineItemsChanged && editedLineItems) {
      // Use recalculated totals from line items
      categoryAmounts = recalculateCategoryTotals(editedLineItems);
      lineItemsToSave = editedLineItems;
      
      // Save to history for AI learning
      await saveLineItemHistory(editedLineItems);
    } else {
      // Use form category (existing behavior)
      const amount = parseFloat(formData.total_amount) || 0;
      const categoryName = formData.category.toLowerCase();
      categoryAmounts = {
        groceries_amount: categoryName === 'groceries' ? amount : 0,
        household_amount: categoryName === 'household' ? amount : 0,
        clothing_amount: categoryName === 'clothing' ? amount : 0,
        other_amount: !['groceries', 'household', 'clothing'].includes(categoryName) ? amount : 0,
      };
    }

    try {
      await updateReceipt.mutateAsync({
        id: receipt.id,
        updates: {
          merchant: formData.merchant,
          receipt_date: formData.receipt_date,
          total_amount: parseFloat(formData.total_amount) || 0,
          ...categoryAmounts,
          ...(lineItemsToSave && { line_items: lineItemsToSave }),
        },
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;

    try {
      await deleteReceipt.mutateAsync({
        id: receipt.id,
        image_path: receipt.image_path,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!receipt) return null;

  const hasImage = !!receipt.image_path;
  const hasLineItems = editedLineItems && editedLineItems.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="line-items" className="gap-1">
                  <List className="h-4 w-4" />
                  Items
                  {hasLineItemChanges && (
                    <span className="w-2 h-2 rounded-full bg-primary ml-1" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Merchant */}
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant</Label>
                  <Input
                    id="merchant"
                    value={formData.merchant}
                    onChange={(e) => setFormData(prev => ({ ...prev, merchant: e.target.value }))}
                    placeholder="Store name"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name.toLowerCase()}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* View Receipt Image */}
                {hasImage && (
                  <>
                    <Separator />
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => setShowImage(true)}
                    >
                      <ImageIcon className="h-4 w-4" />
                      View Receipt Image
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="line-items" className="mt-4">
                {hasLineItems ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tap a category to change it. Changes help the AI learn!
                    </p>
                    <LineItemsDisplay 
                      lineItems={editedLineItems} 
                      editable={true}
                      onItemCategoryChange={handleLineItemCategoryChange}
                      categories={categories}
                    />
                    {hasLineItemChanges && (
                      <p className="text-xs text-primary mt-2">
                        ✓ Category changes will be saved
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No line items available for this transaction.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Delete action */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Transaction
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this transaction and any associated receipt image. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteReceipt.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateReceipt.isPending}>
              {updateReceipt.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Image Viewer Dialog */}
      {showImage && receipt.image_path && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImage(false)}
        >
          <div className="max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <ReceiptImageViewer imagePath={receipt.image_path} />
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => setShowImage(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
