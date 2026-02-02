

# MintReceipt - Complete Product Roadmap

## Vision Statement
A minimal, budget-focused app that creates precise financial reports while being psychologically rewarding and taking 50% less time than alternatives. The app should bring **peace** to users who aren't necessarily "money savvy."

---

## Architecture Overview: How Everything Connects

```text
                    ┌─────────────────────────────────────────────────────────┐
                    │                    USER ENTRY POINTS                     │
                    ├─────────────────────────────────────────────────────────┤
                    │                                                          │
                    │   📸 FAB Camera ────┬───▶ Upload + Process              │
                    │   ✏️ Manual Entry ──┤      (background)                 │
                    │                     │          │                         │
                    │                     │          ▼                         │
                    │                     └────▶ REVIEW PAGE                   │
                    │                           (single validation)            │
                    │                                  │                       │
                    │                                  ▼                       │
                    │                          💾 Save Transaction             │
                    │                                  │                       │
                    │              ┌───────────────────┼───────────────────┐   │
                    │              ▼                   ▼                   ▼   │
                    │         Transactions        Dashboard            Budget  │
                    │            Tab             (Pulse)              Totals   │
                    │                                                          │
                    └─────────────────────────────────────────────────────────┘
```

---

## Current State (Completed Features)

| Feature | Status | Notes |
|---------|--------|-------|
| Enhanced PWA (offline + install) | Done | Service worker, install prompts |
| Pull-to-refresh | Done | Haptic feedback included |
| Bottom sheet dialogs | Done | Used in onboarding and categories |
| Mobile-optimized onboarding | Done | Bottom sheet with spotlight |
| Categories browse/manage modes | Done | Detail sheets, safe delete |
| Duplicate receipt detection | Done | File hash comparison |
| AI-powered categorization | Done | Uses `line_item_history` for learning |

---

## Phase 1: Streamlined Capture Flow (Foundation)
**Goal**: Eliminate friction between capture and review. Every receipt reaches a reviewed state in one session.

### 1.1 Remove Inbox, Direct-to-Review Flow
**Priority**: Critical | **Effort**: Medium | **Impact**: Very High

**Current flow** (problematic):
```text
Capture → Inbox → Manual "Process" → Processed → Review → Reviewed
         ↑                                            
         (receipts can get stuck here)
```

**New flow** (streamlined):
```text
Capture → Auto-Process → Review Page → Save Transaction → Reviewed
                         (immediate)     (single step)
```

**What changes**:
- **Remove** `/inbox` route and `InboxPage.tsx`
- **Remove** Inbox from navigation (bottom nav and desktop)
- **Update** `FloatingCaptureButton` to:
  1. Upload receipt
  2. Trigger processing immediately (background)
  3. Navigate to `/review` with the new receipt highlighted
- **Update** `process-receipt` edge function to auto-trigger on insert via database trigger OR call it inline after upload
- **Add** loading state on Review page for "currently processing" receipts
- **Update** Review page to show "New Receipt" badge for the just-uploaded item

**Technical approach**:
- Create database trigger: `AFTER INSERT ON receipts` → call edge function
- OR: Chain `processReceipt.mutateAsync()` immediately after upload in FAB
- Add `?highlight={receiptId}` query param to Review page for scroll-to behavior

**Downstream effects**:
- Dashboard: No longer shows "pending inbox" count
- Onboarding: Update tour steps that reference Inbox
- Mobile nav: One fewer tab (cleaner UI)

---

### 1.2 Enhanced Review Page as Validation Hub
**Priority**: Critical | **Effort**: Medium | **Impact**: Very High

**New Review page responsibilities**:
- Shows receipts in `processing` and `processed` states
- Real-time updates when processing completes
- Clear primary action: "Save Transaction" (replaces Accept/Adjust)
- Inline editing for:
  - Merchant name
  - Date
  - Amount
  - Category/subcategory (line items)
  - Optional notes/tags

**Save Transaction action**:
1. Sets status to `reviewed`
2. Updates `receipt_category_amounts` table
3. Saves line items to `line_item_history` for AI learning
4. Triggers budget recalculation
5. Shows success celebration (confetti for first-time, checkmark for repeat)
6. Auto-advances to next pending receipt OR shows "All caught up!"

**Technical approach**:
- Rename internal actions from "accept/adjust" to "save"
- Add realtime subscription for `receipts` table to show processing → processed transitions
- Add "Currently Processing..." spinner state for receipts mid-OCR

---

### 1.3 Simplified Mobile Navigation
**Priority**: High | **Effort**: Medium | **Impact**: High

**New bottom nav structure** (4 tabs):
| Tab | Icon | Destination |
|-----|------|-------------|
| Dashboard | Home | `/` |
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

