import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parse, isValid } from 'date-fns';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  reference?: string;
  rawRow: Record<string, string>;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  merged: number;
  errors: number;
  sessionId: string;
}

// ── Parse a date string in multiple formats ────────────────────────────────
function parseDate(dateStr: string): string | null {
  const formats = [
    'MM/dd/yyyy', 'MM-dd-yyyy', 'yyyy-MM-dd',
    'M/d/yyyy', 'M/d/yy', 'MM/dd/yy',
    'dd/MM/yyyy', 'MMM d, yyyy', 'MMMM d, yyyy',
  ];
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr.trim(), fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch { /* try next */ }
  }
  return null;
}

// ── Normalize a description for dedup matching ────────────────────────────
export function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
}

// ── Parse CSV content into transactions ───────────────────────────────────
export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Parse header
  const headers = firstLine.split(delimiter).map(h =>
    h.replace(/^["']|["']$/g, '').trim().toLowerCase()
  );

  // Map common column name variants
  const findCol = (variants: string[]) =>
    variants.find(v => headers.includes(v)) ?? null;

  const dateCol = findCol(['date', 'transaction date', 'txn date', 'posted date', 'trans date']);
  const descCol = findCol(['description', 'memo', 'payee', 'name', 'merchant', 'transaction description']);
  const amountCol = findCol(['amount', 'transaction amount', 'debit', 'credit', 'total']);
  const debitCol = findCol(['debit', 'debit amount', 'withdrawals']);
  const creditCol = findCol(['credit', 'credit amount', 'deposits']);
  const refCol = findCol(['reference', 'ref', 'check number', 'transaction id', 'id']);
  const catCol = findCol(['category', 'type', 'transaction type']);

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV values
    const values: string[] = [];
    let inQuote = false;
    let current = '';
    for (const char of line) {
      if (char === '"') { inQuote = !inQuote; continue; }
      if (char === delimiter && !inQuote) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const rawRow: Record<string, string> = {};
    headers.forEach((h, idx) => { rawRow[h] = values[idx] || ''; });

    const dateStr = dateCol ? rawRow[dateCol] : '';
    const parsedDate = parseDate(dateStr);
    if (!parsedDate) continue;

    const descStr = descCol ? rawRow[descCol] : '';
    if (!descStr) continue;

    let amount = 0;
    let type: 'debit' | 'credit' = 'debit';

    if (amountCol && rawRow[amountCol]) {
      const raw = rawRow[amountCol].replace(/[$,\s]/g, '');
      amount = Math.abs(parseFloat(raw) || 0);
      type = parseFloat(raw) < 0 ? 'debit' : 'credit';
    } else if (debitCol && rawRow[debitCol]) {
      const raw = rawRow[debitCol].replace(/[$,\s]/g, '');
      amount = Math.abs(parseFloat(raw) || 0);
      type = 'debit';
    } else if (creditCol && rawRow[creditCol]) {
      const raw = rawRow[creditCol].replace(/[$,\s]/g, '');
      amount = Math.abs(parseFloat(raw) || 0);
      type = 'credit';
    }

    if (amount === 0) continue;

    transactions.push({
      date: parsedDate,
      description: descStr,
      amount,
      type,
      category: catCol ? rawRow[catCol] : undefined,
      reference: refCol ? rawRow[refCol] : undefined,
      rawRow,
    });
  }

  return transactions;
}

// ── Detect duplicates against existing receipts ───────────────────────────
async function findDuplicate(
  userId: string,
  transaction: ParsedTransaction
): Promise<{ isDuplicate: boolean; existingId?: string; shouldMerge: boolean }> {
  const normalized = normalizeDescription(transaction.description);

  // Check by external_id / reference first
  if (transaction.reference) {
    const { data } = await supabase
      .from('receipts')
      .select('id, import_source')
      .eq('user_id', userId)
      .eq('external_id', transaction.reference)
      .maybeSingle();

    if (data) {
      return {
        isDuplicate: true,
        existingId: data.id,
        shouldMerge: data.import_source === 'photo', // merge if it was manually uploaded
      };
    }
  }

  // Fuzzy match: same date ± 2 days, similar amount, similar description
  const dateObj = new Date(transaction.date);
  const dateMinus2 = format(new Date(dateObj.getTime() - 2 * 86400000), 'yyyy-MM-dd');
  const datePlus2 = format(new Date(dateObj.getTime() + 2 * 86400000), 'yyyy-MM-dd');

  const { data: candidates } = await supabase
    .from('receipts')
    .select('id, merchant, total_amount, receipt_date, import_source, ocr_text')
    .eq('user_id', userId)
    .gte('receipt_date', dateMinus2)
    .lte('receipt_date', datePlus2)
    .gte('total_amount', transaction.amount * 0.95)
    .lte('total_amount', transaction.amount * 1.05);

  for (const candidate of candidates || []) {
    const candidateNorm = normalizeDescription(candidate.merchant || '');
    // Simple similarity: check if one contains the other
    if (
      candidateNorm.includes(normalized.substring(0, 10)) ||
      normalized.includes(candidateNorm.substring(0, 10))
    ) {
      return {
        isDuplicate: true,
        existingId: candidate.id,
        shouldMerge: candidate.import_source === 'photo',
      };
    }
  }

  return { isDuplicate: false, shouldMerge: false };
}

// ── Main import mutation ───────────────────────────────────────────────────
export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactions,
      fileName,
      importSource = 'csv',
    }: {
      transactions: ParsedTransaction[];
      fileName: string;
      importSource?: 'csv' | 'qbo';
    }): Promise<ImportResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create import session
      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          user_id: user.id,
          file_name: fileName,
          import_source: importSource,
          total_rows: transactions.length,
          status: 'processing',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      const sessionId = session.id;

      let imported = 0;
      let duplicates = 0;
      let merged = 0;
      let errors = 0;

      for (const tx of transactions) {
        try {
          const { isDuplicate, existingId, shouldMerge } = await findDuplicate(user.id, tx);

          if (isDuplicate && !shouldMerge) {
            duplicates++;
            continue;
          }

          if (isDuplicate && shouldMerge && existingId) {
            // Merge: update the existing receipt with import metadata
            await supabase
              .from('receipts')
              .update({
                external_id: transaction.reference || null,
                import_source: importSource,
                import_session_id: sessionId,
                merged_with_id: existingId,
              })
              .eq('id', existingId);
            merged++;
            continue;
          }

          // New transaction — insert as receipt
          if (tx.type === 'debit') {
            await supabase.from('receipts').insert({
              user_id: user.id,
              merchant: tx.description,
              receipt_date: tx.date,
              total_amount: tx.amount,
              status: 'reviewed',
              import_source: importSource,
              external_id: tx.reference || null,
              import_session_id: sessionId,
            });
          } else {
            // Credit = income transaction
            await supabase.from('income_transactions').insert({
              user_id: user.id,
              amount: tx.amount,
              description: tx.description,
              income_type: 'other',
              transaction_date: tx.date,
              import_source: importSource,
              external_id: tx.reference || null,
            });
          }
          imported++;
        } catch (err) {
          console.error('Error importing transaction:', err);
          errors++;
        }
      }

      // Update session
      await supabase
        .from('import_sessions')
        .update({
          imported_rows: imported,
          duplicate_rows: duplicates,
          merged_rows: merged,
          status: 'complete',
        })
        .eq('id', sessionId);

      return { imported, duplicates, merged, errors, sessionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['income-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-income'] });
      queryClient.invalidateQueries({ queryKey: ['annual-income'] });
      queryClient.invalidateQueries({ queryKey: ['savings-rate'] });

      const parts = [`${result.imported} imported`];
      if (result.merged > 0) parts.push(`${result.merged} merged with existing`);
      if (result.duplicates > 0) parts.push(`${result.duplicates} duplicates skipped`);
      if (result.errors > 0) parts.push(`${result.errors} errors`);

      toast.success(`Import complete: ${parts.join(', ')}`);
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
