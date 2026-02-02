

# Adding Transactions Tab, Interactive Weekly Review & Simplified Navigation to Roadmap

I've analyzed the current codebase and will add your three features to the roadmap. Here's how they fit into the existing architecture:

---

## Current State Analysis

| Component | Current Implementation |
|-----------|----------------------|
| **Navigation** | 6 tabs in mobile bottom nav: Dashboard, Inbox, Review, Budget, Categories, Settings |
| **Transaction viewing** | Only via `TransactionListDialog` (modal popup from Budget/Dashboard) |
| **Weekly Review** | Shows category totals via `CategorySummaryGrid`, but not clickable/interactive |
| **Existing hooks** | `useTransactionsByCategory` already fetches transactions with filtering |

---

## New Features to Add

### Feature 1: Transactions Tab
**Priority**: 🔴 Critical | **Effort**: Medium | **Impact**: Very High

A dedicated page for viewing, searching, and re-categorizing all past transactions.

**Key capabilities**:
- Full transaction list sorted by date (most recent first)
- Each row shows: Merchant, Date, Amount, Category/Subcategory
- Tap to edit: Change category, subcategory, add notes
- Changes propagate to category totals, budget calculations, and reports
- URL-based filters: `/transactions?category=xxx&from=2024-01-01&to=2024-01-31`

**Technical approach**:
- Create new `TransactionsPage.tsx`
- Extend `useTransactionsByCategory` to support date range and search filters
- Build `TransactionEditSheet` (bottom sheet for mobile editing)
- Use URL search params to maintain filter state

---

### Feature 2: Interactive Weekly Review Categories
**Priority**: 🟡 High | **Effort**: Low | **Impact**: High

Make category cards clickable to drill down into filtered transactions.

**What happens when tapped**:
1. Navigate to `/transactions`
2. Auto-apply filters:
   - Category = selected category
   - Date range = current review week
3. Clear "Active filters" badge visible
4. Back navigation returns to Review page

**Technical approach**:
- Update `CategorySummaryCard` to accept `onClick` handler
- Use `useNavigate` with search params for deep linking
- Add `activeFilters` display component on Transactions page

---

### Feature 3: Simplified Mobile Navigation with Menu Drawer
**Priority**: 🟡 High | **Effort**: Medium | **Impact**: High

Reduce bottom nav clutter by moving secondary screens to a menu drawer.

**New bottom nav structure** (5 tabs):
| Tab | Icon | Destination |
|-----|------|-------------|
| Dashboard | Home | `/` |
| Inbox | Inbox | `/inbox` |
| Transactions | Receipt | `/transactions` |
| Review | CheckSquare | `/review` |
| Menu | Menu | Opens drawer |

**Menu drawer contents**:
- Categories
- Budget
- Settings
- Help / Support (future)
- Replay Tutorial
- Account / Sign Out

**Technical approach**:
- Create `MenuDrawer.tsx` using existing `Drawer` component
- Update `AppLayout.tsx` mobile nav with new structure
- Desktop nav remains unchanged (full horizontal nav)

---

## How These Features Connect

```text
┌──────────────────────────────────────────────────────────────┐
│                        USER FLOW                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Weekly Review                                                │
│  ┌─────────────────┐                                         │
│  │ Category Cards  │──tap──▶ /transactions?category=X&week=Y │
│  └─────────────────┘                                         │
│                                                               │
│  Transactions Tab                                             │
│  ┌─────────────────┐                                         │
│  │ Transaction Row │──tap──▶ Edit Sheet (category, notes)    │
│  └─────────────────┘                                         │
│           │                                                   │
│           └──save──▶ Updates category totals & budgets       │
│                                                               │
│  Bottom Nav                                                   │
│  ┌─────┬─────┬─────────────┬──────┬─────┐                    │
│  │Home │Inbox│Transactions │Review│ ≡   │                    │
│  └─────┴─────┴─────────────┴──────┴─────┘                    │
│                                      │                        │
│                                      └──▶ Menu Drawer         │
│                                           - Categories        │
│                                           - Budget            │
│                                           - Settings          │
│                                           - Help              │
└──────────────────────────────────────────────────────────────┘
```

---

## Updated Roadmap Position

I'll add these to the roadmap in **Phase 6: Core UX Restructure** as they fundamentally improve navigation and transaction management:

| Order | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 1 | Transactions Tab | Medium | Very High |
| 2 | Interactive Weekly Review | Low | High |
| 3 | Simplified Mobile Nav + Menu | Medium | High |

These should be built **before** Phase 1-5 items since they establish the core navigation structure that other features will use.

---

## Technical Notes

**Re-categorization safety**:
- Updates go through existing `updateReceipt` mutation
- Receipt totals are recalculated from line items
- `receipt_category_amounts` table is updated atomically
- No duplicate transactions possible (single source of truth)

**Navigation state persistence**:
- Using React Router's `useSearchParams` for filter state
- Back button works correctly via browser history
- Filter state survives page refresh

**Menu drawer vs bottom sheet**:
- Using the existing `Drawer` component (vaul-based)
- Slides up from bottom on mobile
- Contains grouped menu items with icons
- Includes destructive actions (sign out) at bottom

---

## Files to Create/Modify

**New files**:
- `src/pages/TransactionsPage.tsx` - Main transactions list
- `src/components/transactions/TransactionEditSheet.tsx` - Edit bottom sheet
- `src/components/layout/MenuDrawer.tsx` - Navigation menu drawer
- `src/hooks/useTransactions.ts` - Extended hook with filters

**Modified files**:
- `src/App.tsx` - Add `/transactions` route
- `src/components/layout/AppLayout.tsx` - Update mobile nav
- `src/components/receipt/CategorySummaryCard.tsx` - Add click handlers
- `src/pages/ReviewPage.tsx` - Wire up category navigation
- `.lovable/plan.md` - Updated roadmap

