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

        // Get activation
        const activationId = '5bde8e90-e0db-4308-9948-d504a3dabc84'

        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        if (actError || !activation) {
            throw new Error('Activation not found')
        }

        console.log('📋 Activation:', {
            id: activation.id,
            order_id: activation.order_id,
            status: activation.status,
            charged: activation.charged,
            frozen_amount: activation.frozen_amount,
            sms_code: activation.sms_code
        })

        // Check if already processed
        if (activation.charged && activation.sms_code) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Already processed',
                    activation: {
                        status: activation.status,
                        sms_code: activation.sms_code,
                        charged: activation.charged
                    }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call atomic_commit to test
        console.log('🧪 Testing atomic_commit...')
        const { data: commitResult, error: commitError } = await supabaseClient.rpc('atomic_commit', {
            p_user_id: activation.user_id,
            p_activation_id: activationId,
            p_rental_id: null,
            p_transaction_id: null,
            p_reason: 'Test commit - SMSPool SMS received'
        })

        if (commitError) {
            console.error('❌ Commit Error:', commitError)
            throw new Error(`atomic_commit failed: ${commitError.message}`)
        }

        console.log('✅ Commit Result:', commitResult)

        // Get updated activation
        const { data: updatedAct } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Commit test successful',
                commit_result: commitResult,
                updated_activation: {
                    status: updatedAct?.status,
                    charged: updatedAct?.charged,
                    sms_code: updatedAct?.sms_code
                }
            }),
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
