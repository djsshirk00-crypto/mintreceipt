-- Create table to store line item categorization history for AI learning
CREATE TABLE public.line_item_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  legacy_category TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_line_item_history_user ON public.line_item_history(user_id);
CREATE INDEX idx_line_item_history_normalized ON public.line_item_history(normalized_description);

-- Enable RLS
ALTER TABLE public.line_item_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own line item history"
ON public.line_item_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own line item history"
ON public.line_item_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own line item history"
ON public.line_item_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own line item history"
ON public.line_item_history
FOR DELETE
USING (auth.uid() = user_id);