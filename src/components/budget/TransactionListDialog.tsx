import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTransactionsByCategory } from '@/hooks/useTransactionsByCategory';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface TransactionListDialogProps {
  open: boolean;
  onClose: () => void;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  month: number;
  year: number;
}

export function TransactionListDialog({
  open,
  onClose,
  categoryId,
  categoryName,
  categoryIcon,
  month,
  year,
}: TransactionListDialogProps) {
  const { data: transactions, isLoading } = useTransactionsByCategory(
    categoryId,
    month,
    year,
    open
  );

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const title = categoryId
    ? `${categoryIcon || ''} ${categoryName} - ${monthName} ${year}`
    : `All Transactions - ${monthName} ${year}`;

  const total = transactions?.reduce((sum, t) => sum + t.category_amount, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {transaction.receipt_date
                        ? format(new Date(transaction.receipt_date), 'MMM d')
                        : '—'}
                    </TableCell>
                    <TableCell>{transaction.merchant || 'Unknown'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${transaction.category_amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${total.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this period.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
