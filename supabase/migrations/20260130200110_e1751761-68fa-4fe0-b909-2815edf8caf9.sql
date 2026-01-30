-- Add type column to categories table
ALTER TABLE public.categories 
ADD COLUMN type text NOT NULL DEFAULT 'expense';

-- Add check constraint for valid types
ALTER TABLE public.categories 
ADD CONSTRAINT categories_type_check 
CHECK (type IN ('expense', 'income'));

-- Insert system income categories
INSERT INTO public.categories (name, icon, color, is_system, sort_order, type) VALUES
  ('Salary', '💰', 'emerald', true, 100, 'income'),
  ('Side Income', '💼', 'blue', true, 101, 'income'),
  ('Other Income', '📥', 'purple', true, 102, 'income');