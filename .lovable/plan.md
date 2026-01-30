

# Add Delete Receipt Feature

This plan will add the ability to delete receipts you've uploaded by mistake. The delete button will appear on receipt cards with a confirmation dialog to prevent accidental deletions.

## What You'll Get

- A trash icon button on each receipt card
- A confirmation dialog asking "Are you sure?" before deleting
- Automatic cleanup of the receipt image from storage
- Removal of the receipt record from the database

## Implementation Steps

### 1. Add Delete Hook

Create a new `useDeleteReceipt` hook in `src/hooks/useReceipts.ts` that will:
- Delete the receipt image from storage (using the `image_path`)
- Delete the receipt record from the database
- Show a success/error notification
- Refresh the receipt list automatically

### 2. Update Receipt Card Component

Add a delete button to the `ReceiptCard` component:
- Small trash icon in the top-right corner
- Clicking opens a confirmation dialog
- Works on all receipt statuses (inbox, processed, reviewed, etc.)

### 3. Add Confirmation Dialog

Use the existing AlertDialog component to:
- Show the merchant name and date for context
- Require explicit confirmation before deletion
- Prevent accidental data loss

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useReceipts.ts` | Add `useDeleteReceipt` mutation hook |
| `src/components/receipt/ReceiptCard.tsx` | Add delete button with confirmation dialog |
| `src/pages/InboxPage.tsx` | Pass delete handler to ReceiptCard |
| `src/pages/ReviewPage.tsx` | Pass delete handler to ReceiptCard |

### Delete Hook Logic

```text
useDeleteReceipt mutation:
1. Get receipt's image_path
2. Delete from storage bucket "receipts" 
3. Delete from receipts table
4. Invalidate queries to refresh UI
5. Show toast notification
```

### UI Flow

```text
User clicks trash icon
       |
       v
Confirmation dialog appears:
"Delete this receipt?"
[Merchant name - Date]
"This cannot be undone."
       |
   [Cancel] [Delete]
       |
       v (if Delete clicked)
Receipt + image removed
Toast: "Receipt deleted"
```

