import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TEXTVERIFIED_BASE_URL = 'https://www.textverified.com/api/pub/v2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('💎 [BUY-TEXTVERIFIED] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get Credentials
        let API_KEY = Deno.env.get('TEXTVERIFIED_API_KEY')
        let API_USERNAME = Deno.env.get('TEXTVERIFIED_API_USERNAME')
        let SIMPLE_TOKEN = Deno.env.get('TEXTVERIFIED_SIMPLE_TOKEN')

        const { data: settings } = await supabaseClient
            .from('system_settings')
            .select('key, value')
            .in('key', ['textverified_api_key', 'textverified_api_username', 'textverified_simple_token'])

        settings?.forEach((s: any) => {
            if (s.key === 'textverified_api_key') API_KEY = s.value
            if (s.key === 'textverified_api_username') API_USERNAME = s.value
            if (s.key === 'textverified_simple_token') SIMPLE_TOKEN = s.value
        })

        let bearerToken = ''

        console.log('💎 [BUY-TEXTVERIFIED] Generating Dynamic Token (Standard Auth)...')
        if (!API_KEY || !API_USERNAME) {
            throw new Error('TextVerified credentials (simple_token OR api_key+username) missing')
        }

        console.log('🔐 [BUY-TEXTVERIFIED] Authenticating with Headers...')
        const authRes = await fetch(`https://www.textverified.com/api/pub/v2/auth`, {
            method: 'POST',
            headers: {
                'Content-Length': '0',
                'X-API-KEY': API_KEY,
                'X-API-USERNAME': API_USERNAME
            }
        })

        if (!authRes.ok) {
            const errText = await authRes.text()
            throw new Error(`TextVerified Auth Failed (${authRes.status}): ${errText}`)
        }

        const authText = await authRes.text()
        console.log('🔐 [BUY-TEXTVERIFIED] Auth Response Raw:', authText)

        try {
            const authData = JSON.parse(authText)
            bearerToken = authData.token || authData.bearer_token
        } catch (e: any) {
            console.error('❌ [BUY-TEXTVERIFIED] JSON Parse Error (Auth):', e)
            throw new Error(`TextVerified Auth JSON Error: ${e.message}. Raw: ${authText}`)
        }

        if (!bearerToken) {
            console.error('❌ [BUY-TEXTVERIFIED] No token in response:', authText)
            throw new Error(`TextVerified Auth Error: No token returned. Response: ${authText}`)
        }

        // 3. User Balance Check
        const { country, service, product, userId, expectedPrice } = await req.json()

        const SERVICE_MAP: Record<string, string> = {
            'wa': 'whatsapp',
            'tg': 'telegram',
            'go': 'google',
            'fb': 'facebook',
            'ig': 'instagram',
            'mm': 'microsoft',
            'vi': 'viber',
            'wb': 'wechat',
            'tw': 'twitter',
            'ub': 'uber',
            'li': 'linkedin',
            'ds': 'discord',
            'tk': 'tiktok',
            'lf': 'tiktok',
            'am': 'amazon',
            'sn': 'snapchat',
            'fu': 'snapchat',
            'ot': 'any',
            'ya': 'yahoo',
            'nf': 'netflix',
            'ai': 'airbnb',
            'uk': 'airbnb',
            'bl': 'bilibili',
            'mt': 'steam'
        }

        const rawProduct = product || service
        const serviceName = SERVICE_MAP[rawProduct] || rawProduct;

        console.log(`🎯 [BUY-TEXTVERIFIED] Service requested: ${rawProduct} -> Mapped to: ${serviceName}`)

        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', userId)
            .single()

        if (profileError || !userProfile) throw new Error('User profile not found')

        const frozenBalance = userProfile.frozen_balance || 0
        const availableBalance = userProfile.balance - frozenBalance
        const price = expectedPrice || 2.0

        if (availableBalance < price) {
            throw new Error(`Insufficient balance: Required ${price} Ⓐ`)
        }

        const currentBalance = userProfile.balance

        // 4. Create Transaction & Freeze
        const { data: txn, error: txnError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'purchase',
                amount: -price,
                status: 'pending',
                description: `Purchase TextVerified activation for ${serviceName} (${country})`,
                provider: 'textverified',
                balance_before: currentBalance,
                balance_after: currentBalance
            })
            .select()
            .single()

        if (txnError) throw new Error(txnError.message)

        await supabaseClient.from('balance_operations').insert({
            user_id: userId,
            operation_type: 'freeze',
            amount: price,
            frozen_before: frozenBalance,
            frozen_after: frozenBalance + price,
            balance_before: currentBalance,
            balance_after: currentBalance,
            reason: 'Freeze for TextVerified'
        })

        await supabaseClient.from('users').update({ frozen_balance: frozenBalance + price }).eq('id', userId)

        // 5. Buy Verification (With Retry & Cleanup Logic)

        // Helper to cleanup pending verifications
        const cleanupPendingVerifications = async (token: string) => {
            console.log('🧹 [BUY-TEXTVERIFIED] Cleaning up pending verifications...')
            try {
                const listRes = await fetch(`${TEXTVERIFIED_BASE_URL}/verifications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': 'Mozilla/5.0'
                    }
                })
                if (!listRes.ok) return console.warn('Failed to list verifications for cleanup')

                const listData = await listRes.json()
                const pending = (listData.data || []).filter((v: any) => v.state === 'verificationPending')

                console.log(`🧹 [BUY-TEXTVERIFIED] Found ${pending.length} pending verifications to cancel.`)

                for (const v of pending) {
                    console.log(`🗑️ Cancelling ${v.id}...`)
                    await fetch(`${TEXTVERIFIED_BASE_URL}/verifications/${v.id}/cancel`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Length': '0'
                        }
                    })
                }
                await new Promise(r => setTimeout(r, 1500)) // Wait for backend to process cancellation
            } catch (e) {
                console.error('🧹 Cleanup failed:', e)
            }
        }

        let buyData: any = {}
        let attempts = 0
        let success = false
        let finalError = null

        while (attempts < 2 && !success) {
            attempts++
            try {
                console.log(`🌐 [BUY-TEXTVERIFIED] Purchasing Service ${serviceName}... (Attempt ${attempts})`)

                const buyRes = await fetch(`${TEXTVERIFIED_BASE_URL}/verifications`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        serviceName: serviceName,
                        capability: 'Sms'
                    })
                })

                const buyText = await buyRes.text()
                console.log(`📥 [BUY-TEXTVERIFIED] Status: ${buyRes.status}, Body: ${buyText}`)

                let currentBuyData: any = {}
                let verificationId = ''

                if (buyText) {
                    try {
                        currentBuyData = JSON.parse(buyText)
                    } catch (e: any) {
                        console.warn('⚠️ [BUY-TEXTVERIFIED] JSON Parse Warning:', e)
                    }
                }

                if (buyRes.status === 400 && currentBuyData.errorCode === 'TooManyUnfinishedVerifications') {
                    console.warn('⚠️ [BUY-TEXTVERIFIED] Too many pending verifications. Triggering cleanup...')
                    if (attempts === 1) {
                        await cleanupPendingVerifications(bearerToken)
                        continue;
                    }
                }

                const locationHeader = buyRes.headers.get('Location')
                if (locationHeader) {
                    const parts = locationHeader.split('/')
                    verificationId = parts[parts.length - 1]
                    console.log('📍 [BUY-TEXTVERIFIED] Extracted ID from Header:', verificationId)
                }

                if (!verificationId) {
                    if (currentBuyData.href) {
                        const parts = currentBuyData.href.split('/')
                        verificationId = parts[parts.length - 1]
                    } else if (currentBuyData.id) {
                        verificationId = currentBuyData.id
                    }
                }

                if (!buyRes.ok || !verificationId) {
                    const errorMsg = currentBuyData.message || currentBuyData.error || currentBuyData.errorDescription || buyText || 'Unknown Error'
                    console.error('❌ [BUY-TEXTVERIFIED] Purchase Failed:', errorMsg)
                    throw new Error(`TextVerified API Error (${buyRes.status}): ${errorMsg}`)
                }

                console.log(`🔎 [BUY-TEXTVERIFIED] Fetching details for ID: ${verificationId}...`)
                const detailsRes = await fetch(`${TEXTVERIFIED_BASE_URL}/verifications/${verificationId}`, {
                    headers: { 'Authorization': `Bearer ${bearerToken}` }
                })

                if (!detailsRes.ok) throw new Error('Failed to fetch verification details after purchase')
                const details = await detailsRes.json()

                console.log('📱 [BUY-TEXTVERIFIED] Verification Details:', details)
                if (!details.number) throw new Error('No number returned in verification details')

                buyData = details
                buyData.id = verificationId

                // 🔧 NORMALIZE PHONE NUMBER: TextVerified is US-only
                // Ensure phone has +1 prefix
                if (buyData.number && !buyData.number.startsWith('+')) {
                    buyData.number = '+1' + buyData.number.replace(/^1/, '') // Remove leading 1 if present, then add +1
                    console.log('📞 [BUY-TEXTVERIFIED] Normalized phone:', buyData.number)
                }

                success = true

            } catch (error: any) {
                console.error(`Attempt ${attempts} failed:`, error.message)
                finalError = error
                if (attempts === 1 && error.message.includes('TooManyUnfinishedVerifications')) {
                    await cleanupPendingVerifications(bearerToken)
                    continue
                }
            }
        }

        if (!success) {
            // Rollback Logic
            console.error('❌ [BUY-TEXTVERIFIED] Final Purchase Failure. Rolling back.')

            // Create failed activation for atomic_refund
            const { data: failedActivation } = await supabaseClient
                .from('activations')
                .insert({
                    user_id: userId,
                    order_id: `FAILED_${Date.now()}`,
                    phone: 'API_FAILED',
                    service_code: rawProduct,
                    country_code: 'usa', // TextVerified is US-only
                    price: price,
                    frozen_amount: price,
                    status: 'failed',
                    provider: 'textverified',
                    operator: 'any', // Fix: Required field
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (failedActivation) {
                await supabaseClient.rpc('atomic_refund', { p_activation_id: failedActivation.id })
                await supabaseClient.from('transactions').update({
                    related_activation_id: failedActivation.id,
                    status: 'failed'
                }).eq('id', txn.id)
            }

            throw finalError || new Error('Purchase failed after retries')
        }

        // 6. Success - Save to DB
        // Use API endsAt if available, otherwise fallback to 15m
        const expiresAt = buyData.endsAt ? new Date(buyData.endsAt) : new Date(Date.now() + 15 * 60 * 1000)


        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .insert({
                user_id: userId,
                order_id: buyData.id,
                phone: buyData.number,
                service_code: rawProduct,
                country_code: 'usa', // TextVerified is US-only - force correct country
                price: price,
                frozen_amount: price,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                provider: 'textverified',
                operator: 'any' // Fix: Required field
            })
            .select()
            .single()

        if (actError) {
            console.error('❌ [BUY-TEXTVERIFIED] CRITICAL: DB Save Error - Number purchased but not saved:', actError)

            const { data: orphanActivation } = await supabaseClient
                .from('activations')
                .insert({
                    user_id: userId,
                    order_id: buyData.id,
                    phone: buyData.number,
                    service_code: rawProduct,
                    country_code: 'usa', // TextVerified is US-only
                    price: price,
                    frozen_amount: price,
                    status: 'orphaned',
                    provider: 'textverified',
                    operator: 'any', // Fix: Required field
                    created_at: new Date().toISOString()
                })
                .select()
                .single()

            if (orphanActivation) {
                await supabaseClient.rpc('atomic_refund', { p_activation_id: orphanActivation.id })
                await supabaseClient.from('transactions').update({
                    related_activation_id: orphanActivation.id,
                    status: 'refunded'
                }).eq('id', txn.id)
            }

            throw new Error(`CRITICAL: Number purchased from TextVerified but DB save failed (${actError.message}) - User refunded automatically.`)
        }

        await supabaseClient.from('transactions').update({ related_activation_id: activation.id }).eq('id', txn.id)

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: activation.id,
                    activation_id: buyData.id,
                    phone: buyData.number,
                    service: rawProduct,
                    country: country,
                    price: price,
                    status: 'pending',
                    expires: expiresAt.toISOString()
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
