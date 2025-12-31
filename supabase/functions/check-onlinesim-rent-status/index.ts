// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

serve(async (req) => {
    console.log('🔍 [CHECK-ONLINESIM-RENT] Cron job started')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get OnlineSIM API key
        let ONLINESIM_API_KEY = Deno.env.get('ONLINESIM_API_KEY')

        const { data: setting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'onlinesim_api_key')
            .single()

        if (setting?.value) {
            ONLINESIM_API_KEY = setting.value
        }

        if (!ONLINESIM_API_KEY) {
            console.warn('⚠️ [CHECK-ONLINESIM-RENT] OnlineSIM API key not configured, skipping')
            return new Response(
                JSON.stringify({ success: true, message: 'OnlineSIM not configured' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get all active OnlineSIM rentals
        const { data: rentals, error: rentalsError } = await supabaseClient
            .from('rentals')
            .select('*')
            .eq('provider', 'onlinesim')
            .eq('status', 'active')

        if (rentalsError) {
            throw rentalsError
        }

        if (!rentals || rentals.length === 0) {
            console.log('ℹ️ [CHECK-ONLINESIM-RENT] No active OnlineSIM rentals')
            return new Response(
                JSON.stringify({ success: true, message: 'No active rentals', checked: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`🔍 [CHECK-ONLINESIM-RENT] Checking ${rentals.length} active OnlineSIM rentals`)

        let updated = 0
        let expired = 0
        let errors = 0

        for (const rental of rentals) {
            try {
                const tzid = parseInt(rental.rent_id || rental.rental_id)

                if (!tzid) {
                    console.warn(`⚠️ [CHECK-ONLINESIM-RENT] Invalid tzid for rental ${rental.id}`)
                    continue
                }

                // Check if expired
                const expiresAt = new Date(rental.expires_at || rental.end_date)
                const now = new Date()

                if (expiresAt < now) {
                    console.log(`⏰ [CHECK-ONLINESIM-RENT] Rental ${rental.id} expired`)

                    // Close on OnlineSIM and mark as completed
                    try {
                        await fetch(`${ONLINESIM_BASE_URL}/setOperationOk.php?apikey=${ONLINESIM_API_KEY}&tzid=${tzid}`)
                    } catch (e) {
                        console.warn(`⚠️ [CHECK-ONLINESIM-RENT] Could not close rental ${tzid} on OnlineSIM:`, e)
                    }

                    await supabaseClient
                        .from('rentals')
                        .update({ status: 'completed', updated_at: new Date().toISOString() })
                        .eq('id', rental.id)

                    // Commit frozen funds
                    await supabaseClient.rpc('atomic_commit', {
                        p_user_id: rental.user_id,
                        p_activation_id: null,
                        p_rental_id: rental.id,
                        p_transaction_id: null,
                        p_reason: 'OnlineSIM rent completed'
                    })

                    expired++
                    continue
                }

                // Get messages from OnlineSIM
                const stateUrl = `${ONLINESIM_BASE_URL}/getState.php?apikey=${ONLINESIM_API_KEY}&tzid=${tzid}&message_to_code=1`
                const stateResponse = await fetch(stateUrl)
                const stateData = await stateResponse.json()

                console.log(`📥 [CHECK-ONLINESIM-RENT] State for ${tzid}:`, JSON.stringify(stateData).substring(0, 200))

                let messageCount = rental.message_count || 0
                let newMessages = 0

                if (Array.isArray(stateData)) {
                    // Count messages
                    const messages = stateData.filter((item: any) => item.msg)
                    newMessages = messages.length

                    if (newMessages > messageCount) {
                        console.log(`📧 [CHECK-ONLINESIM-RENT] New messages for ${rental.id}: ${messageCount} → ${newMessages}`)

                        await supabaseClient
                            .from('rentals')
                            .update({
                                message_count: newMessages,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', rental.id)

                        updated++
                    }
                }

            } catch (error: any) {
                console.error(`❌ [CHECK-ONLINESIM-RENT] Error checking rental ${rental.id}:`, error.message)
                errors++
            }
        }

        console.log(`✅ [CHECK-ONLINESIM-RENT] Completed: ${rentals.length} checked, ${updated} updated, ${expired} expired, ${errors} errors`)

        return new Response(
            JSON.stringify({
                success: true,
                checked: rentals.length,
                updated,
                expired,
                errors
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CHECK-ONLINESIM-RENT] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
