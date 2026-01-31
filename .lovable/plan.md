
# Add Settings Page

This plan will add a Settings tab to MintReceipt where you can customize your experience, including switching between light and dark mode, setting your preferred currency, and managing other useful preferences.

## What You'll Get

- A new Settings tab in the navigation menu
- Dark/Light mode toggle that saves your preference
- Currency preference setting (USD, EUR, GBP, CAD, etc.)
- Default time range for spending reports
- Option to show/hide specific dashboard sections
- Sign out button moved to settings for cleaner nav

## Implementation Steps

### 1. Set Up Theme Provider

Add the `next-themes` library's `ThemeProvider` to enable dark/light mode switching. The app already has dark mode CSS defined, it just needs the toggle mechanism.

### 2. Create User Settings Table

Create a `user_settings` table in the database to persist user preferences:
- `user_id` (references authenticated user)
- `theme` (light/dark/system)
- `currency` (USD, EUR, GBP, etc.)
- `default_time_range` (this-week, this-month, etc.)
- `show_weekly_trend` (boolean)
- `show_monthly_trend` (boolean)

### 3. Create Settings Page

Build a dedicated settings page with organized sections:
- **Appearance**: Theme toggle (Light/Dark/System)
- **Preferences**: Currency, default report time range
- **Dashboard**: Toggle chart visibility
- **Account**: Sign out button

### 4. Update Navigation

Add Settings link to both desktop header and mobile bottom nav, using a gear icon.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/SettingsPage.tsx` | Main settings page with all preference controls |
| `src/hooks/useUserSettings.ts` | Hook to fetch/update user settings from database |
| `src/components/settings/ThemeToggle.tsx` | Light/Dark/System mode selector |
| `src/components/settings/CurrencySelector.tsx` | Currency preference dropdown |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add ThemeProvider wrapper and Settings route |
| `src/main.tsx` | Optional: could add ThemeProvider here instead |
| `src/components/layout/AppLayout.tsx` | Add Settings to nav items, remove Sign Out from header |

### Database Migration

```text
user_settings table:
- id: uuid (primary key)
- user_id: uuid (unique, references auth user)
- theme: text (default 'system')
- currency: text (default 'USD')
- default_time_range: text (default 'this-month')
- show_weekly_trend: boolean (default true)
- show_monthly_trend: boolean (default true)
- created_at: timestamp
- updated_at: timestamp

RLS policies:
- Users can only read/write their own settings
```

### Theme Integration Flow

```text
App loads
    |
    v
ThemeProvider checks localStorage/system preference
    |
    v
User opens Settings
    |
    v
Selects Light/Dark/System
    |
    v
ThemeProvider applies class to <html> element
    |
    v
CSS variables switch based on .dark class
```

### Navigation Update

The Settings tab will be added as the last item in the navigation, using the `Settings` (gear) icon from lucide-react. The Sign Out button will be moved from the header into the Settings page under an "Account" section for a cleaner interface.

### Currency Integration

Once currency preference is saved, it can be used across the app to format amounts consistently. The SpendingReports component and ReceiptCard can read from the user settings hook to display the correct currency symbol.
