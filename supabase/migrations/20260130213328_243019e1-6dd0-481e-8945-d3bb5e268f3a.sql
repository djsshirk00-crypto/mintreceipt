-- Make the receipts storage bucket private to protect sensitive receipt images
UPDATE storage.buckets SET public = false WHERE id = 'receipts';