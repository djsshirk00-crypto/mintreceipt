
# Enhanced Dashboard Visualizations

## Overview

Add progress bars to the category legend items and implement a "this week vs last week" comparison view in the spending trends chart.

---

## Changes

### 1. Category Progress Bars in Spending Breakdown

**File**: `src/components/dashboard/SpendingBreakdownCard.tsx`

**What changes**:
- Add a thin progress bar below each category row in the legend
- For categories WITH a budget: Show progress toward budget (% used)
- For categories WITHOUT a budget: Show progress as % of total spending
- Use category color for the progress bar fill
- Handle over-budget case with full bar + red color

**Visual layout**:
```
  🥬 Groceries    42%    $161    $39 left   →
  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░   80% of budget
  
  🏠 Household    28%    $108    $42 over   →
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   100%+ (red)
  
  👕 Clothing     18%     $70               →
  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░   18% of total
```

---

### 2. This Week vs Last Week Comparison

**File**: `src/components/dashboard/SpendingTrendsCard.tsx`

**What changes**:
- Fetch both this week and last week data when in "weekly" view
- Add a second "shadow" line for last week's spending
- Use lower opacity and dashed stroke for the comparison line
- Add legend indicators for "This Week" vs "Last Week"

**Visual layout**:
```
+----------------------------------------+
|  Spending Trends      [Weekly|Monthly] |
+----------------------------------------+
|    ^                                   |
|    |     ●━━━━━●━━━●  This Week         |
|    |   ○╌╌╌╌╌○╌╌╌╌○    Last Week        |
|    |                                   |
|    +---------------------------------> |
|    Mon  Tue  Wed  Thu  Fri  Sat  Sun   |
+----------------------------------------+
```

**Data structure**:
- Create a new hook or modify existing to fetch daily spending for current and previous week
- Merge into chart data with `thisWeek` and `lastWeek` keys

---

## Technical Details

### Progress Bar Implementation

```tsx
// In BudgetAwareLegend component
<div className="mt-1 w-full">
  <Progress 
    value={entry.budget ? Math.min((entry.value / entry.budget) * 100, 100) : entry.percentage}
    className="h-1.5"
    style={{ 
      '--progress-color': entry.isOverBudget ? 'hsl(var(--destructive))' : entry.color 
    }}
  />
</div>
```

### Dual Line Chart Implementation

```tsx
// Two Line components in the chart
<Line 
  type="monotone" 
  dataKey="lastWeek" 
  stroke="hsl(var(--muted-foreground))"
  strokeWidth={1.5}
  strokeDasharray="4 4"
  dot={false}
  opacity={0.5}
/>
<Line 
  type="monotone" 
  dataKey="thisWeek" 
  stroke="hsl(var(--primary))"
  strokeWidth={2}
  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
/>
```

### New Hook: `useDailyWeeklyComparison`

**File**: `src/hooks/useSpendingStats.ts`

Returns data in format:
```typescript
[
  { day: 'Mon', thisWeek: 45, lastWeek: 32 },
  { day: 'Tue', thisWeek: 28, lastWeek: 55 },
  // ...
]
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/SpendingBreakdownCard.tsx` | Add Progress bar to each legend item |
| `src/components/dashboard/SpendingTrendsCard.tsx` | Add dual-line chart with this/last week comparison |
| `src/hooks/useSpendingStats.ts` | Add `useDailyWeeklyComparison` hook |

---

## Mobile Considerations

- Progress bars are thin (h-1.5) to not add excessive height
- Legend items maintain 52px minimum tap targets
- Chart legend for "This Week" / "Last Week" shown above the chart
