export type ReceiptStatus = 'inbox' | 'processing' | 'processed' | 'failed' | 'reviewed';

export type Category = 'groceries' | 'household' | 'clothing' | 'other';

export interface CategorySplit {
  groceries: number;
  household: number;
  clothing: number;
  other: number;
}

export interface LineItem {
  description: string;
  amount: number;
  category: Category;
  confidence: number;
}

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

export interface CategoryTotals {
  groceries: number;
  household: number;
  clothing: number;
  other: number;
  total: number;
}

export const CATEGORY_CONFIG: Record<Category, { label: string; color: string; icon: string }> = {
  groceries: { label: 'Groceries', color: 'groceries', icon: '🥬' },
  household: { label: 'Household', color: 'household', icon: '🏠' },
  clothing: { label: 'Clothing', color: 'clothing', icon: '👕' },
  other: { label: 'Other', color: 'other', icon: '📦' },
};