**Why this works**:
- Inbox removal opens a slot
- Transactions tab is more useful than direct Budget/Categories access
- Core daily actions remain one-tap accessible
- Secondary features grouped in Menu

---

## Phase 2: Transactions & Data Management
**Goal**: Full visibility and control over historical data

### 2.1 Transactions Tab
**Priority**: Critical | **Effort**: Medium | **Impact**: Very High

**Features**:
- Full transaction list sorted by date (most recent first)
- Each row shows: Merchant, Date, Amount, Category
- Search bar: full-text on merchant, line items, notes
- Filter chips: Date range, Category, Amount range
- URL-based state: `/transactions?category=groceries&from=2025-01-01`

**Tap-to-edit bottom sheet**:
- Change category (auto-updates line items)
- Edit notes/tags
- View receipt image (if exists)
- Delete transaction

**Re-categorization safety**:
- Changes propagate to:
  - `receipt_category_amounts` table
  - Budget calculations for affected month
  - Category totals on Dashboard
- No duplicate entries possible (single source of truth)

---

### 2.2 Interactive Weekly Review Categories
**Priority**: High | **Effort**: Low | **Impact**: High

**Current**: Category summary cards are display-only
**New**: Tapping a category card navigates to Transactions with filters applied

**Example**:
- User taps "Groceries" card showing $150
- App navigates to `/transactions?category=groceries&from=2025-01-27&to=2025-02-02`
- User sees all grocery transactions for the current week
- Can drill down into any transaction to audit

**Technical approach**:
- Add `onClick` prop to `CategorySummaryCard`
- Use `useNavigate` with search params for deep linking
- Transactions page reads params and applies filters on mount

---

## Phase 3: Intelligence & Efficiency
**Goal**: Reduce user effort by 50% through AI learning

### 3.1 Smart Category Suggestions
**Priority**: Critical | **Effort**: Medium | **Impact**: Very High

**How it works**:
- During Review, query `line_item_history` for matching items
- Show suggested category as a pill: "Suggested: Groceries (85%)"
- One-tap accept or override
- Corrections feed back into history for future learning

**Technical approach**:
- Query: `SELECT legacy_category, occurrence_count FROM line_item_history WHERE normalized_description ILIKE '%{item}%' ORDER BY occurrence_count DESC LIMIT 1`
- Weight recent corrections higher (add `confidence_weight` based on `last_used_at`)
- Show suggestion inline on each line item row

**User benefit**: Reviews that took 30 seconds now take 5 seconds

---

### 3.2 One-Tap Review Mode
**Priority**: High | **Effort**: Medium | **Impact**: High

**Features**:
- Swipe-based review for mobile
- Swipe right = Accept with current categories
- Swipe left = Open edit sheet
- Progress indicator: "3 of 7 receipts reviewed"
- Batch complete celebration

**User benefit**: Clear 10 receipts in 60 seconds

---

### 3.3 Duplicate Detection Enhancement
**Priority**: Medium | **Effort**: Low | **Impact**: Medium

**Current**: File hash detection
**Enhanced**: Also check merchant + date + total (within $0.50)

**Flow**:
- On upload, check for similar receipt
- Show modal: "Similar receipt found from Target on Jan 15 for $45.23. Upload anyway?"
- Options: View existing, Upload anyway, Cancel

---

## Phase 4: Psychological Rewards
**Goal**: Make budgeting feel good, not stressful

### 4.1 Spending Pulse Summary
**Priority**: Critical | **Effort**: Low | **Impact**: Very High

**Dashboard shows 3 numbers**:
| Number | Source |
|--------|--------|
| Income | Sum of income-type transactions |
| Spent | Sum of expense-type transactions |
| Remaining | Budget total - Spent |

**Visual treatment**:
- Large, clear typography
- Color-coded health: Green (safe), Yellow (caution), Red (over)
- Expandable for category breakdown (hidden by default)

**User benefit**: Instant peace of mind without cognitive overload

---

### 4.2 Wins & Progress Celebrations
**Priority**: High | **Effort**: Medium | **Impact**: Very High

**Milestone types**:
- Budget health: "You're 80% through groceries with 10 days left!"
- Under budget: "You came in $50 under budget this month!"
- Streaks: "You've logged 7 days in a row!"
- First-time: "First receipt reviewed!" (confetti)

**Implementation**:
- Create `achievements` table tracking milestone completion
- Calculate "budget health" on save
- Tasteful animations (subtle confetti, checkmarks)
- Weekly "Win Summary" card on Dashboard

**User benefit**: Positive reinforcement creates habit formation

---

### 4.3 Budget Health Indicator
**Priority**: High | **Effort**: Low | **Impact**: High

**Visual**:
- Progress ring per category
- Green/Yellow/Red states
- Proactive warning: "At this pace, you'll exceed groceries by $50"

