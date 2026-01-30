import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const transactionSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
  receipt_date: z.string().min(1, 'Date is required'),
  total_amount: z.string().min(1, 'Amount is required'),
  category: z.string().min(1, 'Category is required'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface ManualTransactionFormProps {
  onComplete?: () => void;
}

export function ManualTransactionForm({ onComplete }: ManualTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      merchant: '',
      receipt_date: new Date().toISOString().split('T')[0],
      total_amount: '',
      category: '',
    },
  });

  const selectedCategory = watch('category');

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in');

      const amount = parseFloat(data.total_amount);
      const categoryName = data.category.toLowerCase();

      // Map to legacy category columns
      const categoryAmounts = {
        groceries_amount: categoryName === 'groceries' ? amount : 0,
        household_amount: categoryName === 'household' ? amount : 0,
        clothing_amount: categoryName === 'clothing' ? amount : 0,
        other_amount: !['groceries', 'household', 'clothing'].includes(categoryName) ? amount : 0,
      };

      const { error } = await supabase.from('receipts').insert({
        user_id: user.id,
        merchant: data.merchant,
        receipt_date: data.receipt_date,
        total_amount: amount,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        ...categoryAmounts,
      });

      if (error) throw error;

      toast.success('Transaction added successfully');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
      reset();
      setOpen(false);
      onComplete?.();
    } catch (error: any) {
      toast.error(`Failed to add transaction: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Manual Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              placeholder="Store name"
              {...register('merchant')}
            />
            {errors.merchant && (
              <p className="text-sm text-destructive">{errors.merchant.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_date">Date</Label>
            <Input
              id="receipt_date"
              type="date"
              {...register('receipt_date')}
            />
            {errors.receipt_date && (
              <p className="text-sm text-destructive">{errors.receipt_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_amount">Amount</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('total_amount')}
            />
            {errors.total_amount && (
              <p className="text-sm text-destructive">{errors.total_amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Transaction'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
