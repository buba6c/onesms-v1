import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRIZZLY_BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('🐻 [BUY-GRIZZLY] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get API Key
        let GRIZZLY_API_KEY = Deno.env.get('GRIZZLY_API_KEY')
        const { data: grizzlySetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'grizzly_api_key')
            .single()

        if (grizzlySetting?.value) {
            GRIZZLY_API_KEY = grizzlySetting.value
        }

        if (!GRIZZLY_API_KEY) {
            throw new Error('Grizzly SMS API key not configured')
        }

        // Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error('Unauthorized - No token provided')
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !user) throw new Error('Unauthorized')

        // Parse Request (accept both 'service' and 'product' for compatibility)
        const { country, service, product, userId, expectedPrice } = await req.json()
        const serviceCode = product || service  // Use product if available, else service
        console.log('🐻 [BUY-GRIZZLY] Request:', { country, service, product, serviceCode, userId, expectedPrice })

        // 1. Balance Check & Freeze
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', userId)
            .single()

        if (profileError || !userProfile) throw new Error('User profile not found')

        const frozenBalance = userProfile.frozen_balance || 0
        const availableBalance = userProfile.balance - frozenBalance
        const price = expectedPrice || 1.0

        if (availableBalance < price) {
            throw new Error(`Insufficient balance: Required ${price} Ⓐ`)
        }

        const currentBalance = userProfile.balance

        // 2. Create Transaction & Ledger (Freeze)
        const { data: txn, error: txnError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'purchase',
                amount: -price,
                status: 'pending',
                description: `Purchase Grizzly activation for ${serviceCode} (${country})`,
                provider: 'grizzly',
                balance_before: currentBalance,
                balance_after: currentBalance
            })
            .select()
            .single()

        if (txnError) throw new Error(`Transaction failed: ${txnError.message}`)

        await supabaseClient.from('balance_operations').insert({
            user_id: userId,
            operation_type: 'freeze',
            amount: price,
            balance_before: currentBalance,
            balance_after: currentBalance,
            frozen_before: frozenBalance,
            frozen_after: frozenBalance + price,
            reason: 'Freeze credits for Grizzly purchase'
        })

        // 3. Freeze credits
        await supabaseClient.from('users').update({
            frozen_balance: frozenBalance + price
        }).eq('id', userId)

        // 4. API Call to Grizzly
        // GET /stubs/handler_api.php?api_key=...&action=getNumber&service=...&country=...
        const url = `${GRIZZLY_BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=${serviceCode}&country=${country}`
        console.log('🌐 [BUY-GRIZZLY] Calling API:', url.replace(GRIZZLY_API_KEY, '***'))

        const response = await fetch(url)
        const text = await response.text()
        console.log('📥 [BUY-GRIZZLY] Response:', text)

        // Response format: "ACCESS_NUMBER:12345:123456789" (Status:ID:Phone)
        if (!text.includes('ACCESS_NUMBER')) {
            // Failed - Rollback using atomic_refund
            console.error('❌ [BUY-GRIZZLY] API Failed:', text)

            // Create a temporary failed activation for atomic_refund to work with
            const { data: failedActivation } = await supabaseClient
                .from('activations')
                .insert({
                    user_id: userId,
                    order_id: `FAILED_${Date.now()}`,
                    phone: 'API_FAILED',
                    service_code: product,
                    country_code: country,
                    price: price,
                    frozen_amount: price,
                    status: 'failed',
                    provider: 'grizzly',
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            // Use atomic_refund for complete rollback (balance_operations + provider_performance)
            if (failedActivation) {
                await supabaseClient.rpc('atomic_refund', {
                    p_activation_id: failedActivation.id
                })

                // Link transaction to failed activation
                await supabaseClient.from('transactions').update({
                    related_activation_id: failedActivation.id,
                    status: 'failed'
                }).eq('id', txn.id)
            }

            throw new Error(text.includes('NO_NUMBERS') ? 'NO_NUMBERS' : `Grizzly API Error: ${text}`)
        }

        // Success - Parse ID and Phone
        const parts = text.split(':')
        const activationId = parts[1]
        const phone = parts[2]

        // 5. Save Activation
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 mins

        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .insert({
                user_id: userId,
                order_id: activationId,
                phone: phone,
                service_code: serviceCode,
                country_code: country,
                operator: 'any',  // CRITICAL: Required NOT NULL field
                price: price,
                frozen_amount: price,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                provider: 'grizzly'
            })
            .select()
            .single()

        if (actError) {
            // Critical DB Error - Number was purchased but DB save failed
            // Create orphaned activation for admin investigation + automatic refund
            console.error('❌ [BUY-GRIZZLY] CRITICAL: DB Save Error - Number purchased but not saved:', actError)

            const { data: orphanActivation } = await supabaseClient
                .from('activations')
                .insert({
                    user_id: userId,
                    order_id: activationId, // IMPORTANT: We have the actual order ID from Grizzly
                    phone: phone,
                    service_code: product,
                    country_code: country,
                    price: price,
                    frozen_amount: price,
                    status: 'orphaned', // Special status for admin to investigate
                    provider: 'grizzly',
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            // Refund user immediately using atomic_refund
            if (orphanActivation) {
                await supabaseClient.rpc('atomic_refund', {
                    p_activation_id: orphanActivation.id
                })

                // Link transaction
                await supabaseClient.from('transactions').update({
                    related_activation_id: orphanActivation.id,
                    status: 'refunded'
                }).eq('id', txn.id)
            }

            throw new Error('CRITICAL: Number purchased from Grizzly but DB save failed - User refunded automatically. Admin should investigate orphaned activation.')
        }

        // Link transaction
        await supabaseClient.from('transactions').update({ related_activation_id: activation.id }).eq('id', txn.id)

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: activation.id,
                    activation_id: activationId,
                    phone: phone,
                    service: product,
                    country: country,
                    price: price,
                    status: 'pending',
                    expires: expiresAt.toISOString()
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [BUY-GRIZZLY] Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
