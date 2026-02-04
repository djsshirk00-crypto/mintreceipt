

# Enhanced Mobile Dashboard with Clickable Analytics

## Vision

Transform the Dashboard into a **financial command center** where every element is tappable, leading to deeper insights. Add an **Income vs Spend Visualization** inspired by your reference images - featuring period toggles (Week/Month/Quarter/Year), visual bar charts comparing income and spending, and expandable summary rows.

---

## Key Enhancements

### 1. Every Dashboard Element is Clickable

| Element | Tap Action | Destination |
|---------|------------|-------------|
| Financial Pulse (Income) | View income breakdown | `/budget?filter=income` |
| Financial Pulse (Spent) | View spending details | `/transactions?range=this-month` |
| Financial Pulse (Remaining) | View budget status | `/budget` |
| Progress Bar | View overall budget | `/budget` |
| Quick Actions - Add Receipt | Open file picker | Upload flow |
| Quick Actions - Manual Entry | Open form | Manual transaction form |
| Pending Review Alert | Review receipts | `/review` |
| Category Cards | View category transactions | `/transactions?category=X` |
| "View Reports" link | Full analytics | `/reports` |

### 2. Income vs Spend Visualization (New Component)

Based on your reference images, add a **SpendingOverviewCard** widget:

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│   [ Week ] [ Month ] [ Quarter ] [ Year ]       │  ← Period toggles
│                                                 │
│   ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐    │
│   │   │  │ ■ │  │ ■ │  │   │  │   │  │   │    │  ← Year bars
│   │   │  │ ■ │  │ ■ │  │   │  │   │  │   │    │    (Income solid,
│   └───┘  └───┘  └───┘  └───┘  └───┘  └───┘    │     Spend dotted)
│   2020   2021   2022   2023   2024   2025      │
│                                                 │
│   ● Income  ⬚ Total Spend                      │  ← Legend
│                                                 │
├─────────────────────────────────────────────────┤
│  💰 Income            $3,200         →         │  ← Clickable rows
├─────────────────────────────────────────────────┤
│  💸 Total Spend       $1,847         ▼         │  ← Expandable
├─────────────────────────────────────────────────┤
│  ⊖ Net Income         $1,353         ⓘ         │  ← Color coded
└─────────────────────────────────────────────────┘
```

**Features:**
- Period selector: Week / Month / Quarter / Year
- Horizontal scrollable bar chart showing income vs spend per period
- Clickable summary rows:
  - **Income** → navigates to `/budget?filter=income`
  - **Total Spend** → expands to show category breakdown, or navigates to `/transactions`
  - **Net Income** → shows tooltip with calculation
- Color-coded net income (green if positive, red if negative)

### 3. Dashboard Location

Add the SpendingOverviewCard **below the Financial Pulse** on the Dashboard, making it the primary data visualization users see. Move the detailed charts (weekly/monthly trends) to the Reports page.

---

## New Dashboard Structure

```text
┌─────────────────────────────────────────────────┐
│  Dashboard                               [☰]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────── Financial Pulse ──────────┐       │
│  │  Income     Spent      Left         │       │  ← All 3 tappable
│  │  $3,200     $1,847     $1,353       │       │
│  │  [■■■■■■■■■■░░░░░░░░] 58%           │       │  ← Progress tappable
│  └─────────────────────────────────────┘       │
│                                                 │
│  ┌─────── Quick Actions ───────────────┐       │
│  │  📤 Add Receipt    ✏️ Manual Entry  │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  ┌─────── Pending Alert ───────────────┐       │
│  │  ⚠️ 2 receipts ready for review  →  │       │  ← Tappable
│  └─────────────────────────────────────┘       │
│                                                 │
│  ┌─────── Spending Overview ───────────┐       │  ← NEW COMPONENT
│  │  [Week] [Month] [Quarter] [Year]    │       │
│  │  📊 Bar chart (scrollable)          │       │
│  │  ─────────────────────────────────  │       │
│  │  💰 Income         $3,200      →    │       │  ← Clickable
│  │  💸 Total Spend    $1,847      ▼    │       │  ← Expandable
│  │  ⊖ Net Income      $1,353      ⓘ    │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  Spending by Category  [View Reports →] [▼]    │  ← Collapsible
│  ┌─────────────────────────────────────┐       │
│  │ 🥬 Groceries    $450         →      │       │  ← All clickable
│  │ 🏠 Household    $320         →      │       │
│  └─────────────────────────────────────┘       │
│                                                 │
├─────────────────────────────────────────────────┤
│  🏠 Home │ 📋 Trans │ ✓ Review │ 💰 Budget     │
└─────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dashboard/FinancialPulse.tsx` | Create | Income/Spent/Remaining with click handlers |
| `src/components/dashboard/QuickActions.tsx` | Create | Upload + Manual entry buttons |
| `src/components/dashboard/PendingReviewAlert.tsx` | Create | Alert card linking to review |
| `src/components/dashboard/SpendingOverviewCard.tsx` | Create | Income vs Spend visualization |
| `src/components/dashboard/CategoryBreakdownList.tsx` | Create | Collapsible clickable categories |
| `src/pages/Dashboard.tsx` | Modify | Compose new components |
| `src/pages/ReportsPage.tsx` | Create | Move trend charts here |
| `src/components/layout/MenuDrawer.tsx` | Modify | Add Reports link |
| `src/App.tsx` | Modify | Add /reports route |
| `src/hooks/useSpendingOverview.ts` | Create | Hook for period-based Income/Spend data |

---

## Technical Details

### SpendingOverviewCard Component

```tsx
// Period selection state
const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

