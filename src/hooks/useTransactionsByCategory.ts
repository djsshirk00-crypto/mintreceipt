import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from './useCategories';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { LineItem } from '@/types/receipt';

export interface Transaction {
  id: string;
  merchant: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  category_amount: number;
  category_name?: string;
  category_icon?: string;
  description?: string;
  isLineItem?: boolean;
}

export function useTransactionsByCategory(
  categoryId: string | null,
  month: number,
  year: number,
  enabled: boolean = true
) {
  const { data: categories } = useCategories();

  return useQuery({
    queryKey: ['transactions-by-category', categoryId, month, year],
    enabled: enabled && !!categories,
    queryFn: async () => {
      // Calculate date range for the month
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // Fetch receipts with line items
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('id, merchant, receipt_date, total_amount, line_items')
        .in('status', ['processed', 'reviewed'])
        .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
        .lte('receipt_date', format(endDate, 'yyyy-MM-dd'))
        .order('receipt_date', { ascending: false });

      if (error) throw error;

      // Build category lookup
      const categoryIdToInfo: Record<string, { name: string; icon: string }> = {};
      const categoryNameToId: Record<string, string> = {};
      
      categories?.forEach(cat => {
        categoryIdToInfo[cat.id] = { name: cat.name, icon: cat.icon };
        categoryNameToId[cat.name.toLowerCase()] = cat.id;
      });

      // Find the selected category's name for matching
      let targetCategoryName: string | null = null;
      if (categoryId && categories) {
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (selectedCategory) {
          targetCategoryName = selectedCategory.name.toLowerCase();
        }
      }

      const transactions: Transaction[] = [];

      receipts?.forEach(receipt => {
        const lineItems = (receipt.line_items as unknown) as LineItem[] | null;

        if (categoryId === null) {
          // Show all transactions - use line items to build individual entries
          if (lineItems && lineItems.length > 0) {
            lineItems.forEach((item, index) => {
              const catId = categoryNameToId[item.category.toLowerCase()];
              transactions.push({
                id: `${receipt.id}-${index}`,
                merchant: receipt.merchant,
                receipt_date: receipt.receipt_date,
                total_amount: receipt.total_amount,
                category_amount: item.amount,
                category_name: categoryIdToInfo[catId]?.name || item.category,
                category_icon: categoryIdToInfo[catId]?.icon || '📦',
                description: item.description,
                isLineItem: true,
              });
            });
          } else if (receipt.total_amount) {
            // Fallback for receipts without line items
            transactions.push({
              id: receipt.id,
              merchant: receipt.merchant,
              receipt_date: receipt.receipt_date,
              total_amount: receipt.total_amount,
              category_amount: receipt.total_amount,
            });
          }
        } else {
          // Filter by specific category using line items
          if (!lineItems || lineItems.length === 0) return;

          lineItems.forEach((item, index) => {
            if (item.category.toLowerCase() === targetCategoryName) {
              transactions.push({
                id: `${receipt.id}-${index}`,
                merchant: receipt.merchant,
                receipt_date: receipt.receipt_date,
                total_amount: receipt.total_amount,
                category_amount: item.amount,
                category_name: categoryIdToInfo[categoryId]?.name,
                category_icon: categoryIdToInfo[categoryId]?.icon,
                description: item.description,
                isLineItem: true,
              });
            }
          });
        }
      });

      return transactions;
    },
  });
}
