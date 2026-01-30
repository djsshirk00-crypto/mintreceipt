-- Create categories table with hierarchy support (parent/child for subcategories)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT 'muted',
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Users can view system categories and their own custom categories
CREATE POLICY "Users can view system and own categories"
ON public.categories FOR SELECT
USING (is_system = true OR auth.uid() = user_id);

-- Users can create their own categories
CREATE POLICY "Users can create their own categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_system = false);

-- Users can update their own categories
CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id AND is_system = false);

-- Users can delete their own categories
CREATE POLICY "Users can delete their own categories"
ON public.categories FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system categories (no user_id since they're system-wide)
INSERT INTO public.categories (name, icon, color, is_system, sort_order) VALUES
('Groceries', '🥬', 'groceries', true, 1),
('Household', '🏠', 'household', true, 2),
('Clothing', '👕', 'clothing', true, 3),
('Entertainment', '🎬', 'entertainment', true, 4),
('Healthcare', '💊', 'healthcare', true, 5),
('Transportation', '🚗', 'transportation', true, 6),
('Other', '📦', 'other', true, 100);

-- Create receipt_category_amounts table to store flexible category amounts per receipt
CREATE TABLE public.receipt_category_amounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(receipt_id, category_id)
);

-- Enable RLS
ALTER TABLE public.receipt_category_amounts ENABLE ROW LEVEL SECURITY;

-- Users can view amounts for their own receipts
CREATE POLICY "Users can view their receipt category amounts"
ON public.receipt_category_amounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.receipts
    WHERE receipts.id = receipt_category_amounts.receipt_id
    AND receipts.user_id = auth.uid()
  )
);

-- Users can insert amounts for their own receipts
CREATE POLICY "Users can insert their receipt category amounts"
ON public.receipt_category_amounts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.receipts
    WHERE receipts.id = receipt_category_amounts.receipt_id
    AND receipts.user_id = auth.uid()
  )
);

-- Users can update amounts for their own receipts
CREATE POLICY "Users can update their receipt category amounts"
ON public.receipt_category_amounts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.receipts
    WHERE receipts.id = receipt_category_amounts.receipt_id
    AND receipts.user_id = auth.uid()
  )
);

-- Users can delete amounts for their own receipts
CREATE POLICY "Users can delete their receipt category amounts"
ON public.receipt_category_amounts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.receipts
    WHERE receipts.id = receipt_category_amounts.receipt_id
    AND receipts.user_id = auth.uid()
  )
);