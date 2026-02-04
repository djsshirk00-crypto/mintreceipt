

# Fix Category Drill-Down: Line Item View

## Problem Summary

When tapping a category on the Dashboard "Spending by Category" card, the app navigates to the Transactions tab and filters by category at the **parent transaction level**. This causes incorrect totals because:

1. A $42 Walmart receipt might have $35 Groceries + $7 Clothing
2. When filtering Transactions by "Groceries", it shows the full $42 transaction
3. The dashboard shows $35 for Groceries, but the transaction list implies $42

The totals don't match because we're filtering parents, not line items.

---

## Solution

Create a dedicated **Category Detail page** that displays line items (splits) for a specific category and date range, ensuring totals always match the dashboard.

---

## Changes Required

### 1. New Route: `/category/:categoryName`

Add a new route in `App.tsx`:

```tsx
<Route path="/category/:categoryName" element={<AuthGuard><CategoryDetailPage /></AuthGuard>} />
```

### 2. New Page: `src/pages/CategoryDetailPage.tsx`

A dedicated page that:
- Accepts `categoryName` from URL params
- Accepts `from` and `to` date range from query params
- Queries receipts and extracts line items matching the category
- Displays line items as individual rows (not parent transactions)
- Shows a header with category total and validates it matches sum of line items

### 3. New Hook: `src/hooks/useCategoryLineItems.ts`

A data hook that:
- Fetches all receipts in the date range with status `processed` or `reviewed`
- Extracts `line_items` array from each receipt
- Filters to only items matching the target category
- Returns enriched line items with parent merchant/date attached
- Also returns the expected category total from receipt columns for validation

### 4. New Component: `src/components/category/CategoryLineItemRow.tsx`

A row component showing:
- Parent merchant name
- Parent receipt date
- Line item amount
- "Split" badge if parent has multiple line items
- Tap handler to open parent transaction detail

### 5. Update: `src/components/dashboard/CategoryBreakdownList.tsx`

Change navigation from:
```tsx
navigate(`/transactions?${params.toString()}`);
```
To:
```tsx
navigate(`/category/${category.categoryName.toLowerCase()}?${params.toString()}`);
```

---

## Technical Details

### Data Flow

```text
Dashboard (useSpendingStats) --> CategoryBreakdownList
                                        |
                                        | Click on "Groceries: $70"
                                        v
                             /category/groceries?from=2026-02-01&to=2026-02-28
                                        |
                                        v
                         CategoryDetailPage (useCategoryLineItems)
                                        |
                                        | Fetches receipts, extracts line_items
                                        | Filters items where category === 'groceries'
                                        v
                              Line Item List (sum === $70)
```

### Query Logic in `useCategoryLineItems`

```typescript
interface CategoryLineItem {
  id: string;                    // unique: `${receiptId}-${index}`
  receiptId: string;
  merchant: string;
  receiptDate: string;
  description: string;
  amount: number;
  category: string;
  parentHasMultipleItems: boolean;
  parentTotalAmount: number;
}

async function fetchCategoryLineItems(
  categoryName: string,
  startDate: Date,
  endDate: Date
): Promise<{ lineItems: CategoryLineItem[]; expectedTotal: number }> {
  
  // 1. Fetch receipts with line_items in date range
  const { data: receipts } = await supabase
    .from('receipts')
    .select('id, merchant, receipt_date, total_amount, line_items, groceries_amount, household_amount, clothing_amount, other_amount')
    .in('status', ['processed', 'reviewed'])
    .gte('receipt_date', format(startDate, 'yyyy-MM-dd'))
    .lte('receipt_date', format(endDate, 'yyyy-MM-dd'));

  // 2. Calculate expected total from category columns
  let expectedTotal = 0;
  const targetColumn = `${categoryName}_amount`;  // e.g., 'groceries_amount'
  receipts?.forEach(r => {
    expectedTotal += Number(r[targetColumn]) || 0;
  });

  // 3. Extract and filter line items
  const lineItems: CategoryLineItem[] = [];
  receipts?.forEach(receipt => {
    const items = receipt.line_items as LineItem[] | null;
    if (!items) return;
    
    items.forEach((item, index) => {
      if (item.category.toLowerCase() === categoryName.toLowerCase()) {
        lineItems.push({
          id: `${receipt.id}-${index}`,
          receiptId: receipt.id,
          merchant: receipt.merchant || 'Unknown',
          receiptDate: receipt.receipt_date || receipt.created_at,
          description: item.description,
          amount: item.amount,
          category: item.category,
          parentHasMultipleItems: items.length > 1,
          parentTotalAmount: receipt.total_amount || 0,
        });
      }
    });
  });

  // 4. Sort by date descending
  lineItems.sort((a, b) => 
    new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
  );

  return { lineItems, expectedTotal };
}
```

### Sanity Check

The page displays:
- **Header**: "Groceries - $70.00" (from category column sum)
- **Computed**: Sum of all displayed line items
- **Warning** (dev only): If `sum !== expectedTotal`, show "Category total mismatch" alert

### UI Structure

```text
+---------------------------------------+
|  < Back    Groceries     February     |
+---------------------------------------+
|  Category Total: $70.00               |
|  (6 items from 3 transactions)        |
+---------------------------------------+
|                                       |
|  [Row] Walmart - Feb 4                |
|        Bananas                  $3.50 |
|        [Split badge]                  |
|                                       |
|  [Row] Walmart - Feb 4                |
|        Milk 2%                  $4.99 |
|        [Split badge]                  |
|                                       |
|  [Row] Target - Feb 2                 |
|        Bread                    $2.50 |
|                                       |
|  ...                                  |
+---------------------------------------+
```

### Tap Behavior

When user taps a line item row:
1. Find the parent receipt by `receiptId`
2. Open `TransactionEditSheet` with that receipt
3. The sheet shows the full transaction (all line items, all categories)
4. User can edit and save
5. Changes don't affect what's displayed in category list (amounts are from line_items)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/CategoryDetailPage.tsx` | Create | New page for line item view |
| `src/hooks/useCategoryLineItems.ts` | Create | Hook to fetch/filter line items |
| `src/components/category/CategoryLineItemRow.tsx` | Create | Row component for line items |
| `src/App.tsx` | Modify | Add route for `/category/:categoryName` |
| `src/components/dashboard/CategoryBreakdownList.tsx` | Modify | Change navigation target |

---

## Edge Cases

1. **Receipt without line_items array**: Skip it (only show receipts with parsed items)
2. **Multiple items in same category from one receipt**: Show as separate rows
3. **Empty result**: Show friendly "No spending in this category" message
4. **Category name mismatch**: Normalize to lowercase for comparison

---

## Mobile Considerations

- Page uses `AppLayout` for consistent navigation
- Rows have 52px minimum tap target
- Pull-to-refresh support via `PullToRefresh` wrapper
- Back button navigates to Dashboard
- Bottom padding for floating nav (pb-28)

