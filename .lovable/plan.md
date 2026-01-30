
# Custom Date Range Reports

## Overview
Add a "Custom" date range option to the spending reports so you can search for spending data between any two dates you choose. This will appear as a new tab alongside the existing options (This Week, Last Week, etc.).

## What You'll Get
- A new "Custom" tab in the Spending Reports section
- When selected, shows a date range picker with "From" and "To" date fields
- Pick any start and end date using a calendar popup
- View total spending, receipt count, and category breakdown for your selected range
- Mobile-friendly date picker that works great on phones

## How It Works
1. Tap the "Custom" tab in Spending Reports
2. Tap "From" to pick your start date
3. Tap "To" to pick your end date  
4. Report updates automatically to show spending for that range

---

## Technical Details

### 1. Update TimeRange Type

Add 'custom' as a new time range option:

```typescript
// useSpendingStats.ts
export type TimeRange = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all-time' | 'custom';
```

### 2. Create Custom Date Range Hook

Add a new hook that accepts explicit start/end dates:

```typescript
// useSpendingStats.ts - new export
export function useCustomSpendingStats(startDate: Date | null, endDate: Date | null) {
  const { data: dbCategories } = useCategories();

  return useQuery({
    queryKey: ['spending-stats', 'custom', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Same query logic but uses provided dates
      // Returns spending breakdown for custom range
    },
    enabled: !!startDate && !!endDate,
  });
}
```

### 3. Update SpendingReports Component

Add date picker UI when "Custom" is selected:

```typescript
// SpendingReports.tsx changes:

// New state for custom dates
const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

// Use custom hook when in custom mode
const { data: customStats } = useCustomSpendingStats(
  timeRange === 'custom' ? customStartDate : null,
  timeRange === 'custom' ? customEndDate : null
);

// Choose which stats to display
const displayStats = timeRange === 'custom' ? customStats : spendingStats;

// Add Custom tab trigger
<TabsTrigger value="custom">Custom</TabsTrigger>

// Date picker UI (shown when Custom is selected)
{timeRange === 'custom' && (
  <div className="flex flex-wrap gap-4 mt-4">
    <DatePicker 
      label="From" 
      date={customStartDate} 
      onSelect={setCustomStartDate} 
    />
    <DatePicker 
      label="To" 
      date={customEndDate} 
      onSelect={setCustomEndDate} 
    />
  </div>
)}
```

### 4. Create DatePicker Component

A reusable date picker with popover calendar:

```typescript
// New: src/components/ui/date-picker.tsx

function DatePicker({ label, date, onSelect }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[140px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
```

### File Changes

**Modified Files:**
- `src/hooks/useSpendingStats.ts` - Add 'custom' to TimeRange, add useCustomSpendingStats hook
- `src/components/receipt/SpendingReports.tsx` - Add Custom tab, date picker UI, integrate custom stats

**New Files:**
- `src/components/ui/date-picker.tsx` - Reusable date picker component

### Mobile Considerations
- Date pickers use large touch-friendly buttons
- Calendar popover positioned for easy thumb access
- Horizontal scroll on tabs if needed for smaller screens
- Selected dates clearly visible in button labels

### Implementation Steps
1. Create the DatePicker component
2. Add 'custom' to TimeRange type
3. Create useCustomSpendingStats hook
4. Update SpendingReports with Custom tab and date pickers
5. Wire up the custom date range to display correct stats
