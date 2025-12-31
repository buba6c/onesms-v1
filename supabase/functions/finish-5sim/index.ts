// @ts-nocheck
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
        const { orderId } = await req.json()

        if (!orderId) {
            return new Response(
                JSON.stringify({ error: 'Missing orderId' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        console.log('✅ [FINISH-5SIM] Finishing activation:', orderId)

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get 5sim API key from DB or env
        let FIVESIM_API_KEY = Deno.env.get('FIVESIM_API_KEY')

        const { data: fivesimSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', '5sim_api_key')
            .single()

        if (fivesimSetting?.value) {
            FIVESIM_API_KEY = fivesimSetting.value
        }

        if (!FIVESIM_API_KEY) {
            throw new Error('5sim API key not configured')
        }

        // Verify user authentication
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token!)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Find activation in database
        const { data: activation, error: fetchError } = await supabase
            .from('activations')
            .select('*')
            .eq('order_id', orderId)
            .eq('user_id', user.id)
            .eq('provider', '5sim')
            .single()

        if (fetchError || !activation) {
            return new Response(
                JSON.stringify({ error: '5sim activation not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Check that activation has SMS code
        if (!activation.sms_code) {
            return new Response(
                JSON.stringify({ error: 'No SMS code received yet' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Call 5sim finish API
        // 5sim endpoint: GET /user/finish/{id}
        const finishUrl = `https://5sim.net/v1/user/finish/${orderId}`
        console.log('🌐 [FINISH-5SIM] Calling 5sim finish API:', finishUrl)

        const response = await fetch(finishUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FIVESIM_API_KEY}`,
                'Accept': 'application/json'
            }
        })

        const responseData = await response.json()
        console.log('📥 [FINISH-5SIM] API Response:', JSON.stringify(responseData))

        // 5sim returns the order with updated status on success
        // Check if status is now FINISHED
        if (responseData.status === 'FINISHED' || response.ok) {
            // Update status in database
            await supabase
                .from('activations')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', orderId)

            console.log('✅ [FINISH-5SIM] Activation completed')

            return new Response(
                JSON.stringify({
                    success: true,
                    message: '5sim activation finished successfully',
                    status: 'completed'
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        } else if (responseData.error) {
            console.error('❌ [FINISH-5SIM] 5sim API error:', responseData.error)
            return new Response(
                JSON.stringify({ error: responseData.error }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        } else {
            throw new Error(`Unexpected response: ${JSON.stringify(responseData)}`)
        }

    } catch (error) {
        console.error('❌ [FINISH-5SIM] Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
