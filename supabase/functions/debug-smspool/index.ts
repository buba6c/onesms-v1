
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMSPoolClient } from '../_shared/smspool.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const logs = []

        // Get API Key
        let apiKey = Deno.env.get('SMSPOOL_API_KEY')
        const { data: s } = await supabaseClient.from('system_settings').select('value').eq('key', 'smspool_api_key').single()
        if (s?.value) apiKey = s.value
        if (!apiKey) throw new Error('No API Key')

        const client = new SMSPoolClient(apiKey)

        // Step 1: Purchase
        logs.push('🛒 Step 1: Purchasing Telegram US...')
        const purchaseResult = await client.purchaseNumber('US', 'telegram')
        logs.push('Purchase Result: ' + JSON.stringify(purchaseResult))

        if (purchaseResult.success !== 1 || !purchaseResult.order_id) {
            logs.push('❌ Purchase failed, cannot continue test')
            return new Response(JSON.stringify({ logs }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const orderId = purchaseResult.order_id
        logs.push(`✅ Got order_id: ${orderId}`)

        // Step 2: Wait
        logs.push('⏳ Step 2: Waiting 5 seconds...')
        await new Promise(r => setTimeout(r, 5000))

        // Step 3: Check Status
        logs.push('🔍 Step 3: Checking status...')
        const checkResult = await client.checkOrder(orderId)
        logs.push('Check Result (RAW): ' + JSON.stringify(checkResult))
        logs.push(`Status type: ${typeof checkResult.status}, Value: ${checkResult.status}`)

        // Interpret
        const statusNum = Number(checkResult.status)
        if (statusNum === 1) {
            logs.push('✅ Status 1 = PENDING (Normal, waiting for SMS)')
        } else if (statusNum === 2) {
            logs.push('📩 Status 2 = COMPLETED (SMS received!)')
        } else if (statusNum === 3) {
            logs.push('❌ Status 3 = CANCELLED/EXPIRED (SMSPool cancelled!)')
        } else {
            logs.push(`🤔 Unknown status: ${statusNum}`)
        }

        // Step 4: Cancel to get refund
        logs.push('🗑️ Step 4: Cancelling order (cleanup)...')
        const cancelResult = await client.cancelOrder(orderId)
        logs.push('Cancel Result: ' + JSON.stringify(cancelResult))

        return new Response(JSON.stringify({ logs }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }
})
