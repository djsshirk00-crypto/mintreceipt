

# Phase 2.5: Mobile UX Improvements & Processing Timeout

## Overview

This update adds multiple mobile-focused UX improvements and implements a 3-minute processing timeout with retry/delete options.

| Feature | Priority | Effort | What It Does |
|---------|----------|--------|--------------|
| 2.5.1 Processing Timeout | High | Medium | Auto-fail receipts stuck > 3 minutes with retry/delete |
| 2.5.2 Review Page Mobile Optimization | High | Medium | Bottom sheet instead of modal, compact layout |
| 2.5.3 Menu Button to Header | Medium | Low | Move menu to top-right on mobile |
| 2.5.4 Budget Tab in Bottom Nav | Medium | Low | Add Budget/Categories to bottom nav |
| 2.5.5 Simplify Dashboard Capture UI | Medium | Low | Keep upload option, remove duplicate camera button |

---

## 2.5.1 Processing Timeout (3 Minutes)

### Problem
Currently, if a receipt gets stuck in "processing" status indefinitely (edge function failure, network issue, etc.), users have no way to recover. They see a spinning loader forever.

### Solution
Implement a 3-minute client-side timeout that:
1. Detects receipts stuck in "processing" for > 3 minutes
2. Shows them as "failed" with options to Retry or Delete
3. Updates the receipt status to "failed" in the database

### Implementation

**File: `src/hooks/useReceipts.ts`**
- Add `useProcessingTimeout` hook that:
  - Checks all "processing" receipts on an interval (every 30 seconds)
  - Compares `created_at` timestamp with current time
  - If > 3 minutes elapsed, marks receipt as "failed" with appropriate error message

**File: `src/pages/ReviewPage.tsx`**
- Update the "processing" overlay to show:
  - Retry button (re-triggers `process-receipt` edge function)
  - Delete button (removes the receipt)
- Use existing `useDeleteReceipt` and `useProcessReceipt` hooks

### User Flow
```text
Receipt uploaded → "Processing..." shown
     ↓
3 minutes elapsed, still processing
     ↓
Auto-mark as failed
     ↓
Show: "Processing timed out. [Retry] [Delete]"
```

---

## 2.5.2 Review Page Mobile Optimization

### Current Issues
- Uses `Dialog` (modal) which is not mobile-friendly
- Content overflows on small screens
- Touch targets are too small
- No swipe gestures

### Solution
Convert the review dialog to a **bottom sheet** on mobile using the existing `Sheet` component.

### Changes

**File: `src/pages/ReviewPage.tsx`**
- Wrap content in responsive container:
  - Mobile: Use `Sheet` with `side="bottom"`
  - Desktop: Keep existing `Dialog`
- Compact header on mobile (hide description)
- Stack image and details vertically on mobile
- Larger touch targets (52px minimum)
- Add "Skip" and "Accept" as fixed bottom buttons
- Make tabs scrollable horizontally if needed

### Mobile Layout
```text
┌────────────────────────────────────┐
│ Review Receipt            [X close]│
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │     [Receipt Image Preview]   │ │  ← Tappable to expand
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ Target                    $123.45  │
│ 2026-02-02                85% conf │
├────────────────────────────────────┤
│ [Line Items] [Categories]          │  ← Tab switcher
├────────────────────────────────────┤
│ 🥬 Produce - Apples      $4.50  ▼ │
│ 🥛 Dairy - Milk          $3.99  ▼ │  ← Tap category to change
│ ...                               │
├────────────────────────────────────┤
│   [Skip]              [Accept ✓]  │  ← Fixed bottom actions
└────────────────────────────────────┘
```

---

## 2.5.3 Menu Button to Top-Right Header

### Current State
- Mobile bottom nav has 4 items: Dashboard, Transactions, Review, Menu
- Menu button opens the drawer with Budget, Settings, etc.

### New Design
- Remove Menu from bottom nav
- Add hamburger menu icon to top-right of header (mobile only)
- This frees up space in bottom nav for Budget

### Changes

**File: `src/components/layout/AppLayout.tsx`**
- Add `Menu` icon button to header (right side, mobile only)
- Remove Menu item from `mobileNavItems` array
- Pass `setMenuOpen` to header section

### Visual
```text
┌────────────────────────────────────┐
│ 🧾 MintReceipt              [☰]   │  ← Menu button in header
├────────────────────────────────────┤
│            (page content)          │
├────────────────────────────────────┤
│  🏠    📋    ✓    💰              │  ← 4 tabs: Dashboard, Transactions, Review, Budget
└────────────────────────────────────┘
```

---

## 2.5.4 Add Budget to Bottom Navigation

