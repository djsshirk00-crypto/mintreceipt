

# Reports Page: Interactive Pie Chart

## Overview

Replace the category boxes/cards on the Reports page with an interactive pie chart for better visual spending breakdown.

---

## Changes

### Reports Page: Pie Chart Visualization

**File**: `src/components/receipt/SpendingReports.tsx`

**What changes**:
- Replace `DynamicCategorySummary` grid with a Recharts-based donut/pie chart
- Add interactive legend showing category icons, names, and amounts
- Keep click-to-drill-down functionality (tapping a slice or legend item navigates to category detail)
- Only show categories with spending > 0 in the pie chart

**Technical approach**:

1. **Pie Chart Data**: Convert spending categories to chart format
```tsx
const pieData = displayStats.categories
  .filter(c => c.amount > 0)
  .map(c => ({
    name: c.categoryName,
    value: c.amount,
    icon: c.icon,
    categoryData: c,
  }));
```

2. **Donut Chart**: Use inner radius for a modern donut style with center stats

3. **Custom Legend**: Interactive legend below the chart with:
   - Color indicator dot
   - Category icon and name
   - Amount and percentage
   - Tap to navigate to category detail

4. **Color Palette**: Consistent colors for each category slice

---

## UI Design

```
+----------------------------------------+
|  Spending Breakdown - February 2026    |
+----------------------------------------+
|                                        |
|           +-----------+                |
|         /    Total     \               |
|        |    $385.00    |               |
|        |               |               |
|         \             /                |
|           +---------+                  |
|                                        |
|  🥬 Groceries     42%         $161  →  |
|  🏠 Household     28%         $108  →  |
|  📦 Other         18%          $70  →  |
|  👕 Clothing      12%          $46  →  |
+----------------------------------------+
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/receipt/SpendingReports.tsx` | Replace category grid with pie chart + legend |

---

## Mobile Considerations

- Donut chart with center total display
- Legend items have 52px tap targets
- Tapping legend item navigates to category detail
- Responsive sizing with `ResponsiveContainer`

