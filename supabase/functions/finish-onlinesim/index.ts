import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('✅ [FINISH-ONLINESIM] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let ONLINESIM_API_KEY = Deno.env.get('ONLINESIM_API_KEY')
        const { data: onlinesimSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'onlinesim_api_key')
            .single()

        if (onlinesimSetting?.value) {
            ONLINESIM_API_KEY = onlinesimSetting.value
        }

        if (!ONLINESIM_API_KEY) {
            throw new Error('OnlineSIM API key not configured')
        }

        const { activationId } = await req.json()

        if (!activationId) {
            throw new Error('Missing activationId')
        }

        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        if (actError || !activation) {
            throw new Error(`Activation not found: ${activationId}`)
        }

        if (activation.provider !== 'onlinesim') {
            throw new Error('This activation is not from OnlineSIM')
        }

        // Call OnlineSIM setOperationOk to mark as finished
        const finishUrl = `${ONLINESIM_BASE_URL}/setOperationOk.php?apikey=${ONLINESIM_API_KEY}&tzid=${activation.order_id}`

        console.log('🌐 [FINISH-ONLINESIM] Calling finish API')

        const response = await fetch(finishUrl)
        const responseText = await response.text()

        console.log('📥 [FINISH-ONLINESIM] Response:', responseText)

        // Update activation status to completed
        await supabaseClient
            .from('activations')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', activationId)

        console.log('✅ [FINISH-ONLINESIM] Activation marked as completed')

        return new Response(
            JSON.stringify({
                success: true,
                message: 'OnlineSIM activation finished successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [FINISH-ONLINESIM] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
