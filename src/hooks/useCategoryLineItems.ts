import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { LineItem } from '@/types/receipt';

export interface CategoryLineItem {
  id: string;
  receiptId: string;
  merchant: string;
  receiptDate: string;
  description: string;
  amount: number;
  category: string;
  parentHasMultipleItems: boolean;
  parentTotalAmount: number;
}

interface UseCategoryLineItemsResult {
  lineItems: CategoryLineItem[];
  expectedTotal: number;
  lineItemsTotal: number;
  uniqueReceiptCount: number;
}

async function fetchCategoryLineItems(
  categoryName: string,
  startDate: Date,
  endDate: Date
): Promise<UseCategoryLineItemsResult> {
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('id, merchant, receipt_date, created_at, total_amount, line_items, groceries_amount, household_amount, clothing_amount, other_amount')
    .in('status', ['processed', 'reviewed'])
    .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
    .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  // Calculate expected total from category columns
  let expectedTotal = 0;
  const normalizedCategory = categoryName.toLowerCase();
  
  receipts?.forEach(r => {
    if (normalizedCategory === 'groceries') {
      expectedTotal += Number(r.groceries_amount) || 0;
    } else if (normalizedCategory === 'household') {
      expectedTotal += Number(r.household_amount) || 0;
    } else if (normalizedCategory === 'clothing') {
      expectedTotal += Number(r.clothing_amount) || 0;
    } else if (normalizedCategory === 'other') {
      expectedTotal += Number(r.other_amount) || 0;
    }
  });

  // Extract and filter line items
  const lineItems: CategoryLineItem[] = [];
  const receiptIds = new Set<string>();

  receipts?.forEach(receipt => {
    const items = (receipt.line_items as unknown) as LineItem[] | null;
    if (!items || items.length === 0) return;

    items.forEach((item, index) => {
      if (item.category.toLowerCase() === normalizedCategory) {
        receiptIds.add(receipt.id);
        lineItems.push({
          id: `${receipt.id}-${index}`,
          receiptId: receipt.id,
          merchant: receipt.merchant || 'Unknown Merchant',
          receiptDate: receipt.receipt_date || receipt.created_at,
          description: item.description,
          amount: item.amount,
          category: item.category,
          parentHasMultipleItems: items.length > 1,
          parentTotalAmount: Number(receipt.total_amount) || 0,
        });
      }
    });
  });

  // Sort by date descending
  lineItems.sort((a, b) =>
    new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
  );

  // Calculate sum of line items for sanity check
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    lineItems,
    expectedTotal,
    lineItemsTotal,
    uniqueReceiptCount: receiptIds.size,
  };
}

export function useCategoryLineItems(
  categoryName: string | undefined,
  startDate: Date | null,
  endDate: Date | null
) {
  return useQuery({
    queryKey: ['category-line-items', categoryName, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => fetchCategoryLineItems(categoryName!, startDate!, endDate!),
    enabled: !!categoryName && !!startDate && !!endDate,
  });
}
