import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSWebhook {
  id: number;
  phone: string;
  sms?: {
    text: string;
    sender: string;
    date: string;
  }[];
  status: string;
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

    // Parse webhook data from 5sim
    const webhookData: SMSWebhook = await req.json();
    console.log('Received webhook:', webhookData);

    // Find the virtual number in our database
    const { data: virtualNumber, error: findError } = await supabaseClient
      .from('virtual_numbers')
      .select('*')
      .eq('provider_id', webhookData.id.toString())
      .single();

    if (findError || !virtualNumber) {
      console.error('Virtual number not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Virtual number not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process SMS messages
    if (webhookData.sms && webhookData.sms.length > 0) {
      for (const sms of webhookData.sms) {
        // Extract verification code from SMS text
        const codeMatch = sms.text.match(/\b\d{4,8}\b/);
        const extractedCode = codeMatch ? codeMatch[0] : null;

        // Insert SMS into database
        const { error: insertError } = await supabaseClient
          .from('sms_received')
          .insert({
            user_id: virtualNumber.user_id,
            virtual_number_id: virtualNumber.id,
            sender: sms.sender,
            text: sms.text,
            code: extractedCode,
            received_at: sms.date,
          });

        if (insertError) {
          console.error('Error inserting SMS:', insertError);
          continue;
        }

        console.log('SMS saved:', {
          number: webhookData.phone,
          sender: sms.sender,
          code: extractedCode,
        });
      }

      // Update virtual number status to 'completed' if SMS received
      const { error: updateError } = await supabaseClient
        .from('virtual_numbers')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', virtualNumber.id);

      if (updateError) {
        console.error('Error updating virtual number:', updateError);
      }

      // Log event
      await supabaseClient
        .from('system_logs')
        .insert({
          level: 'info',
          category: 'sms_webhook',
          message: `SMS received for number ${webhookData.phone}`,
          metadata: {
            virtual_number_id: virtualNumber.id,
            sms_count: webhookData.sms.length,
            provider_id: webhookData.id,
          },
        });
    }

    // Update status if changed
    if (webhookData.status && webhookData.status !== virtualNumber.status) {
      const statusMap: Record<string, string> = {
        'RECEIVED': 'completed',
        'CANCELLED': 'cancelled',
        'TIMEOUT': 'expired',
      };

      const newStatus = statusMap[webhookData.status] || virtualNumber.status;

      await supabaseClient
        .from('virtual_numbers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', virtualNumber.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        sms_count: webhookData.sms?.length || 0,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
