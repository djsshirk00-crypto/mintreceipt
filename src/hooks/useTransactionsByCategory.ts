import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from './useCategories';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface Transaction {
  id: string;
  merchant: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  category_amount: number;
  category_name?: string;
  category_icon?: string;
}

// Legacy column mapping to category names
const LEGACY_COLUMNS = ['groceries', 'household', 'clothing', 'other'] as const;
type LegacyColumn = typeof LEGACY_COLUMNS[number];

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

      // Fetch receipts with category amounts
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          merchant,
          receipt_date,
          total_amount,
          groceries_amount,
          household_amount,
          clothing_amount,
          other_amount
        `)
        .in('status', ['processed', 'reviewed'])
        .gte('receipt_date', startDate.toISOString().split('T')[0])
        .lte('receipt_date', endDate.toISOString().split('T')[0])
        .order('receipt_date', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Also fetch from receipt_category_amounts for newer entries
      const { data: categoryAmounts, error: catError } = await supabase
        .from('receipt_category_amounts')
        .select(`
          receipt_id,
          category_id,
          amount
        `);

      if (catError) throw catError;

      // Build a map of category names to IDs for legacy matching
      const categoryNameToId: Record<string, string> = {};
      const categoryIdToInfo: Record<string, { name: string; icon: string }> = {};
      
      categories?.forEach(cat => {
        categoryNameToId[cat.name.toLowerCase()] = cat.id;
        categoryIdToInfo[cat.id] = { name: cat.name, icon: cat.icon };
      });

      // Find which legacy column matches the selected category
      let targetLegacyColumn: LegacyColumn | null = null;
      if (categoryId && categories) {
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (selectedCategory) {
          const lowerName = selectedCategory.name.toLowerCase();
          if (LEGACY_COLUMNS.includes(lowerName as LegacyColumn)) {
            targetLegacyColumn = lowerName as LegacyColumn;
          }
        }
      }

      // Transform receipts into transactions
      const transactions: Transaction[] = [];

      receipts?.forEach(receipt => {
        const receiptCategoryAmounts = categoryAmounts?.filter(ca => ca.receipt_id === receipt.id) || [];

        if (categoryId === null) {
          // Show all transactions - calculate total from all categories
          let totalCategoryAmount = 0;
          
          // Sum legacy amounts
          LEGACY_COLUMNS.forEach(col => {
            const amount = receipt[`${col}_amount` as keyof typeof receipt] as number | null;
            if (amount && amount > 0) {
              totalCategoryAmount += amount;
            }
          });

          // Sum new category amounts (avoid double counting)
          if (receiptCategoryAmounts.length > 0 && totalCategoryAmount === 0) {
            receiptCategoryAmounts.forEach(ca => {
              totalCategoryAmount += ca.amount;
            });
          }

          if (totalCategoryAmount > 0 || receipt.total_amount) {
            transactions.push({
              id: receipt.id,
              merchant: receipt.merchant,
              receipt_date: receipt.receipt_date,
              total_amount: receipt.total_amount,
              category_amount: totalCategoryAmount || receipt.total_amount || 0,
            });
          }
        } else {
          // Filter by specific category
          let categoryAmount = 0;

          // Check legacy columns
          if (targetLegacyColumn) {
            const amount = receipt[`${targetLegacyColumn}_amount` as keyof typeof receipt] as number | null;
            if (amount && amount > 0) {
              categoryAmount = amount;
            }
          }

          // Check new category amounts table
          const catAmount = receiptCategoryAmounts.find(ca => ca.category_id === categoryId);
          if (catAmount && catAmount.amount > 0) {
            categoryAmount = catAmount.amount;
          }

          if (categoryAmount > 0) {
            transactions.push({
              id: receipt.id,
              merchant: receipt.merchant,
              receipt_date: receipt.receipt_date,
              total_amount: receipt.total_amount,
              category_amount: categoryAmount,
              category_name: categoryIdToInfo[categoryId]?.name,
              category_icon: categoryIdToInfo[categoryId]?.icon,
            });
          }
        }
      });

      return transactions;
    },
  });
}
