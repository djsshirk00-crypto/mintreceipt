-- Add file_hash column to receipts table for duplicate detection
ALTER TABLE public.receipts 
ADD COLUMN file_hash TEXT;

-- Create index for fast hash lookups
CREATE INDEX idx_receipts_file_hash ON public.receipts(user_id, file_hash) WHERE file_hash IS NOT NULL;