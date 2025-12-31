// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

/**
 * Get OnlineSIM rent inbox messages
 * Similar to get-sms-activate-inbox but for OnlineSIM provider
 */
serve(async (req) => {
    console.log('📨 [GET-ONLINESIM-RENT-INBOX] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { rentalId, userId } = await req.json()

        if (!rentalId) {
            throw new Error('Missing rentalId')
        }

        console.log('📨 [GET-ONLINESIM-RENT-INBOX] Fetching inbox for rental:', rentalId)

        // Get rental
        const { data: rental, error: rentalError } = await supabaseClient
            .from('rentals')
            .select('*')
            .eq('id', rentalId)
            .eq('provider', 'onlinesim')
            .single()

        if (rentalError || !rental) {
            throw new Error('Rental not found or not from OnlineSIM')
        }

        // Verify ownership
        if (userId && rental.user_id !== userId) {
            throw new Error('Unauthorized access to rental')
        }

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
            throw new Error('OnlineSIM API key not configured')
        }

        const tzid = parseInt(rental.rent_id || rental.rental_id)

        // Fetch messages from OnlineSIM
        const stateUrl = `${ONLINESIM_BASE_URL}/getState.php?apikey=${ONLINESIM_API_KEY}&tzid=${tzid}&message_to_code=1`

        console.log('🌐 [GET-ONLINESIM-RENT-INBOX] API Call for tzid:', tzid)

        const stateResponse = await fetch(stateUrl)
        const stateData = await stateResponse.json()

        console.log('📥 [GET-ONLINESIM-RENT-INBOX] Response:', JSON.stringify(stateData).substring(0, 300))

        const messages: any[] = []

        if (Array.isArray(stateData)) {
            for (const item of stateData) {
                if (item.msg) {
                    const msgData = item.msg

                    // Extract code from message
                    let code = msgData.code || null
                    if (!code && msgData.text) {
                        // Try to extract code from text
                        const codeMatch = msgData.text.match(/\b(\d{4,8})\b/)
                        if (codeMatch) code = codeMatch[1]
                    }

                    messages.push({
                        text: msgData.text || msgData || '',
                        code: code,
                        service: msgData.service || item.service || 'unknown',
                        date: msgData.date || item.created_at || new Date().toISOString()
                    })
                }
            }
        }

        // Update message count
        if (messages.length > (rental.message_count || 0)) {
            await supabaseClient
                .from('rentals')
                .update({
                    message_count: messages.length,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId)
        }

        console.log(`✅ [GET-ONLINESIM-RENT-INBOX] Found ${messages.length} messages`)

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    messages,
                    rental_id: rental.id,
                    phone: rental.phone
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [GET-ONLINESIM-RENT-INBOX] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
