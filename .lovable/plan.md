

# Transaction List Feature

## Overview
This feature adds the ability to view all transactions from the budget page. Users can click on the "Spent" indicator to see all transactions for the current month, or click on any expense category to see only transactions for that specific category.

## What You'll Get
- Clickable "Spent" amount in the summary card that opens a transaction list modal showing all spending for the month
- Clickable category cards that filter the transaction list to show only that category's transactions
- A clean, sortable transaction list with merchant, date, amount, and category information
- Visual indicators showing which category filter is active

## User Experience

When viewing the budget page:
1. **Click on "Spent" in the summary** - Opens a dialog showing ALL transactions for the current month
2. **Click on any expense category card** - Opens a dialog showing only transactions for THAT category
3. In the dialog, users can see:
   - Transaction date
   - Merchant name
   - Amount
   - Category breakdown (for all-transactions view)
   - Total at the bottom

---

## Technical Details

### New Components

**1. `src/components/budget/TransactionListDialog.tsx`**
A new dialog component that displays transactions filtered by category and date range.

Key features:
- Accepts `categoryId` (optional), `month`, and `year` as props
- When no categoryId is passed, shows all transactions
- Queries receipts with status 'processed' or 'reviewed' within the date range
- Maps legacy category amounts to the selected category for filtering
- Displays transactions in a table format with sorting

**2. Updated `src/components/budget/BudgetManager.tsx`**
- Add state for tracking which category/view is selected (`selectedCategoryId`, `showTransactions`)
- Make the "Spent" indicator in the summary card clickable
- Make each expense category card clickable
- Render the TransactionListDialog when triggered

### Data Flow

```text
Budget Page
    |
    +-- Click "Spent" in summary ---> Open dialog with categoryId=null (all)
    |
    +-- Click category card --------> Open dialog with categoryId={selected}
    |
    v
TransactionListDialog
    |
    +-- Query receipts for month/year
    +-- Filter by categoryId if provided
    +-- Display in table format
```

### New Hook

**`src/hooks/useTransactionsByCategory.ts`**
A new hook to fetch transactions filtered by category and date:

```typescript
export function useTransactionsByCategory(
  categoryId: string | null,
  month: number,
  year: number
) {
  // Query receipts for the date range
  // Filter by category using legacy columns OR receipt_category_amounts
  // Return formatted transaction list
}
```

The hook will:
1. Fetch receipts with `status in (processed, reviewed)` for the given month/year
2. If categoryId is provided, filter to only include receipts that have spending in that category
3. Map legacy column names (groceries, household, etc.) to category IDs using the categories table
4. Return receipts with the specific amount for the selected category

### File Changes

**1. Create `src/hooks/useTransactionsByCategory.ts`**
- New hook for fetching filtered transactions
- Handles both legacy columns and new receipt_category_amounts table

**2. Create `src/components/budget/TransactionListDialog.tsx`**
- Dialog component with Table showing transactions
- Props: `open`, `onClose`, `categoryId`, `categoryName`, `month`, `year`
- Displays: date, merchant, category amount, total amount

**3. Update `src/components/budget/BudgetManager.tsx`**
- Add state: `showTransactions`, `selectedCategoryId`, `selectedCategoryName`
- Make "Spent" clickable in summary section
- Make expense category cards clickable
- Add cursor-pointer styles and hover effects
- Render TransactionListDialog

### UI Changes

Summary Card - Make "Spent" clickable:
```text
+--------------------------------------------------+
|  SUMMARY CARD                                     |
|  +-----------+  +-----------+  +---------------+ |
|  | Income    |  | Budgeted  |  | To Be Assigned| |
|  | $5,000    |  | $4,200    |  | $800          | |
|  +-----------+  +-----------+  +---------------+ |
|                                                   |
|  +------------------------------------------+    |
|  |    💰 $134.02 Spent    <- CLICKABLE      |    |
|  +------------------------------------------+    |
+--------------------------------------------------+
```

Expense Category Cards - Make entire card clickable:
```text
+---------------------------+
| 🥬 Groceries    <- CLICK  |
| $______                   |
| $54.52 spent / 15%        |  <- Shows transactions for Groceries
| [==>                   ]  |
+---------------------------+
```

Transaction List Dialog:
```text
+------------------------------------------------+
|  Groceries Transactions - January 2026         |
|  (or "All Transactions" if no category filter) |
+------------------------------------------------+
| Date       | Merchant        | Amount          |
|------------|-----------------|-----------------|
| Jan 30     | Shady Maple     | $28.00          |
| Jan 30     | Shady Maple     | $26.52          |
|------------|-----------------|-----------------|
|            | Total           | $54.52          |
+------------------------------------------------+
|                               [Close]          |
+------------------------------------------------+
```

### Styling
- Add `cursor-pointer` and hover effects to clickable elements
- Use subtle hover state (`hover:bg-muted/50`) for the spent indicator
- Category cards already have hover states, just need to add onClick
- Dialog uses existing shadcn Table component for consistent styling

