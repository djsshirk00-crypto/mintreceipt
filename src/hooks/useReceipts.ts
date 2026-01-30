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

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in to upload receipts');

      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Create receipt record
      const { data: receipt, error: insertError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_path: fileName,
          image_url: urlData.publicUrl,
          status: 'inbox',
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
