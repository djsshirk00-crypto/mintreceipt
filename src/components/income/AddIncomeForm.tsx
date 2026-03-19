import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, TrendingUp } from 'lucide-react';
import { useAddIncomeTransaction, IncomeType } from '@/hooks/useIncomeTransactions';
import { useRentalProperties } from '@/hooks/useRentalProperties';

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  income_type: z.enum(['salary', 'commission', 'rental', 'interest', 'reimbursement', 'other']),
  source: z.string().optional(),
  transaction_date: z.string().min(1, 'Date is required'),
  is_recurring: z.boolean().default(false),
  recurrence_interval: z.string().optional(),
  rental_property_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: '💰 Salary',
  commission: '🏆 Commission / Bonus',
  rental: '🏠 Rental Income',
  interest: '📈 Interest / Dividends',
  reimbursement: '💵 Reimbursement',
  other: '📥 Other Income',
};

interface AddIncomeFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultType?: IncomeType;
}

export function AddIncomeForm({ open, onOpenChange, defaultType }: AddIncomeFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const addIncome = useAddIncomeTransaction();
  const { data: properties } = useRentalProperties();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      description: '',
      income_type: defaultType || 'salary',
      source: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
      recurrence_interval: undefined,
      rental_property_id: undefined,
      notes: '',
    },
  });

  const incomeType = form.watch('income_type');
  const isRecurring = form.watch('is_recurring');

  const onSubmit = async (values: FormValues) => {
    await addIncome.mutateAsync({
      amount: values.amount,
      description: values.description,
      income_type: values.income_type,
      source: values.source || null,
      transaction_date: values.transaction_date,
      is_recurring: values.is_recurring,
      recurrence_interval: values.is_recurring ? values.recurrence_interval || null : null,
      rental_property_id: values.rental_property_id || null,
      notes: values.notes || null,
      import_source: 'manual',
    });
    form.reset();
    setIsOpen(false);
  };

  const dialogContent = (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          Add Income
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Income Type */}
          <FormField
            control={form.control}
            name="income_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Income Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Monthly salary, October rent..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Source */}
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Shirlock Acres, 147 Property" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rental Property (only for rental type) */}
          {incomeType === 'rental' && properties && properties.length > 0 && (
            <FormField
              control={form.control}
              name="rental_property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Date */}
          <FormField
            control={form.control}
            name="transaction_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Recurring */}
          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Recurring Income</FormLabel>
                  <p className="text-xs text-muted-foreground">Mark as a repeating income source</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {isRecurring && (
            <FormField
              control={form.control}
              name="recurrence_interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes..." rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={addIncome.isPending}
            >
              {addIncome.isPending ? 'Saving...' : 'Add Income'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );

  if (open !== undefined) {
    return <Dialog open={isOpen} onOpenChange={setIsOpen}>{dialogContent}</Dialog>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50">
          <Plus className="h-4 w-4" />
          Add Income
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
