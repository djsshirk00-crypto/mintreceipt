
# Phase 2: Complete Implementation Plan

## Overview

This plan implements all remaining Phase 2 features, optimized for mobile-first design:

| Feature | Status | What It Does |
|---------|--------|--------------|
| 2.1 Transactions Tab | Already exists, needs enhancements | Full transaction history with search/filter |
| 2.2 Interactive Weekly Review Categories | New | Tap category cards to deep-link to Transactions |
| 2.3 Unified Budget & Categories Page | New | Combine separate pages into one |
| 2.4 Inbox Cleanup | Complete | Already done |

---

## 2.1 Transactions Tab Enhancements

The Transactions page exists but needs mobile optimization and better filtering.

### Current Issues
- Header is not mobile-optimized (too verbose)
- Filter chips need better mobile tap targets
- Missing quick date filter buttons

### Changes

**File: `src/pages/TransactionsPage.tsx`**
- Compact header for mobile (hide description)
- Add quick date filter pills: "Today", "This Week", "This Month"
- Increase touch targets on filter badges (min 44px)
- Add pull-to-refresh support
- Improve empty state messaging

---

## 2.2 Interactive Weekly Review Categories

Make the spending category cards in `SpendingReports.tsx` clickable, navigating to Transactions with pre-applied filters.

### User Flow
1. User views Dashboard spending breakdown
2. Taps "Groceries" card showing $150
3. Navigates to `/transactions?category=groceries&from=2026-01-27&to=2026-02-02`
4. Sees all grocery transactions for that period

### Changes

**File: `src/components/receipt/DynamicCategorySummary.tsx`**
- Accept `onCategoryClick` callback prop
- Navigate to Transactions with category + date range filters

**File: `src/components/receipt/SpendingReports.tsx`**
- Pass `onClick` handler to `DynamicCategorySummaryCard`
- Use `useNavigate` with computed date range based on current time period

---

## 2.3 Unified Budget & Categories Page

This is the largest change - combining two pages into one mobile-optimized interface.

### New Architecture

```text
BudgetPage (/budget)
└── BudgetCategoriesManager (new unified component)
    ├── Header + Mode Toggle (Budget/Manage)
    ├── Month Navigation (Budget mode only)
    ├── Summary Cards (2x2 grid)
    ├── Income Section (collapsible)
    │   └── Income rows with Projected/Actual inputs
    ├── Expense Section (collapsible)  
    │   └── Expense rows (tappable → opens detail sheet)
    ├── CategoryBudgetDetailSheet (new bottom sheet)
    │   ├── Budget input inline
    │   ├── Spending progress bar
    │   ├── Subcategories list with mini-budgets
    │   └── "View Transactions" button
    ├── CategoryFormDialog (existing)
    └── Floating Save Button
```

### Files to Create

**1. `src/components/budget/CategoryBudgetDetailSheet.tsx`**
- Bottom sheet for viewing/editing a single category
- Shows: icon, name, budget input, spending progress, subcategories
- Actions: Edit category, Add subcategory, View transactions
- Inline budget editing with auto-save indicator

**2. Modify `src/components/budget/BudgetManager.tsx`**
- Rename to `BudgetCategoriesManager`
- Add "Manage" mode toggle in header
- In Budget mode: Show budget inputs, progress bars, spending
- In Manage mode: Show drag handles, edit/delete icons, add buttons
- Tapping a category row opens `CategoryBudgetDetailSheet`
- Add "Add Expense Category" / "Add Income Category" buttons

### Files to Delete

**`src/pages/CategoriesPage.tsx`**
- All functionality moves to unified page

### Files to Modify

**`src/App.tsx`**
- Remove `/categories` route
- Keep `/budget` route pointing to unified page

**`src/components/layout/MenuDrawer.tsx`**
- Remove "Categories" menu item
- Rename "Budget" to "Budget & Categories"

**`src/components/layout/AppLayout.tsx`**
- Update desktop nav: Remove Categories link, rename Budget to "Budget & Categories"

**`src/pages/BudgetPage.tsx`**
- Update title to "Budget & Categories"
- Update description

**`.lovable/plan.md`**
- Mark 2.1, 2.2, 2.3 as complete

