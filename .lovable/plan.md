
# Add Income Categories to Budget

## Overview
This plan adds income tracking to your zero-based budgeting system. You'll be able to set expected income for the month and see how your spending compares to your income.

## What You'll Get
- A new "Income" section in the budget page where you can define income sources
- Visual comparison of total income vs total expenses
- A "To Be Assigned" indicator showing how much of your income is left to budget
- Ability to track multiple income sources (e.g., Salary, Side Income, Investments)

## How It Works
Currently, your budget system only tracks spending categories. We'll extend it to also track income by:

1. Adding a `type` field to categories so we can distinguish between "expense" and "income" categories
2. Adding some system-level income categories (Salary, Side Income, Other Income)
3. Updating the budget UI to show both income and expense sections
4. Calculating a "To Be Assigned" value (Income - Budgeted Expenses)

---

## Technical Details

### Database Changes
Add a `type` column to the `categories` table:

```sql
ALTER TABLE public.categories 
ADD COLUMN type text NOT NULL DEFAULT 'expense';

-- Add check constraint for valid types
ALTER TABLE public.categories 
ADD CONSTRAINT categories_type_check 
CHECK (type IN ('expense', 'income'));

-- Insert system income categories
INSERT INTO public.categories (name, icon, color, is_system, sort_order, type) VALUES
  ('Salary', '💰', 'income', true, 1, 'income'),
  ('Side Income', '💼', 'income', true, 2, 'income'),
  ('Other Income', '📥', 'income', true, 3, 'income');
```

### File Changes

**1. `src/hooks/useCategories.ts`**
- Update the `Category` interface to include `type: 'expense' | 'income'`
- Add helper hooks: `useExpenseCategories()` and `useIncomeCategories()`

**2. `src/hooks/useBudgets.ts`**
- Update `useTotalBudgetSummary` to calculate:
  - Total income budgeted
  - Total expenses budgeted
  - "To Be Assigned" (income - expenses)

**3. `src/components/budget/BudgetManager.tsx`**
- Split the UI into two tabs or sections: "Income" and "Expenses"
- Add income category inputs at the top
- Update the summary card to show:
  - Total Income (budgeted)
  - Total Expenses (budgeted)
  - To Be Assigned (remaining to budget)
  - Spending progress against budget

**4. `src/pages/CategoriesPage.tsx`**
- Add category type selector when creating/editing categories
- Group categories by type in the display

### UI Layout

```text
+--------------------------------------------------+
|  SUMMARY CARD                                     |
|  +-----------+  +-----------+  +---------------+ |
|  | Income    |  | Expenses  |  | To Be Assigned| |
|  | $5,000    |  | $4,200    |  | $800          | |
|  +-----------+  +-----------+  +---------------+ |
+--------------------------------------------------+

+--------------------------------------------------+
|  INCOME                                           |
|  +---------------+  +---------------+             |
|  | 💰 Salary     |  | 💼 Side Income|             |
|  | $______       |  | $______       |             |
|  +---------------+  +---------------+             |
+--------------------------------------------------+

+--------------------------------------------------+
|  EXPENSES                          [Save Budgets] |
|  +---------------+  +---------------+             |
|  | 🥬 Groceries  |  | 🏠 Household  |             |
|  | $600          |  | $400          |             |
|  | [====>    ]   |  | [=====>   ]   |             |
|  +---------------+  +---------------+             |
|  ...                                              |
+--------------------------------------------------+
```

### Key Behavior
- Income categories work just like expense categories - you set a budget amount
- The "To Be Assigned" value shows if you have unbudgeted income (positive) or if you've over-budgeted (negative)
- Zero-based budgeting goal: "To Be Assigned" should be $0 (every dollar has a job)
- Income doesn't track actual amounts from receipts (income typically comes from bank transfers, not receipts)
