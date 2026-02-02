

# Add Inbox Cleanup to Phase 2 Roadmap

## Overview

Remove all remaining `inbox` references from the codebase. The Inbox page was deleted in Phase 1, but several components still reference the now-obsolete status.

---

## Issues Found (Complete List)

| File | Line | Issue |
|------|------|-------|
| `src/pages/Dashboard.tsx` | 25-31 | `handleProcessAll` filters for `status === 'inbox'` - orphaned logic |
| `src/components/receipt/MobileCameraCapture.tsx` | 62 | Navigates to `/inbox` instead of `/review` |
| `src/components/receipt/StatusBadge.tsx` | 3, 15-18 | Imports `Inbox` icon, has `inbox` status config |
| `src/components/receipt/ReceiptCard.tsx` | 155 | Checks `status === 'inbox'` |
| `src/hooks/useReceipts.ts` | 64, 125, 254 | References `inbox` status in multiple places |
| `src/types/receipt.ts` | 1 | `ReceiptStatus` type includes `'inbox'` |

---

## Phase 2 Addition: 2.4 Inbox Cleanup

**Priority**: High | **Effort**: Low | **Impact**: High (code hygiene)

### Changes Required

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Remove `handleProcessAll` function entirely (lines 22-36), remove "Process All" button |
| `src/components/receipt/MobileCameraCapture.tsx` | Change `navigate('/inbox')` to `navigate('/review')` |
| `src/components/receipt/StatusBadge.tsx` | Remove `Inbox` icon import, remove `inbox` status config |
| `src/components/receipt/ReceiptCard.tsx` | Remove `status === 'inbox'` check |
| `src/hooks/useReceipts.ts` | Remove `inbox` from statusCounts, update fallback status to `'processing'` |
| `src/types/receipt.ts` | Remove `'inbox'` from `ReceiptStatus` type |

---

## Updated Phase 2 in Roadmap

### Phase 2: Transactions & Data Management

| Order | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 2.1 | Transactions Tab | Medium | Very High |
| 2.2 | Interactive Weekly Review Categories | Low | High |
| 2.3 | Unified Budget & Categories Page | Medium | High |
| **2.4** | **Inbox Cleanup (remove all references)** | **Low** | **High** |

---

## Dashboard After Cleanup

The Dashboard will:
- Remove the "Process All" button (no longer needed - processing is automatic)
- Keep the 3 status cards: "Ready for Review", "Reviewed", "Failed"
- No longer track or display inbox-related counts

---

## Files to Modify

| Action | File |
|--------|------|
| Modify | `src/types/receipt.ts` |
| Modify | `src/pages/Dashboard.tsx` |
| Modify | `src/components/receipt/MobileCameraCapture.tsx` |
| Modify | `src/components/receipt/StatusBadge.tsx` |
| Modify | `src/components/receipt/ReceiptCard.tsx` |
| Modify | `src/hooks/useReceipts.ts` |
| Modify | `.lovable/plan.md` |

---

## Updated Recommended Build Order

| Order | Feature | Phase | Effort | Impact |
|-------|---------|-------|--------|--------|
| 1 | Remove Inbox + Direct-to-Review | 1.1 | Medium | Very High |
| 2 | Enhanced Review Page | 1.2 | Medium | Very High |
| 3 | Simplified Mobile Nav | 1.3 | Low | High |
| 4 | Transactions Tab | 2.1 | Medium | Very High |
| 5 | Interactive Review Categories | 2.2 | Low | High |
| 6 | Unified Budget & Categories | 2.3 | Medium | High |
| **7** | **Inbox Cleanup** | **2.4** | **Low** | **High** |
| 8 | Spending Pulse Summary | 4.1 | Low | Very High |
| ... | (rest unchanged) | ... | ... | ... |

