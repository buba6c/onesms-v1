import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get SMSPool API Key from system_settings
        const { data: setting, error: settingError } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'smspool_api_key')
            .single()

        if (settingError || !setting?.value) {
            throw new Error('SMSPool API key not found')
        }

        const apiKey = setting.value

        // Get order_id from request body or use default
        const { order_id } = await req.json().catch(() => ({ order_id: 'ZQEWWCZN' }))

        console.log(`🔍 Checking SMSPool order: ${order_id}`)

        // Call SMSPool API
        const checkUrl = `https://api.smspool.net/sms/check?key=${apiKey}&orderid=${order_id}`
        const response = await fetch(checkUrl)
        const data = await response.json()

        console.log('📥 SMSPool Raw Response:', JSON.stringify(data, null, 2))

        return new Response(
            JSON.stringify({
                success: true,
                order_id,
                raw_response: data,
                interpretation: {
                    status: data.status === 1 ? 'Pending' : data.status === 2 ? 'Completed' : data.status === 3 ? 'Expired/Cancelled' : 'Unknown',
                    sms_code: data.sms || null,
                    full_sms: data.full_sms || null,
                    sender: data.sender || null,
                    time_left: data.time_left || null
                }
            }, null, 2),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
