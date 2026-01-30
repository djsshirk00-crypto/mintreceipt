-- Create receipts table with full ledger structure
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Receipt metadata
  merchant TEXT,
  receipt_date DATE,
  total_amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Image storage
  image_url TEXT,
  image_path TEXT,
  
  -- Processing status: inbox, processing, processed, failed, reviewed
  status TEXT NOT NULL DEFAULT 'inbox',
  
  -- Category splits (sum must equal total_amount)
  groceries_amount DECIMAL(10, 2) DEFAULT 0,
  household_amount DECIMAL(10, 2) DEFAULT 0,
  clothing_amount DECIMAL(10, 2) DEFAULT 0,
  other_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- AI processing data
  confidence_score DECIMAL(3, 2),
  raw_ai_output JSONB,
  ocr_text TEXT,
  line_items JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own receipts
CREATE POLICY "Users can view their own receipts"
ON public.receipts FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own receipts
CREATE POLICY "Users can insert their own receipts"
ON public.receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own receipts
CREATE POLICY "Users can update their own receipts"
ON public.receipts FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own receipts
CREATE POLICY "Users can delete their own receipts"
ON public.receipts FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

-- Storage policies for receipt images
CREATE POLICY "Users can view their own receipt images"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipt images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipt images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipt images"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for faster queries
CREATE INDEX idx_receipts_user_status ON public.receipts(user_id, status);
CREATE INDEX idx_receipts_user_date ON public.receipts(user_id, receipt_date DESC);