-- ─────────────────────────────────────────────────────────────────────────────
-- 1. INCOME TRANSACTIONS TABLE
-- Stores salary, commission, rental income, and other income entries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.income_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  income_type TEXT NOT NULL DEFAULT 'other'
    CHECK (income_type IN ('salary', 'commission', 'rental', 'interest', 'reimbursement', 'other')),
  source TEXT,                        -- e.g. "Shirlock Acres", "147 Property"
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_interval TEXT           -- 'weekly', 'biweekly', 'monthly'
    CHECK (recurrence_interval IN ('weekly', 'biweekly', 'monthly', NULL)),
  notes TEXT,
  import_source TEXT,                 -- 'manual', 'csv', 'qbo'
  external_id TEXT,                   -- for dedup: external transaction ID
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.income_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own income"
  ON public.income_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own income"
  ON public.income_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income"
  ON public.income_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own income"
  ON public.income_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_income_user_date ON public.income_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_income_user_type ON public.income_transactions(user_id, income_type);

CREATE TRIGGER update_income_updated_at
  BEFORE UPDATE ON public.income_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SAVINGS GOALS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Savings Goal',
  target_rate NUMERIC NOT NULL DEFAULT 20 CHECK (target_rate >= 0 AND target_rate <= 100),
  target_amount NUMERIC,              -- optional fixed dollar target
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own savings goals"
  ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RENTAL PROPERTIES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.rental_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,                 -- e.g. "147 Main St"
  address TEXT,
  mortgage_amount NUMERIC DEFAULT 0,  -- monthly mortgage payment
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rental properties"
  ON public.rental_properties FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_rental_properties_updated_at
  BEFORE UPDATE ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link income transactions to rental properties
ALTER TABLE public.income_transactions
  ADD COLUMN rental_property_id UUID REFERENCES public.rental_properties(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. IMPORT SESSIONS TABLE
-- Tracks CSV/QBO import batches for audit and dedup
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.import_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT,
  import_source TEXT NOT NULL DEFAULT 'csv'
    CHECK (import_source IN ('csv', 'qbo', 'manual')),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  merged_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own import sessions"
  ON public.import_sessions FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ENHANCE RECEIPTS TABLE FOR DEDUP
-- Add import_source and external_id for matching imported vs manual receipts
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual'
    CHECK (import_source IN ('manual', 'csv', 'qbo', 'photo')),
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS import_session_id UUID REFERENCES public.import_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_with_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;

-- Update existing records to have import_source = 'photo' (they were all uploaded photos)
UPDATE public.receipts SET import_source = 'photo' WHERE import_source IS NULL OR import_source = 'manual';

CREATE INDEX idx_receipts_external_id ON public.receipts(user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_receipts_import_session ON public.receipts(import_session_id) WHERE import_session_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ADD INCOME SYSTEM CATEGORIES (expanded)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.categories (name, icon, color, is_system, sort_order, type, user_id)
VALUES
  ('Salary', '💰', 'emerald', true, 100, 'income', NULL),
  ('Commission / Bonus', '🏆', 'green', true, 101, 'income', NULL),
  ('Rental Income', '🏠', 'blue', true, 102, 'income', NULL),
  ('Interest / Dividends', '📈', 'cyan', true, 103, 'income', NULL),
  ('Reimbursement', '💵', 'yellow', true, 104, 'income', NULL),
  ('Side Income', '💼', 'purple', true, 105, 'income', NULL),
  ('Other Income', '📥', 'muted', true, 106, 'income', NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ADD EXPENSE CATEGORIES FOR RENTAL PROPERTIES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.categories (name, icon, color, is_system, sort_order, type, user_id)
VALUES
  ('Rental - Mortgage', '🏦', 'red', true, 200, 'expense', NULL),
  ('Rental - Utilities', '💡', 'orange', true, 201, 'expense', NULL),
  ('Rental - Repairs', '🔧', 'amber', true, 202, 'expense', NULL),
  ('Rental - Management', '📋', 'blue', true, 203, 'expense', NULL),
  ('Savings / Investment', '💹', 'emerald', true, 204, 'expense', NULL)
ON CONFLICT DO NOTHING;
