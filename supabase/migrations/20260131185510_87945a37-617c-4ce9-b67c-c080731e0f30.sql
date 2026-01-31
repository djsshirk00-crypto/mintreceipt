-- Insert default system categories
INSERT INTO public.categories (name, icon, color, is_system, sort_order, type, user_id)
VALUES
  ('Food & Dining', '🍽️', 'orange', true, 1, 'expense', NULL),
  ('Groceries', '🛒', 'green', true, 2, 'expense', NULL),
  ('Gas & Transportation', '⛽', 'blue', true, 3, 'expense', NULL),
  ('Shopping', '🛍️', 'pink', true, 4, 'expense', NULL),
  ('Bills & Utilities', '💡', 'yellow', true, 5, 'expense', NULL),
  ('Health & Medical', '🏥', 'red', true, 6, 'expense', NULL),
  ('Travel', '✈️', 'cyan', true, 7, 'expense', NULL),
  ('Business Expenses', '💼', 'purple', true, 8, 'expense', NULL),
  ('Home & Maintenance', '🏠', 'amber', true, 9, 'expense', NULL),
  ('Other / Uncategorized', '📦', 'muted', true, 10, 'expense', NULL)
ON CONFLICT DO NOTHING;