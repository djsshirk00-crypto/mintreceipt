
# Dashboard & Reports Reorganization

## Overview

A comprehensive reorganization of financial visualizations across Dashboard, Budget, and Reports pages with enhanced category legend showing budget remaining.

---

## Summary of Changes

| Component | From | To |
|-----------|------|-----|
| Spending Breakdown (pie chart) | Reports page | Dashboard (below QuickActions) |
| Weekly/Monthly Trend Charts | Bar charts (Reports) | Line graphs with toggle (Dashboard, below pie chart) |
| Financial Pulse (Income/Spent/Left) | Dashboard | Budget page (top) |
| Income vs Spent visual (SpendingOverviewCard) | Dashboard | Reports page |

---

## Detailed Changes

### 1. Dashboard Reorganization

**File**: `src/pages/Dashboard.tsx`

**New Order**:
1. Header
2. QuickActions (upload buttons)
3. **NEW: Spending Breakdown pie chart** (extracted from SpendingReports)
4. **NEW: Spending Trends line chart** (weekly/monthly toggle)
5. PendingReviewAlert
6. CategoryBreakdownList

**Components to add/create**:
- Create `SpendingBreakdownCard` - pie chart with budget-aware legend
- Create `SpendingTrendsCard` - line graph with week/month toggle

---

### 2. Enhanced Category Legend with Budget Remaining

**New Feature in Pie Chart Legend**:
- For categories WITH a budget: Show "$ remaining" or "$ over"
- For categories WITHOUT a budget: Show just the amount spent (current behavior)

```
Legend Row Examples:
  🥬 Groceries    42%    $161    $39 left   →
  🏠 Household    28%    $108    $42 over   →
  👕 Clothing     18%     $70               →  (no budget)
```

**Data needed**:
- Fetch budgets for current month alongside spending stats
- Calculate remaining = budget.amount - category.spent

---

### 3. Spending Trends Line Graph

**New Component**: `src/components/dashboard/SpendingTrendsCard.tsx`

**Features**:
- Toggle button: "Weekly" | "Monthly"
- Line chart (not bar chart)
- Uses existing `useWeeklyTrend` and `useMonthlyTrend` hooks
- Recharts `LineChart` with `Line`, `XAxis`, `Tooltip`

```
+----------------------------------------+
|  Spending Trends      [Weekly|Monthly] |
+----------------------------------------+
|    ^                                   |
|    |         •                         |
|    |       /   \     •                 |
|    |      •     \   /                  |
|    |             •                     |
|    +---------------------------------> |
|    Jan   Feb   Mar   Apr   May   Jun   |
+----------------------------------------+
```

---

### 4. Budget Page Update

**File**: `src/pages/BudgetPage.tsx`

**Add**: FinancialPulse component at top of page

```tsx
import { FinancialPulse } from '@/components/dashboard/FinancialPulse';

// Add after header, before BudgetCategoriesManager
<FinancialPulse />
```

---

### 5. Reports Page Update

**File**: `src/pages/ReportsPage.tsx` and `src/components/receipt/SpendingReports.tsx`

**Changes**:
- Add `SpendingOverviewCard` (Income vs Spent visual) to Reports
- Remove the pie chart (moved to Dashboard)
- Keep time period selector
- Keep summary cards (Total Spent, Receipts, Trend)
- Remove weekly/monthly bar charts (moved to Dashboard as line graphs)

---

## New Components to Create

### `src/components/dashboard/SpendingBreakdownCard.tsx`

- Donut pie chart with center total
- Budget-aware legend showing remaining for budgeted categories
- Click to drill-down to category detail
- Uses `useSpendingStats('this-month')` and `useBudgetsWithSpending`

### `src/components/dashboard/SpendingTrendsCard.tsx`

- Week/Month toggle
- Recharts `LineChart`
- Uses existing `useWeeklyTrend` and `useMonthlyTrend` hooks

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Remove FinancialPulse & SpendingOverviewCard, add SpendingBreakdownCard & SpendingTrendsCard |
| `src/pages/BudgetPage.tsx` | Add FinancialPulse at top |
| `src/pages/ReportsPage.tsx` | Add SpendingOverviewCard |
| `src/components/receipt/SpendingReports.tsx` | Remove pie chart, keep summary cards & time selector |
| `src/components/dashboard/SpendingBreakdownCard.tsx` | **NEW** - Pie chart with budget-aware legend |
| `src/components/dashboard/SpendingTrendsCard.tsx` | **NEW** - Line graph with toggle |

---

## Technical Details

### Budget-Aware Legend Logic

```typescript
interface LegendItem {
  name: string;
  icon: string;
  spent: number;
  percentage: number;
  budget?: number;      // from useBudgetsWithSpending
  remaining?: number;   // budget - spent (if budgeted)
  isOverBudget?: boolean;
}

// In CustomLegend:
{entry.budget ? (
  <span className={entry.isOverBudget ? 'text-destructive' : 'text-success'}>
    ${Math.abs(entry.remaining)} {entry.isOverBudget ? 'over' : 'left'}
  </span>
) : null}
```

### Line Chart Implementation

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<LineChart data={trendData}>
  <XAxis dataKey="label" />
  <YAxis tickFormatter={(v) => `$${v}`} />
  <Tooltip formatter={(value) => [`$${value}`, 'Spent']} />
  <Line 
    type="monotone" 
    dataKey="total" 
    stroke="hsl(var(--primary))"
    strokeWidth={2}
    dot={{ fill: 'hsl(var(--primary))' }}
  />
</LineChart>
```

---

## Mobile Considerations

- Pie chart maintains 60px inner radius for center total
- Legend items maintain 52px tap targets
- Toggle buttons are full-width on mobile
- All cards use responsive padding

