# Project Roadmap

## Phase 1: Streamlined Capture Flow ✅ COMPLETED
- 1.1 Remove Inbox + Direct-to-Review
- 1.2 Enhanced Review Page
- 1.3 Simplified Mobile Nav

## Phase 2: Transactions & Data Management

| Order | Feature | Effort | Impact | Status |
|-------|---------|--------|--------|--------|
| 2.1 | Transactions Tab | Medium | Very High | Planned |
| 2.2 | Interactive Weekly Review Categories | Low | High | Planned |
| 2.3 | Unified Budget & Categories Page | Medium | High | Planned |
| 2.4 | Inbox Cleanup (remove all references) | Low | High | ✅ DONE |

---

## Phase 2.4: Inbox Cleanup - COMPLETED

All `inbox` references have been removed from the codebase:

| File | Change |
|------|--------|
| `src/types/receipt.ts` | Removed `'inbox'` from `ReceiptStatus` type |
| `src/pages/Dashboard.tsx` | Removed `handleProcessAll` function and "Process All" button |
| `src/components/receipt/MobileCameraCapture.tsx` | Changed navigation from `/inbox` to `/review` |
| `src/components/receipt/StatusBadge.tsx` | Removed `Inbox` icon import and `inbox` status config |
| `src/components/receipt/ReceiptCard.tsx` | Removed `status === 'inbox'` check |
| `src/hooks/useReceipts.ts` | Removed `inbox` from statusCounts, updated fallback to `'processing'` |

---

## Phase 3: Intelligence & Efficiency
- 3.1 Smart Category Suggestions (via line_item_history)
- 3.2 One-Tap Swipe Review

## Phase 4: Psychological Rewards
- 4.1 Spending Pulse Summary (3-number dashboard)
- 4.2 Wins & Progress Celebrations

## Phase 5: Effortless Reporting
- 5.1 Monthly Financial Snapshot (PDF/Summary)
- 5.2 Receipt Search

## Phase 6: Budget Automation
- 6.1 Budget Templates
- 6.2 Rollover Logic

---

## Recommended Build Order

| Order | Feature | Phase | Effort | Impact |
|-------|---------|-------|--------|--------|
| 1 | Remove Inbox + Direct-to-Review | 1.1 | Medium | Very High | ✅ |
| 2 | Enhanced Review Page | 1.2 | Medium | Very High | ✅ |
| 3 | Simplified Mobile Nav | 1.3 | Low | High | ✅ |
| 4 | Transactions Tab | 2.1 | Medium | Very High | |
| 5 | Interactive Review Categories | 2.2 | Low | High | |
| 6 | Unified Budget & Categories | 2.3 | Medium | High | |
| 7 | Inbox Cleanup | 2.4 | Low | High | ✅ |
| 8 | Spending Pulse Summary | 4.1 | Low | Very High | |
| 9 | Smart Category Suggestions | 3.1 | Medium | High | |
| 10 | One-Tap Swipe Review | 3.2 | Medium | High | |