---

## Mobile Optimization Checklist

All components will follow these guidelines:

| Requirement | Implementation |
|-------------|----------------|
| 52px minimum tap targets | All buttons, list items use `min-h-[52px]` |
| Collapsible sections | Income/Expense sections collapse to reduce scroll |
| Bottom sheets over modals | Use `Sheet` with `side="bottom"` for details |
| Safe area padding | Apply `safe-area-bottom` class to fixed elements |
| Compact headers | Hide descriptions on mobile using `useIsMobile()` |
| Floating actions | Save button floats above bottom nav |
| Pull-to-refresh | Support on Transactions page |

---

## Component Details

### CategoryBudgetDetailSheet

```text
┌────────────────────────────────────┐
│  🛒 Groceries           [⋮ menu]   │
├────────────────────────────────────┤
│  MONTHLY BUDGET                    │
│  ┌────────────────────────────┐    │
│  │ $  [    400    ]           │    │
│  └────────────────────────────┘    │
│                                    │
│  SPENDING                          │
│  ████████████░░░░░░  $250 of $400  │
│  $150 remaining                    │
│                                    │
│  ─────────────────────────────     │
│  SUBCATEGORIES                     │
│  ┌────────────────────────────┐    │
│  │ 🥬 Produce              $80│    │
│  │ 🥛 Dairy                $45│    │
│  │ 🍖 Meat                 $65│    │
│  └────────────────────────────┘    │
│                                    │
│  [+ Add Subcategory]               │
├────────────────────────────────────┤
│        [View Transactions]         │
└────────────────────────────────────┘
```

### Unified Page Header with Mode Toggle

```text
┌────────────────────────────────────┐
│ Budget & Categories    [Manage ON] │
└────────────────────────────────────┘
```

- "Manage" button toggles between modes
- Shows "ON" badge when in manage mode
- In Manage mode: edit/delete icons appear, add buttons visible

---

## Navigation Updates

### Menu Drawer (After)

```text
├── Budget & Categories    ← Single combined item
├── Settings
├── ─────────────────
├── Replay Tutorial
├── Help & Support
├── ─────────────────
├── Account
└── Sign Out
```

### Desktop Sidebar (After)

```text
Dashboard
Transactions
Review
Budget & Categories    ← Combined
Settings
```

---

## Implementation Order

1. **Phase 2.2** - Interactive Categories (quick win)
   - Update `DynamicCategorySummary.tsx` with onClick
   - Update `SpendingReports.tsx` to navigate

2. **Phase 2.1** - Transactions Enhancements
   - Mobile-optimize `TransactionsPage.tsx`
   - Add quick date filter pills

3. **Phase 2.3** - Unified Page (largest change)
   - Create `CategoryBudgetDetailSheet.tsx`
   - Refactor `BudgetManager.tsx` with manage mode
   - Delete `CategoriesPage.tsx`
   - Update routing and navigation

4. **Update Roadmap**
   - Mark all Phase 2 items complete

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/budget/CategoryBudgetDetailSheet.tsx` |
| Modify | `src/components/budget/BudgetManager.tsx` |
| Modify | `src/components/receipt/DynamicCategorySummary.tsx` |
| Modify | `src/components/receipt/SpendingReports.tsx` |
| Modify | `src/pages/TransactionsPage.tsx` |
| Modify | `src/pages/BudgetPage.tsx` |
| Modify | `src/components/layout/MenuDrawer.tsx` |
| Modify | `src/components/layout/AppLayout.tsx` |
| Modify | `src/App.tsx` |
| Modify | `.lovable/plan.md` |
| Delete | `src/pages/CategoriesPage.tsx` |

---

## Technical Notes

### State Management
- Budget inputs remain in local state until saved
- "Dirty" state triggers floating save button
- Manage mode stored in component state (resets on navigation)

### URL-Based Filtering
- Transactions page reads `?category=X&from=Y&to=Z` params
- Category can be ID or name (case-insensitive match)
- Date format: `YYYY-MM-DD`

### Category-Budget Relationship
- Each category can have one budget per month/year
- Subcategories do not have separate budgets (roll up to parent)
- Spending calculated from `receipt_category_amounts` + legacy columns
