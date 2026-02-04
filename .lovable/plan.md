

# Enable Line Item Editing in Transaction Edit Sheet

## Overview

Add the ability to view and edit individual line items when editing a transaction from the Transactions page, matching the experience users have during the initial receipt review.

---

## Current vs Proposed

| Current | Proposed |
|---------|----------|
| Can only edit total amount | Can edit individual line items |
| Single category for entire receipt | Per-item category selection |
| No line items visible | Line items displayed in a tab |
| Category changes don't affect line items | Line item changes recalculate category totals |

---

## Changes Required

### File: `src/components/transactions/TransactionEditSheet.tsx`

**Add Line Items Editing:**

1. **Import additional dependencies:**
   - `LineItemsDisplay` component
   - `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` from UI
   - `LineItem`, `Category`, `CATEGORY_CONFIG` from types
   - `List` icon from lucide-react

2. **Add state for line items:**
   - `editedLineItems` - tracks modified line items
   - Initialize from `receipt.line_items` when receipt changes

3. **Add helper functions:**
   - `recalculateCategoryTotals()` - sums amounts by category from line items
   - `handleLineItemCategoryChange()` - updates a single item's category and recalculates totals
   - `saveLineItemHistory()` - saves edited items for AI learning (same logic as ReviewPage)

4. **Update UI structure:**
   - Add Tabs component with "Details" and "Line Items" tabs
   - Details tab: existing merchant, date, amount, category fields
   - Line Items tab: `LineItemsDisplay` with `editable={true}`
   - Show message when line items have been modified

5. **Update handleSave:**
   - If line items were edited, save them to the receipt
   - Recalculate category amounts from line items
   - Save to line_item_history for AI learning

---

## Detailed Implementation

### State Changes

```tsx
// Add to component state
const [editedLineItems, setEditedLineItems] = useState<LineItem[] | null>(null);

// In useEffect when receipt changes
setEditedLineItems(receipt?.line_items ? [...receipt.line_items] : null);
```

### Helper Functions

```tsx
// Recalculate category totals from line items
const recalculateCategoryTotals = (items: LineItem[]) => {
  const totals = { groceries_amount: 0, household_amount: 0, clothing_amount: 0, other_amount: 0 };
  items.forEach(item => {
    const key = `${item.category}_amount` as keyof typeof totals;
    if (key in totals) {
      totals[key] += item.amount;
    }
  });
  return totals;
};

// Handle category change for a line item
const handleLineItemCategoryChange = (index: number, newCategory: string) => {
  if (!editedLineItems) return;
  
  const updated = [...editedLineItems];
  updated[index] = { ...updated[index], category: newCategory as Category };
  setEditedLineItems(updated);
};

// Save line items to history for AI learning
const saveLineItemHistory = async (items: LineItem[]) => {
  // Same implementation as ReviewPage
};
```

### Updated Save Logic

```tsx
const handleSave = async () => {
  if (!receipt) return;

  const lineItemsChanged = editedLineItems && 
    JSON.stringify(editedLineItems) !== JSON.stringify(receipt.line_items);

  let categoryAmounts;
  let lineItemsToSave = undefined;

  if (lineItemsChanged && editedLineItems) {
    // Use recalculated totals from line items
    categoryAmounts = recalculateCategoryTotals(editedLineItems);
    lineItemsToSave = editedLineItems;
    
    // Save to history for AI learning
    await saveLineItemHistory(editedLineItems);
  } else {
    // Use form category (existing behavior)
    const amount = parseFloat(formData.total_amount) || 0;
    const categoryName = formData.category.toLowerCase();
    categoryAmounts = {
      groceries_amount: categoryName === 'groceries' ? amount : 0,
      household_amount: categoryName === 'household' ? amount : 0,
      clothing_amount: categoryName === 'clothing' ? amount : 0,
      other_amount: !['groceries', 'household', 'clothing'].includes(categoryName) ? amount : 0,
    };
  }

  await updateReceipt.mutateAsync({
    id: receipt.id,
    updates: {
      merchant: formData.merchant,
      receipt_date: formData.receipt_date,
      total_amount: parseFloat(formData.total_amount) || 0,
      ...categoryAmounts,
      ...(lineItemsToSave && { line_items: lineItemsToSave }),
    },
  });
  
  onOpenChange(false);
};
```

### UI Structure

```tsx
<Tabs defaultValue="details" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="line-items" className="gap-1">
      <List className="h-4 w-4" />
      Items
      {hasLineItemChanges && <span className="w-2 h-2 rounded-full bg-primary" />}
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="details" className="space-y-4 mt-4">
    {/* Existing: Merchant, Date, Amount, Category fields */}
  </TabsContent>
  
  <TabsContent value="line-items" className="mt-4">
    {editedLineItems && editedLineItems.length > 0 ? (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Tap a category to change it. Changes help the AI learn!
        </p>
        <LineItemsDisplay 
          lineItems={editedLineItems} 
          editable={true}
          onItemCategoryChange={handleLineItemCategoryChange}
          categories={categories}
        />
        {hasLineItemChanges && (
          <p className="text-xs text-primary mt-2">
            ✓ Category changes will be saved
          </p>
        )}
      </div>
    ) : (
      <div className="text-center py-8 text-muted-foreground">
        No line items available for this transaction.
      </div>
    )}
  </TabsContent>
</Tabs>
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/transactions/TransactionEditSheet.tsx` | Add tabs UI, line items state, category change handler, AI history saving |

---

## User Experience

1. User opens a transaction from Transactions page
2. Sheet opens with **Details** tab (current experience)
3. User taps **Items** tab to see line items
4. Each line item shows description, category dropdown, and amount
5. User can change any item's category
6. Dot indicator appears on tab when changes are pending
7. User taps **Save Changes**
8. Category totals are recalculated from line items
9. Line item history is saved for AI learning

---

## Mobile Considerations

- Tabs have 52px minimum touch targets
- Line items remain scrollable within the sheet
- Category dropdowns open as full-width popovers on mobile
- Visual feedback when items are modified

