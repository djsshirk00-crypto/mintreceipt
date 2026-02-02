import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useReceipts, Receipt } from '@/hooks/useReceipts';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionEditSheet } from '@/components/transactions/TransactionEditSheet';
import { Search, X, Receipt as ReceiptIcon, Filter } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: receipts, isLoading } = useReceipts();
  const { data: categories } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Receipt | null>(null);

  // Get filter params from URL
  const categoryFilter = searchParams.get('category');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  // Only show reviewed transactions
  const reviewedReceipts = useMemo(() => {
    return receipts?.filter(r => r.status === 'reviewed') || [];
  }, [receipts]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...reviewedReceipts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.merchant?.toLowerCase().includes(query) ||
        r.line_items?.some(item => item.description.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter) {
      const category = categories?.find(c => 
        c.id === categoryFilter || c.name.toLowerCase() === categoryFilter.toLowerCase()
      );
      if (category) {
        // For now, filter by legacy category columns
        const legacyCategory = category.name.toLowerCase();
        filtered = filtered.filter(r => {
          if (legacyCategory === 'groceries') return r.groceries_amount > 0;
          if (legacyCategory === 'household') return r.household_amount > 0;
          if (legacyCategory === 'clothing') return r.clothing_amount > 0;
          return r.other_amount > 0;
        });
      }
    }

    // Date range filter
    if (fromDate || toDate) {
      filtered = filtered.filter(r => {
        if (!r.receipt_date) return false;
        const receiptDate = parseISO(r.receipt_date);
        const start = fromDate ? startOfDay(parseISO(fromDate)) : new Date(0);
        const end = toDate ? endOfDay(parseISO(toDate)) : new Date();
        return isWithinInterval(receiptDate, { start, end });
      });
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.receipt_date || a.created_at;
      const dateB = b.receipt_date || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [reviewedReceipts, searchQuery, categoryFilter, fromDate, toDate, categories]);

  // Check if any filters are active
  const hasActiveFilters = categoryFilter || fromDate || toDate;

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
  };

  const getCategoryName = () => {
    if (!categoryFilter) return null;
    const category = categories?.find(c => 
      c.id === categoryFilter || c.name.toLowerCase() === categoryFilter.toLowerCase()
    );
    return category?.name || categoryFilter;
  };

  // Get primary category for a receipt
  const getPrimaryCategory = (receipt: Receipt) => {
    const amounts = [
      { name: 'Groceries', amount: receipt.groceries_amount, icon: '🥬' },
      { name: 'Household', amount: receipt.household_amount, icon: '🏠' },
      { name: 'Clothing', amount: receipt.clothing_amount, icon: '👕' },
      { name: 'Other', amount: receipt.other_amount, icon: '📦' },
    ];
    return amounts.reduce((max, curr) => curr.amount > max.amount ? curr : max, amounts[3]);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your transaction history.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search merchants or items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {categoryFilter && (
                <Badge variant="secondary" className="gap-1">
                  {getCategoryName()}
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('category');
                    setSearchParams(params);
                  }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(fromDate || toDate) && (
                <Badge variant="secondary" className="gap-1">
                  {fromDate && toDate 
                    ? `${format(parseISO(fromDate), 'MMM d')} - ${format(parseISO(toDate), 'MMM d')}`
                    : fromDate 
                      ? `From ${format(parseISO(fromDate), 'MMM d')}`
                      : `Until ${format(parseISO(toDate!), 'MMM d')}`
                  }
                  <button onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('from');
                    params.delete('to');
                    setSearchParams(params);
                  }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Transaction list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-2">
            {filteredTransactions.map(receipt => {
              const primaryCategory = getPrimaryCategory(receipt);
              return (
                <Card 
                  key={receipt.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedTransaction(receipt)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">
                        {primaryCategory.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {receipt.merchant || 'Unknown Merchant'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {receipt.receipt_date 
                            ? format(parseISO(receipt.receipt_date), 'MMM d, yyyy')
                            : format(parseISO(receipt.created_at), 'MMM d, yyyy')
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${Number(receipt.total_amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {primaryCategory.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <ReceiptIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasActiveFilters || searchQuery ? 'No matching transactions' : 'No transactions yet'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {hasActiveFilters || searchQuery 
                  ? 'Try adjusting your filters or search query.'
                  : 'Reviewed receipts will appear here for easy browsing and management.'
                }
              </p>
              {(hasActiveFilters || searchQuery) && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        {!isLoading && filteredTransactions.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Edit Sheet */}
      <TransactionEditSheet
        receipt={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </AppLayout>
  );
}
