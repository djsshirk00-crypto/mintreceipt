import { useState, useEffect } from 'react';
import { Receipt, useUpdateReceipt, useDeleteReceipt } from '@/hooks/useReceipts';
import { useCategories } from '@/hooks/useCategories';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ReceiptImageViewer } from '@/components/receipt/ReceiptImageViewer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

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
    }
  }, [receipt]);

  const handleSave = async () => {
    if (!receipt) return;

    const amount = parseFloat(formData.total_amount) || 0;
    const categoryName = formData.category.toLowerCase();

    // Map to legacy category columns
    const categoryAmounts = {
      groceries_amount: categoryName === 'groceries' ? amount : 0,
      household_amount: categoryName === 'household' ? amount : 0,
      clothing_amount: categoryName === 'clothing' ? amount : 0,
      other_amount: !['groceries', 'household', 'clothing'].includes(categoryName) ? amount : 0,
    };

    try {
      await updateReceipt.mutateAsync({
        id: receipt.id,
        updates: {
          merchant: formData.merchant,
          receipt_date: formData.receipt_date,
          total_amount: amount,
          ...categoryAmounts,
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Transaction</SheetTitle>
          </SheetHeader>

          <div className="py-6 space-y-6">
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