**Technical approach**:
- Calculate: `(spent / budget) * 100`
- Project: `(daily_average * days_remaining) + spent`
- Show projection on hover/tap

---

## Phase 5: Effortless Reporting
**Goal**: Financial-grade reports without effort

### 5.1 Monthly Financial Snapshot
**Priority**: Critical | **Effort**: High | **Impact**: Very High

**Auto-generated at month end**:
- Income vs Expenses comparison
- Category breakdown (pie/bar chart)
- Top 5 merchants
- Budget vs Actual per category
- Key trends ("Dining up 15% from last month")

**Export options**:
- View in-app
- Download as PDF
- Optional email delivery

**User benefit**: Tax-ready, partner-shareable reports with zero effort

---

### 5.2 Receipt Search
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Full-text search across**:
- Merchant names
- Line item descriptions
- OCR text
- Notes

**Use case**: "Find all my Home Depot receipts from 2024"

---

### 5.3 AI-Generated Insights
**Priority**: Low | **Effort**: High | **Impact**: Medium

**Monthly AI analysis**:
- "You spend 40% more on weekends"
- "Your grocery spending is consistent at ~$150/week"
- "Subscription costs increased by $20 this month"

**User benefit**: Financial advisor insights without the advisor

---

## Phase 6: Budget Automation
**Goal**: Set it and forget it

### 6.1 Budget Templates
**Priority**: High | **Effort**: Low | **Impact**: High

**Features**:
- One-click copy last month's budget
- "Repeat monthly" toggle per category
- Adjust for known changes

**User benefit**: 30 seconds to set up a new month

---

### 6.2 Rollover Budgets
**Priority**: Medium | **Effort**: Medium | **Impact**: Medium

**Features**:
- Unused budget carries forward (optional)
- Overspend carries as debt
- Visual indicator of rollover amounts

---

### 6.3 Spending Notifications (Future)
**Priority**: Low | **Effort**: High | **Impact**: Medium

**Push notifications for**:
- Weekly spending summary
- Budget threshold alerts (80%, 100%)
- Reminder to review pending receipts

---

## Explicitly NOT Building

| Feature | Reason |
|---------|--------|
| Net worth tracking | Out of scope - budget focus only |
| Investment tracking | Out of scope |
| Bank account linking | Complexity + security concerns |
| Credit score monitoring | Out of scope |
| Bill pay / reminders | Out of scope |
| Debt payoff calculators | Future consideration only |

---

## Recommended Build Order (Priority Matrix)

| Order | Feature | Phase | Effort | Impact | Dependencies |
|-------|---------|-------|--------|--------|--------------|
| 1 | Remove Inbox + Direct-to-Review | 1.1 | Medium | Very High | None |
| 2 | Enhanced Review Page | 1.2 | Medium | Very High | 1.1 |
| 3 | Simplified Mobile Nav | 1.3 | Low | High | 1.1 |
| 4 | Transactions Tab | 2.1 | Medium | Very High | 1.3 |
| 5 | Interactive Review Categories | 2.2 | Low | High | 2.1 |
| 6 | Spending Pulse Summary | 4.1 | Low | Very High | None |
| 7 | Smart Category Suggestions | 3.1 | Medium | Very High | 2.1 |
| 8 | Wins & Celebrations | 4.2 | Medium | High | 4.1 |
| 9 | Budget Health Indicator | 4.3 | Low | High | 4.1 |
| 10 | One-Tap Review Mode | 3.2 | Medium | High | 1.2 |
| 11 | Monthly Financial Snapshot | 5.1 | High | Very High | 2.1 |
| 12 | Budget Templates | 6.1 | Low | High | None |
| 13 | Receipt Search | 5.2 | Medium | Medium | 2.1 |

---

## Files Affected by Phase 1 (First Implementation)

**Delete**:
- `src/pages/InboxPage.tsx`

**Create**:
- `src/pages/TransactionsPage.tsx`
- `src/components/transactions/TransactionEditSheet.tsx`
- `src/components/layout/MenuDrawer.tsx`

**Modify**:
- `src/App.tsx` - Remove `/inbox` route, add `/transactions`
- `src/components/layout/AppLayout.tsx` - New 4-tab nav + Menu drawer
- `src/components/layout/FloatingCaptureButton.tsx` - Navigate to `/review` after upload
- `src/pages/ReviewPage.tsx` - Handle processing state, add "Save Transaction" CTA
- `src/hooks/useReceipts.ts` - Chain processing after upload
- `src/components/onboarding/OnboardingTour.tsx` - Remove Inbox steps

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to review | < 10 seconds per receipt (from ~30s) |
| Monthly report generation | 0 minutes (automated) |
| User stress level | "Peace of mind" rating > 4/5 |
| Weekly active retention | 70%+ |
| Orphaned receipts | 0 (no stuck states) |

