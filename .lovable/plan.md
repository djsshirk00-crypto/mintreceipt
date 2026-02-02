

# Fix: App Not Loading Due to Function Declaration Order

## Problem Identified

The app is stuck on "Processing..." because of a **variable hoisting issue** in `ReviewPage.tsx`:

| Issue | Location | Problem |
|-------|----------|---------|
| `cn` function declared after use | Line 358 | `cn` is used in `ReviewContent` (line 231) but defined later (line 358) |
| React ref warning | `DynamicCategorySummary.tsx` | Function components receiving refs without `forwardRef` |

The `ReviewContent` sub-component tries to call `cn()` at line 231, but `cn` is defined as a `const` at line 358, which means it's not hoisted and is `undefined` when first called.

---

## Fix 1: Move `cn` Import to Top (Primary Fix)

**File: `src/pages/ReviewPage.tsx`**

**Action:** Add `cn` import from `@/lib/utils` and remove the local definition

```diff
+ import { cn } from '@/lib/utils';
  import { useState } from 'react';
  ...
  
  // Line 358 - DELETE this local cn function:
- // Helper for className
- const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');
```

---

## Fix 2: Add `forwardRef` to Summary Components (Secondary Fix)

**File: `src/components/receipt/DynamicCategorySummary.tsx`**

The React warning about refs is a warning only (not blocking), but should be fixed for clean console output.

```diff
- export function DynamicCategorySummaryCard({ ... }: DynamicCategorySummaryCardProps) {
+ export const DynamicCategorySummaryCard = React.forwardRef<HTMLDivElement, DynamicCategorySummaryCardProps>(
+   function DynamicCategorySummaryCard({ ... }, ref) {
      ...
-     <Card ...>
+     <Card ref={ref} ...>
      ...
-   );
- }
+   }
+ );

- export function DynamicCategorySummaryGrid({ ... }: DynamicCategorySummaryGridProps) {
+ export const DynamicCategorySummaryGrid = React.forwardRef<HTMLDivElement, DynamicCategorySummaryGridProps>(
+   function DynamicCategorySummaryGrid({ ... }, ref) {
      ...
-   );
- }
+   }
+ );
```

---

## Files to Modify

| Action | File |
|--------|------|
| Modify | `src/pages/ReviewPage.tsx` - Add `cn` import, remove local definition |
| Modify | `src/components/receipt/DynamicCategorySummary.tsx` - Add `forwardRef` to components |

---

## Technical Details

### Why This Happened
- During the Phase 2.5 implementation, the `ReviewContent` sub-component was created using a `cn` helper
- A local `cn` function was added at the bottom of the component for convenience
- JavaScript `const` declarations are **not hoisted**, so calling `cn()` before it's defined causes an error
- The app appears to be "Processing..." because React crashes during render before the UI can update

### The Fix
- Import `cn` from the existing utility file `@/lib/utils` (which is already used throughout the codebase)
- This ensures `cn` is available at the top of the file before any component code runs