### Changes

**File: `src/components/layout/AppLayout.tsx`**
- Update `mobileNavItems` array:
  ```javascript
  const mobileNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/transactions', label: 'Transactions', icon: Receipt },
    { path: '/review', label: 'Review', icon: CheckSquare },
    { path: '/budget', label: 'Budget', icon: Wallet }, // NEW
  ];
  ```
- Import `Wallet` icon from lucide-react

---

## 2.5.5 Simplify Dashboard Capture UI (Keep Upload Option)

### Current State
- Mobile dashboard shows `MobileCameraCapture` component with two large buttons:
  - "Take Photo" (camera) - duplicates FAB
  - "Upload" (gallery) - useful for screenshots/PDFs

### New Design
- **Remove** the "Take Photo" button (duplicates FAB)
- **Keep** the "Upload" button for screenshots and PDFs
- Simplified single-button UI on mobile dashboard
- Desktop still shows full `ReceiptUploader` dropzone

### Changes

**File: `src/components/receipt/MobileCameraCapture.tsx`**
- Remove the camera capture button
- Keep only the upload/gallery button
- Update component styling for single-button layout
- Update text to "Upload Screenshot or PDF"

### Mobile Dashboard Layout (After)
```text
┌────────────────────────────────────┐
│          📤 Upload                 │
│    Screenshot or PDF Receipt       │  ← Single upload button
└────────────────────────────────────┘

     [FAB Camera Button floats here]  ← For live camera capture
```

### Why Keep Upload?
- Screenshots of online orders/receipts
- PDF receipts from email
- Saved images from other apps
- These cannot be captured with the live camera

---

## Updated Roadmap

### Phase 2: Transactions & Data Management

| Order | Feature | Status |
|-------|---------|--------|
| 2.1 | Transactions Tab Enhancements | Complete |
| 2.2 | Interactive Weekly Review Categories | Complete |
| 2.3 | Unified Budget & Categories Page | Complete |
| 2.4 | Inbox Cleanup | Complete |
| **2.5.1** | **Processing Timeout (3 min fail)** | **New** |
| **2.5.2** | **Review Page Mobile Optimization** | **New** |
| **2.5.3** | **Menu Button to Header** | **New** |
| **2.5.4** | **Budget Tab in Bottom Nav** | **New** |
| **2.5.5** | **Simplify Dashboard Capture (Keep Upload)** | **New** |

---

## Technical Implementation Details

### Processing Timeout Hook

```typescript
// New hook: useProcessingTimeout
export function useProcessingTimeout() {
  const queryClient = useQueryClient();
  const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

  useEffect(() => {
    const checkTimeouts = async () => {
      // Query processing receipts
      const { data } = await supabase
        .from('receipts')
        .select('id, created_at')
        .eq('status', 'processing');

      if (!data) return;

      const now = Date.now();
      for (const receipt of data) {
        const createdAt = new Date(receipt.created_at).getTime();
        if (now - createdAt > TIMEOUT_MS) {
          // Mark as failed
          await supabase
            .from('receipts')
            .update({
              status: 'failed',
              error_message: 'Processing timed out after 3 minutes'
            })
            .eq('id', receipt.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    };

    const interval = setInterval(checkTimeouts, 30000); // Check every 30s
    checkTimeouts(); // Run immediately

    return () => clearInterval(interval);
  }, [queryClient]);
}
```

### Retry Processing

**File: `src/pages/ReviewPage.tsx`**
- Add "Retry" button for failed receipts
- Calls `useProcessReceipt` hook to re-trigger edge function
- Updates status back to "processing" and resets timeout

---

## Files to Modify

| Action | File |
|--------|------|
| Modify | `src/hooks/useReceipts.ts` (add timeout hook) |
| Modify | `src/pages/ReviewPage.tsx` (mobile optimization + retry/delete) |
| Modify | `src/components/layout/AppLayout.tsx` (menu to header, budget to nav) |
| Modify | `src/components/receipt/MobileCameraCapture.tsx` (remove camera, keep upload) |
| Modify | `.lovable/plan.md` (add Phase 2.5 items) |

---

## Mobile Optimization Checklist

| Requirement | Implementation |
|-------------|----------------|
| Bottom sheet for review | Use `Sheet` component with `side="bottom"` |
| 52px touch targets | All buttons use `min-h-[52px]` |
| Menu in header | Add hamburger icon to right side of header |
| Budget in bottom nav | Replace Menu with Budget tab |
| Keep upload option | Single "Upload Screenshot/PDF" button on dashboard |
| Processing timeout | 3-minute auto-fail with retry option |

