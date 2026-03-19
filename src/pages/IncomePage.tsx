import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TrendingUp, Plus, Search, Trash2, Calendar, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import {
  useIncomeTransactions,
  useDeleteIncomeTransaction,
  IncomeType,
  IncomeTransaction,
} from '@/hooks/useIncomeTransactions';
import { useAnnualIncome, useMonthlyIncome } from '@/hooks/useIncomeTransactions';
import { AddIncomeForm } from '@/components/income/AddIncomeForm';
import { CSVImporter } from '@/components/import/CSVImporter';
import { cn } from '@/lib/utils';

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salary: '💰 Salary',
  commission: '🏆 Commission',
  rental: '🏠 Rental',
  interest: '📈 Interest',
  reimbursement: '💵 Reimbursement',
  other: '📥 Other',
};

const INCOME_TYPE_COLORS: Record<IncomeType, string> = {
  salary: 'bg-emerald-100 text-emerald-700',
  commission: 'bg-green-100 text-green-700',
  rental: 'bg-blue-100 text-blue-700',
  interest: 'bg-cyan-100 text-cyan-700',
  reimbursement: 'bg-yellow-100 text-yellow-700',
  other: 'bg-muted text-muted-foreground',
};

function IncomeRow({
  transaction,
  onDelete,
}: {
  transaction: IncomeTransaction;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{transaction.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
          </span>
          {transaction.source && (
            <span className="text-xs text-muted-foreground">· {transaction.source}</span>
          )}
        </div>
      </div>
      <Badge className={cn('text-xs shrink-0', INCOME_TYPE_COLORS[transaction.income_type])}>
        {INCOME_TYPE_LABELS[transaction.income_type]}
      </Badge>
      <p className="font-semibold text-sm text-emerald-600 shrink-0">
        +${Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(transaction.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function IncomePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: transactions, isLoading } = useIncomeTransactions();
  const { data: annualData } = useAnnualIncome(year);
  const { data: monthlyData } = useMonthlyIncome(month, year);
  const deleteIncome = useDeleteIncomeTransaction();

  const filtered = (transactions || []).filter(t => {
    const matchesSearch =
      !search ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (t.source || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || t.income_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Income</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all your income sources.
            </p>
          </div>
          <div className="flex gap-2">
            <CSVImporter />
            <AddIncomeForm />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">This Month</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                ${(monthlyData?.total || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{year} Total</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                ${(annualData?.total || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Income by Type */}
        {annualData && Object.keys(annualData.byType).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {year} Income by Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(annualData.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, amount]) => {
                  const pct = annualData.total > 0 ? (amount / annualData.total) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 shrink-0">
                        {INCOME_TYPE_LABELS[type as IncomeType] || type}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-20 text-right shrink-0">
                        ${amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search income..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="font-medium text-foreground">No income transactions</p>
                <p className="text-sm text-muted-foreground">
                  Add your first income entry or import from CSV.
                </p>
              </div>
            ) : (
              <div>
                {filtered.map(t => (
                  <IncomeRow
                    key={t.id}
                    transaction={t}
                    onDelete={setDeleteId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this income transaction. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteIncome.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
