import { useState, useMemo, useCallback } from 'react';
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
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { PullToRefresh } from '@/components/layout/PullToRefresh';
import { Search, X, Receipt as ReceiptIcon, Filter, Calendar } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';

type QuickDateFilter = 'today' | 'this-week' | 'this-month' | null;

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: receipts, isLoading } = useReceipts();
  const { data: categories } = useCategories();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Receipt | null>(null);
  const [quickDateFilter, setQuickDateFilter] = useState<QuickDateFilter>(null);

  // Get filter params from URL
  const categoryFilter = searchParams.get('category');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  // Calculate date range based on quick filter or URL params
  const effectiveDateRange = useMemo(() => {
    if (quickDateFilter) {
      const now = new Date();
      switch (quickDateFilter) {
        case 'today':
          return { from: startOfDay(now), to: endOfDay(now) };
        case 'this-week':
          return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'this-month':
          return { from: startOfMonth(now), to: endOfMonth(now) };
      }
    }
    
    return {
      from: fromDate ? parseISO(fromDate) : null,
      to: toDate ? parseISO(toDate) : null,
    };
  }, [quickDateFilter, fromDate, toDate]);

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
    if (effectiveDateRange.from || effectiveDateRange.to) {
      filtered = filtered.filter(r => {
        if (!r.receipt_date) return false;
        const receiptDate = parseISO(r.receipt_date);
        const start = effectiveDateRange.from ? startOfDay(effectiveDateRange.from) : new Date(0);
        const end = effectiveDateRange.to ? endOfDay(effectiveDateRange.to) : new Date();
        return isWithinInterval(receiptDate, { start, end });
      });
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.receipt_date || a.created_at;
      const dateB = b.receipt_date || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [reviewedReceipts, searchQuery, categoryFilter, effectiveDateRange, categories]);

  // Check if any filters are active
  const hasActiveFilters = categoryFilter || fromDate || toDate || quickDateFilter;

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
    setQuickDateFilter(null);
  };

  const handleQuickFilter = (filter: QuickDateFilter) => {
    // Clear URL date params when using quick filter
    if (filter) {
      const params = new URLSearchParams(searchParams);
      params.delete('from');
      params.delete('to');
      setSearchParams(params);
    }
    setQuickDateFilter(prev => prev === filter ? null : filter);
  };

  const getCategoryName = () => {
    if (!categoryFilter) return null;
    const category = categories?.find(c => 
      c.id === categoryFilter || c.name.toLowerCase() === categoryFilter.toLowerCase()
    );
    return category?.name || categoryFilter;
  };

  // Get primary category is no longer needed - TransactionRow handles this

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['receipts'] });
  }, [queryClient]);

  const content = (
    <div className="space-y-4">
      {/* Header - Compact on mobile */}
      <div>
        <h1 className={cn(
          "font-bold text-foreground",
          isMobile ? "text-2xl" : "text-3xl"
        )}>
          Transactions
        </h1>
        {!isMobile && (
          <p className="text-muted-foreground mt-1">
            View and manage your transaction history.
          </p>
        )}
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
            className="pl-10 h-12"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Quick Date Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={quickDateFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter('today')}
            className="h-10 px-4 min-w-[80px]"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Today
          </Button>
          <Button
            variant={quickDateFilter === 'this-week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter('this-week')}
            className="h-10 px-4 min-w-[100px]"
          >
            This Week
          </Button>
          <Button
            variant={quickDateFilter === 'this-month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickFilter('this-month')}
            className="h-10 px-4 min-w-[110px]"
          >
            This Month
          </Button>
        </div>

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {categoryFilter && (
              <Badge variant="secondary" className="gap-1 h-8 px-3">
                {getCategoryName()}
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('category');
                    setSearchParams(params);
                  }}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(fromDate || toDate) && !quickDateFilter && (
              <Badge variant="secondary" className="gap-1 h-8 px-3">
                {fromDate && toDate 
                  ? `${format(parseISO(fromDate), 'MMM d')} - ${format(parseISO(toDate), 'MMM d')}`
                  : fromDate 
                    ? `From ${format(parseISO(fromDate), 'MMM d')}`
                    : `Until ${format(parseISO(toDate!), 'MMM d')}`
                }
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('from');
                    params.delete('to');
                    setSearchParams(params);
                  }}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
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
          {filteredTransactions.map(receipt => (
            <TransactionRow 
              key={receipt.id}
              receipt={receipt}
              onEdit={setSelectedTransaction}
            />
          ))}
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
              <Button variant="outline" className="mt-4 h-11" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {!isLoading && filteredTransactions.length > 0 && (
        <p className="text-sm text-muted-foreground text-center pb-4">
          Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );

  return (
    <AppLayout>
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}

      {/* Edit Sheet */}
      <TransactionEditSheet
        receipt={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </AppLayout>
  );
}