// Hook fetches income and spending for selected period
const { data } = useSpendingOverview(period);

// Clickable rows
const handleIncomeClick = () => navigate('/budget?filter=income');
const handleSpendClick = () => setExpanded(!expanded); // Or navigate
const handleNetInfoClick = () => toast.info('Net Income = Income - Total Spend');
```

### useSpendingOverview Hook

```tsx
// Fetches aggregated data based on period
// For 'year': returns last 5-6 years of data
// For 'quarter': returns last 4-8 quarters
// For 'month': returns last 6-12 months  
// For 'week': returns last 8 weeks

return useQuery({
  queryKey: ['spending-overview', period],
  queryFn: async () => {
    // Calculate date ranges based on period
    // Fetch income (from budgets where category type = 'income')
    // Fetch spending (from receipts)
    // Return { periods: [...], totalIncome, totalSpend, netIncome }
  }
});
```

### FinancialPulse with Click Handlers

```tsx
// Each metric is wrapped in a Link or button
<Link to={`/budget?filter=income`}>
  <MetricCard label="Income" value={income} />
</Link>

<Link to={`/transactions?range=this-month`}>
  <MetricCard label="Spent" value={spent} />
</Link>

<Link to="/budget">
  <MetricCard label="Left" value={remaining} health={healthColor} />
</Link>

// Progress bar also clickable
<Link to="/budget" className="block">
  <Progress value={percentUsed} className="cursor-pointer" />
</Link>
```

### CategoryBreakdownList with Click Navigation

```tsx
// Each category card navigates to filtered transactions
const handleCategoryClick = (category: CategorySpending) => {
  const params = new URLSearchParams();
  params.set('category', category.categoryName.toLowerCase());
  params.set('from', format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  params.set('to', format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  navigate(`/transactions?${params.toString()}`);
};
```

---

## Implementation Phases

### Phase 1: Core Dashboard Components
1. Create `FinancialPulse.tsx` with click handlers
2. Create `QuickActions.tsx` with upload + manual entry
3. Create `PendingReviewAlert.tsx` with navigation
4. Update `Dashboard.tsx` to use new components

### Phase 2: Spending Overview Visualization
1. Create `useSpendingOverview.ts` hook
2. Create `SpendingOverviewCard.tsx` with:
   - Period toggle buttons
   - Horizontal bar chart
   - Clickable summary rows
3. Integrate into Dashboard

### Phase 3: Category Breakdown Enhancement
1. Create `CategoryBreakdownList.tsx` (collapsible, clickable)
2. Add "View Reports" link
3. Each category navigates to filtered transactions

### Phase 4: Reports Page
1. Create `/reports` route
2. Move trend charts from SpendingReports
3. Add link in MenuDrawer

---

## Navigation Flow Diagram

```text
Dashboard
├── Financial Pulse
│   ├── Income → /budget?filter=income
│   ├── Spent → /transactions?range=this-month
│   └── Left → /budget
│
├── Quick Actions
│   ├── Add Receipt → File picker → /review
│   └── Manual Entry → Form dialog
│
├── Pending Alert → /review
│
├── Spending Overview
│   ├── Income row → /budget?filter=income
│   ├── Spend row → Expand OR /transactions
│   └── Net Income → Tooltip
│
└── Category Cards → /transactions?category=X

MenuDrawer
└── Reports → /reports (trend charts)
```

---

## Mobile Considerations

- All tap targets minimum 52px height
- Cards have `active:scale-[0.98]` feedback
- Collapsible sections reduce scroll depth
- Bottom nav remains fixed with 4 tabs
- Charts use horizontal scroll for many data points
- Period toggle uses pill buttons for easy thumb reach

---

## Summary

This plan creates a **fully interactive dashboard** where:

1. **Every number is tappable** - users can drill down into any metric
2. **Income vs Spend visualization** prominently displays financial health
3. **Period toggles** allow viewing data by week, month, quarter, or year
4. **Collapsible sections** reduce information overload
5. **Reports page** houses detailed analytics for power users

The design follows the visual language from your reference images while integrating seamlessly with MintReceipt's existing "calm financial" aesthetic.

