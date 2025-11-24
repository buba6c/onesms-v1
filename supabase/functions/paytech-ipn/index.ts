import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayTechIPN {
  type_event: string;
  ref_command: string;
  item_name: string;
  item_price: string;
  devise: string;
  command_name: string;
  env: string;
  token: string;
  api_key_sha256: string;
  api_secret_sha256: string;
  custom_field?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse IPN data
    const ipnData: PayTechIPN = await req.json();
    console.log('Received PayTech IPN:', ipnData);

    // Verify API Key hash
    const apiKey = Deno.env.get('PAYTECH_API_KEY') ?? '';
    const apiSecret = Deno.env.get('PAYTECH_API_SECRET') ?? '';
    
    const expectedApiKeyHash = createHmac('sha256', '')
      .update(apiKey)
      .digest('hex');
    
    const expectedApiSecretHash = createHmac('sha256', '')
      .update(apiSecret)
      .digest('hex');

    if (ipnData.api_key_sha256 !== expectedApiKeyHash || 
        ipnData.api_secret_sha256 !== expectedApiSecretHash) {
      console.error('Invalid IPN signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find transaction by reference
    const { data: transaction, error: findError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('payment_ref', ipnData.ref_command)
      .single();

    if (findError || !transaction) {
      console.error('Transaction not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update transaction status
    const newStatus = ipnData.type_event === 'sale_complete' ? 'completed' : 'failed';

    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      throw updateError;
    }

    // If payment successful, add credits to user
    if (newStatus === 'completed') {
      const { data: addCreditsResult, error: addCreditsError } = await supabaseClient
        .rpc('add_credits', {
          p_user_id: transaction.user_id,
          p_amount: transaction.amount,
          p_type: 'recharge',
          p_transaction_id: transaction.id,
          p_description: `Rechargement via PayTech - ${ipnData.ref_command}`,
        });

      if (addCreditsError || !addCreditsResult) {
        console.error('Error adding credits:', addCreditsError);
        throw addCreditsError;
      }

      console.log('Credits added successfully:', {
        user_id: transaction.user_id,
        amount: transaction.amount,
      });
    }

    // Log event
    await supabaseClient
      .from('system_logs')
      .insert({
        level: newStatus === 'completed' ? 'info' : 'warning',
        category: 'paytech_ipn',
        message: `Payment ${newStatus} for ref ${ipnData.ref_command}`,
        metadata: {
          transaction_id: transaction.id,
          ref_command: ipnData.ref_command,
          amount: ipnData.item_price,
          type_event: ipnData.type_event,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'IPN processed successfully',
        status: newStatus,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('IPN error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
