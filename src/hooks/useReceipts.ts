import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReceiptStatus, CategoryTotals, LineItem } from '@/types/receipt';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

// Database row type from Supabase
interface ReceiptRow {
  id: string;
  user_id: string;
  merchant: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string | null;
  image_url: string | null;
  image_path: string | null;
  status: string | null;
  groceries_amount: number | null;
  household_amount: number | null;
  clothing_amount: number | null;
  other_amount: number | null;
  confidence_score: number | null;
  raw_ai_output: Json | null;
  ocr_text: string | null;
  line_items: Json | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  reviewed_at: string | null;
  error_message: string | null;
  file_hash: string | null;
}

// App-friendly receipt type
export interface Receipt {
  id: string;
  user_id: string;
  merchant: string | null;
  receipt_date: string | null;
  total_amount: number | null;
  currency: string;
  image_url: string | null;
  image_path: string | null;
  status: ReceiptStatus;
  groceries_amount: number;
  household_amount: number;
  clothing_amount: number;
  other_amount: number;
  confidence_score: number | null;
  raw_ai_output: Record<string, unknown> | null;
  ocr_text: string | null;
  line_items: LineItem[] | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  reviewed_at: string | null;
  error_message: string | null;
}

function transformRow(row: ReceiptRow): Receipt {
  return {
    ...row,
    currency: row.currency || 'USD',
    status: (row.status as ReceiptStatus) || 'inbox',
    groceries_amount: row.groceries_amount || 0,
    household_amount: row.household_amount || 0,
    clothing_amount: row.clothing_amount || 0,
    other_amount: row.other_amount || 0,
    raw_ai_output: row.raw_ai_output as Record<string, unknown> | null,
    line_items: Array.isArray(row.line_items) ? (row.line_items as unknown as LineItem[]) : null,
  };
}

export function useReceipts(status?: ReceiptStatus) {
  return useQuery({
    queryKey: ['receipts', status],
    queryFn: async () => {
      let query = supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as ReceiptRow[]).map(transformRow);
    },
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return transformRow(data as ReceiptRow);
    },
    enabled: !!id,
  });
}

export function useReceiptStats() {
  return useQuery({
    queryKey: ['receipt-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('status, groceries_amount, household_amount, clothing_amount, other_amount, total_amount');

      if (error) throw error;

      const receipts = (data as ReceiptRow[]).map(transformRow);
      
      const statusCounts = {
        inbox: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        reviewed: 0,
      };

      const categoryTotals: CategoryTotals = {
        groceries: 0,
        household: 0,
        clothing: 0,
        other: 0,
        total: 0,
      };

      receipts.forEach((r) => {
        statusCounts[r.status]++;
        categoryTotals.groceries += r.groceries_amount;
        categoryTotals.household += r.household_amount;
        categoryTotals.clothing += r.clothing_amount;
        categoryTotals.other += r.other_amount;
        categoryTotals.total += Number(r.total_amount) || 0;
      });

      return { statusCounts, categoryTotals, totalReceipts: receipts.length };
    },
  });
}

// Helper function to compute file hash
async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to compute hash from URL (for backfilling old receipts)
async function computeHashFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in to upload receipts');

      // Compute file hash for duplicate detection
      const fileHash = await computeFileHash(file);
      console.log('Computed file hash:', fileHash);

      // Check for duplicate receipt by hash
      const { data: existingByHash } = await supabase
        .from('receipts')
        .select('id, merchant, receipt_date')
        .eq('user_id', user.id)
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existingByHash) {
        const merchantInfo = existingByHash.merchant || 'Unknown merchant';
        const dateInfo = existingByHash.receipt_date 
          ? new Date(existingByHash.receipt_date).toLocaleDateString()
          : 'unknown date';
        throw new Error(`This receipt has already been uploaded (${merchantInfo} - ${dateInfo})`);
      }

      // Also check old receipts without hashes by comparing image content
      const { data: oldReceipts } = await supabase
        .from('receipts')
        .select('id, merchant, receipt_date, image_url, file_hash')
        .eq('user_id', user.id)
        .is('file_hash', null)
        .not('image_url', 'is', null);

      if (oldReceipts && oldReceipts.length > 0) {
        for (const oldReceipt of oldReceipts) {
          if (oldReceipt.image_url) {
            const oldHash = await computeHashFromUrl(oldReceipt.image_url);
            if (oldHash === fileHash) {
              // Backfill the hash for this old receipt
              await supabase
                .from('receipts')
                .update({ file_hash: oldHash })
                .eq('id', oldReceipt.id);
              
              const merchantInfo = oldReceipt.merchant || 'Unknown merchant';
              const dateInfo = oldReceipt.receipt_date 
                ? new Date(oldReceipt.receipt_date).toLocaleDateString()
                : 'unknown date';
              throw new Error(`This receipt has already been uploaded (${merchantInfo} - ${dateInfo})`);
            }
          }
        }
      }

      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is private for security)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (urlError) {
        console.error('Failed to create signed URL:', urlError);
        throw new Error('Failed to get secure URL for uploaded image');
      }

      // Create receipt record with file hash
      const { data: receipt, error: insertError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_path: fileName,
          image_url: urlData.signedUrl,
          status: 'inbox',
          file_hash: fileHash,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return transformRow(receipt as ReceiptRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
      toast.success('Receipt uploaded! It will be processed shortly.');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

export function useProcessReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const { data, error } = await supabase.functions.invoke('process-receipt', {
        body: { receiptId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
    },
    onError: (error) => {
      toast.error(`Processing failed: ${error.message}`);
    },
  });
}

export function useUpdateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReceiptRow> }) => {
      const { data, error } = await supabase
        .from('receipts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformRow(data as ReceiptRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
      toast.success('Receipt updated');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

export function useReviewReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action, adjustments }: { 
      id: string; 
      action: 'accept' | 'adjust' | 'ignore';
      adjustments?: Partial<ReceiptRow>;
    }) => {
      const updates = {
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        ...adjustments,
      };

      const { data, error } = await supabase
        .from('receipts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformRow(data as ReceiptRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
      toast.success('Receipt reviewed');
    },
    onError: (error) => {
      toast.error(`Review failed: ${error.message}`);
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receipt: { id: string; image_path: string | null }) => {
      // Delete image from storage first (if exists)
      if (receipt.image_path) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove([receipt.image_path]);

        if (storageError) {
          console.error('Failed to delete image from storage:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete the receipt record
      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id);

      if (dbError) throw dbError;
      
      return receipt.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-stats'] });
      toast.success('Receipt deleted');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}
