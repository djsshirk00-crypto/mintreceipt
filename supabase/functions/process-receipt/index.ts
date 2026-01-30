import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CategorySplit {
  groceries: number;
  household: number;
  clothing: number;
  other: number;
}

interface ProcessedReceipt {
  merchant: string;
  date: string;
  total: number;
  categories: CategorySplit;
  lineItems: Array<{
    description: string;
    amount: number;
    category: string;
  }>;
  confidence: number;
}

interface LineItemHistory {
  description: string;
  normalized_description: string;
  legacy_category: string;
  occurrence_count: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { receiptId } = await req.json();
    
    if (!receiptId) {
      throw new Error('receiptId is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get receipt record
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (fetchError || !receipt) {
      throw new Error(`Receipt not found: ${fetchError?.message}`);
    }

    console.log(`Processing receipt ${receiptId} for user ${receipt.user_id}`);

    // Update status to processing
    await supabase
      .from('receipts')
      .update({ status: 'processing' })
      .eq('id', receiptId);

    // Fetch user's line item history for AI learning (few-shot examples)
    const { data: historyData } = await supabase
      .from('line_item_history')
      .select('description, normalized_description, legacy_category, occurrence_count')
      .eq('user_id', receipt.user_id)
      .order('occurrence_count', { ascending: false })
      .limit(50);

    const learnedItems: LineItemHistory[] = historyData || [];
    console.log(`Found ${learnedItems.length} learned categorizations for user`);

    // Get the image from storage
    if (!receipt.image_path) {
      throw new Error('No image path found for receipt');
    }

    const { data: imageData, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(receipt.image_path);

    if (downloadError || !imageData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`);
    }

    // Convert file to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Detect MIME type from file extension
    const filePath = receipt.image_path.toLowerCase();
    let mimeType = 'image/jpeg'; // default
    if (filePath.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (filePath.endsWith('.webp')) {
      mimeType = 'image/webp';
    } else if (filePath.endsWith('.heic')) {
      mimeType = 'image/heic';
    } else if (filePath.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    }
    
    console.log(`Processing file with MIME type: ${mimeType}`);

    // Call Lovable AI to process the receipt
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build few-shot learning examples from user history
    let learnedExamples = '';
    if (learnedItems.length > 0) {
      const examples = learnedItems
        .slice(0, 20) // Top 20 most frequent
        .map(item => `- "${item.description}" → ${item.legacy_category}`)
        .join('\n');
      learnedExamples = `

IMPORTANT: This user has previously categorized items like this. Use these as guidance:
${examples}

When you see similar items, use the same category the user has chosen before.`;
    }

    const systemPrompt = `You are a receipt processing assistant. Analyze the receipt image and extract:
1. Merchant/store name
2. Date of purchase (YYYY-MM-DD format)
3. Total amount
4. Line items with their prices
5. Categorize each line item into exactly one of these categories:
   - groceries: food, beverages, snacks, produce, meat, dairy, bakery items
   - household: cleaning supplies, paper products, toiletries, home goods, tools, pet supplies
   - clothing: apparel, shoes, accessories
   - other: electronics, toys, gifts, anything that doesn't fit above
${learnedExamples}

Return a JSON object with this exact structure:
{
  "merchant": "Store Name",
  "date": "YYYY-MM-DD",
  "total": 123.45,
  "categories": {
    "groceries": 50.00,
    "household": 30.00,
    "clothing": 0,
    "other": 43.45
  },
  "lineItems": [
    {"description": "Item name", "amount": 10.00, "category": "groceries"}
  ],
  "confidence": 0.85
}

IMPORTANT:
- The sum of categories MUST equal the total
- If you can't read part of the receipt, estimate based on what you can see
- Return confidence between 0 and 1 based on image quality and readability
- If the receipt is unreadable, return confidence < 0.3`;

    console.log('Calling Lovable AI for OCR and categorization...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Please analyze this receipt and extract the information.' },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:${mimeType};base64,${base64Image}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add funds to continue.');
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI processing failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    console.log('AI response received:', content?.substring(0, 200));

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON from the response
    let parsed: ProcessedReceipt;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse receipt data from AI');
    }

    // Validate and update the receipt
    const updateData = {
      status: parsed.confidence >= 0.3 ? 'processed' : 'failed',
      merchant: parsed.merchant || null,
      receipt_date: parsed.date || null,
      total_amount: parsed.total || null,
      groceries_amount: parsed.categories?.groceries || 0,
      household_amount: parsed.categories?.household || 0,
      clothing_amount: parsed.categories?.clothing || 0,
      other_amount: parsed.categories?.other || 0,
      confidence_score: parsed.confidence || 0,
      line_items: parsed.lineItems || [],
      raw_ai_output: parsed,
      processed_at: new Date().toISOString(),
      error_message: parsed.confidence < 0.3 ? 'Low confidence - receipt may be unreadable' : null,
    };

    const { error: updateError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId);

    if (updateError) {
      throw new Error(`Failed to update receipt: ${updateError.message}`);
    }

    console.log(`Receipt ${receiptId} processed successfully with confidence ${parsed.confidence}`);

    return new Response(JSON.stringify({ 
      success: true, 
      data: updateData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing receipt:', error);
    
    // Try to update receipt with error status
    try {
      const { receiptId } = await req.clone().json();
      if (receiptId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('receipts')
          .update({ 
            status: 'failed', 
            error_message: error instanceof Error ? error.message : 'Unknown error' 
          })
          .eq('id', receiptId);
      }
    } catch (e) {
      console.error('Failed to update error status:', e);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
