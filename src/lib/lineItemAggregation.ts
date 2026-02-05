import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { LineItem } from '@/types/receipt';
import { Category } from '@/hooks/useCategories';

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: number;
}

/**
 * Aggregates spending from line items within a date range.
 * Line items are the source of truth for category-level spending.
 * 
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param categories - User's categories for mapping
 * @returns Object with total spent and per-category breakdown
 */
export async function aggregateLineItemSpending(
  startDate: Date,
  endDate: Date,
  categories: Category[]
): Promise<{ total: number; categoryTotals: CategoryTotal[]; receiptCount: number }> {
  // Fetch receipts with line_items in the date range
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('id, total_amount, line_items, receipt_date')
    .in('status', ['processed', 'reviewed'])
    .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
    .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  // Build category lookup map (lowercase name -> category)
  const categoryByName: Record<string, Category> = {};
  categories.forEach(cat => {
    categoryByName[cat.name.toLowerCase()] = cat;
  });

  // Aggregate amounts by category from line items
  const categoryAmounts: Record<string, number> = {};
  let total = 0;

  receipts?.forEach(receipt => {
    // Add to total from receipt total_amount (source of truth for overall spending)
    total += Number(receipt.total_amount) || 0;

    // Extract line items and aggregate by category
    const lineItems = (receipt.line_items as unknown) as LineItem[] | null;
    if (!lineItems || lineItems.length === 0) return;

    lineItems.forEach(item => {
      const categoryKey = item.category.toLowerCase();
      const category = categoryByName[categoryKey];
      
      if (category) {
        categoryAmounts[category.id] = (categoryAmounts[category.id] || 0) + item.amount;
      } else {
        // If no matching category, try to find an "Other" or "Uncategorized" category
        const otherCat = categories.find(c => 
          c.name.toLowerCase() === 'other' || 
          c.name.toLowerCase().includes('uncategorized')
        );
        if (otherCat) {
          categoryAmounts[otherCat.id] = (categoryAmounts[otherCat.id] || 0) + item.amount;
        }
      }
    });
  });

  // Build result array with all categories
  const categoryTotals: CategoryTotal[] = categories.map(cat => ({
    categoryId: cat.id,
    categoryName: cat.name,
    icon: cat.icon,
    color: cat.color,
    amount: categoryAmounts[cat.id] || 0,
  }));

  // Sort by amount descending
  categoryTotals.sort((a, b) => b.amount - a.amount);

  return {
    total,
    categoryTotals,
    receiptCount: receipts?.length || 0,
  };
}

/**
 * Aggregates spending by category for budget tracking.
 * Returns a map of category ID to total spent amount.
 */
export async function getCategorySpendingMap(
  startDate: Date,
  endDate: Date,
  categories: Category[]
): Promise<Record<string, number>> {
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('id, line_items')
    .in('status', ['processed', 'reviewed'])
    .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
    .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  // Build category lookup map
  const categoryByName: Record<string, Category> = {};
  categories.forEach(cat => {
    categoryByName[cat.name.toLowerCase()] = cat;
  });

  // Aggregate by category
  const spending: Record<string, number> = {};

  receipts?.forEach(receipt => {
    const lineItems = (receipt.line_items as unknown) as LineItem[] | null;
    if (!lineItems || lineItems.length === 0) return;

    lineItems.forEach(item => {
      const categoryKey = item.category.toLowerCase();
      const category = categoryByName[categoryKey];
      
      if (category) {
        spending[category.id] = (spending[category.id] || 0) + item.amount;
      } else {
        // Map to "Other" if exists
        const otherCat = categories.find(c => 
          c.name.toLowerCase() === 'other' || 
          c.name.toLowerCase().includes('uncategorized')
        );
        if (otherCat) {
          spending[otherCat.id] = (spending[otherCat.id] || 0) + item.amount;
        }
      }
    });
  });

  return spending;
}

/**
 * Get line items for a specific category within a date range.
 */
export async function getLineItemsForCategory(
  categoryName: string,
  startDate: Date,
  endDate: Date
): Promise<{
  items: Array<{
    id: string;
    receiptId: string;
    merchant: string;
    receiptDate: string;
    description: string;
    amount: number;
    parentTotalAmount: number;
    parentHasMultipleItems: boolean;
  }>;
  total: number;
}> {
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('id, merchant, receipt_date, created_at, total_amount, line_items')
    .in('status', ['processed', 'reviewed'])
    .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
    .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  const normalizedCategory = categoryName.toLowerCase();
  const items: Array<{
    id: string;
    receiptId: string;
    merchant: string;
    receiptDate: string;
    description: string;
    amount: number;
    parentTotalAmount: number;
    parentHasMultipleItems: boolean;
  }> = [];

  let total = 0;

  receipts?.forEach(receipt => {
    const lineItems = (receipt.line_items as unknown) as LineItem[] | null;
    if (!lineItems || lineItems.length === 0) return;

    lineItems.forEach((item, index) => {
      if (item.category.toLowerCase() === normalizedCategory) {
        items.push({
          id: `${receipt.id}-${index}`,
          receiptId: receipt.id,
          merchant: receipt.merchant || 'Unknown Merchant',
          receiptDate: receipt.receipt_date || receipt.created_at,
          description: item.description,
          amount: item.amount,
          parentTotalAmount: Number(receipt.total_amount) || 0,
          parentHasMultipleItems: lineItems.length > 1,
        });
        total += item.amount;
      }
    });
  });

  // Sort by date descending
  items.sort((a, b) =>
    new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
  );

  return { items, total };
}
