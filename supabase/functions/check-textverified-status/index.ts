import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TEXTVERIFIED_BASE_URL = 'https://www.textverified.com/api/pub/v2'

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

        // 1. Get Credentials
        let API_KEY = Deno.env.get('TEXTVERIFIED_API_KEY')
        let API_USERNAME = Deno.env.get('TEXTVERIFIED_API_USERNAME')

        const { data: settings } = await supabaseClient
            .from('system_settings')
            .select('key, value')
            .in('key', ['textverified_api_key', 'textverified_api_username'])

        settings?.forEach((s: any) => {
            if (s.key === 'textverified_api_key') API_KEY = s.value
            if (s.key === 'textverified_api_username') API_USERNAME = s.value
        })

        const { activationId, userId } = await req.json()
        console.log('💎 [CHECK-TEXTVERIFIED] Checking:', activationId)

        // 2. Get Activation
        const { data: activation, error: actError } = await supabaseClient.from('activations').select('*').eq('id', activationId).single()
        if (actError || !activation) throw new Error('Activation not found')
        if (activation.provider !== 'textverified') throw new Error('Not TextVerified activation')

        // Cached check
        if (activation.status === 'received' && activation.charged) {
            return new Response(JSON.stringify({ success: true, data: { status: 'received', sms_code: activation.sms_code, sms_text: activation.sms_text } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        let token = ''

        // 3. Auth (Headers) - FORCE Dynamic Auth
        if (!API_KEY || !API_USERNAME) throw new Error('Credentials missing')

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
            throw new Error(`Auth failed (${authRes.status}): ${errText}`)
        }

        const authData = await authRes.json()
        token = authData.token || authData.bearer_token // 'token' in V2

        if (!token) throw new Error('TextVerified Auth Failed (No Token)')


        // 4. Check Status
        // ADDED: User-Agent and Content-Type to avoid 401s from WAF
        const checkUrl = (`${TEXTVERIFIED_BASE_URL}/verifications/${activation.order_id}`)
        const checkRes = await fetch(checkUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })

        if (!checkRes.ok) {
            // If 404, maybe expired/cancelled?
            console.warn(`[CHECK-TEXTVERIFIED] Status check failed (${checkRes.status}).`)
            throw new Error(`Status check failed: ${checkRes.status}`)
        }

        const checkData = await checkRes.json()
        console.log('📥 [CHECK-TEXTVERIFIED] Full API Response:', JSON.stringify(checkData, null, 2))

        // V2 States: verificationPending, verificationCompleted, verificationTimedOut, verificationReported?
        let status = activation.status.toLowerCase()
        let smsCode = null
        let smsText = null

        const tvState = checkData.state || ''

        if (tvState === 'verificationCompleted') {
            status = 'received'

            // Fetch SMS content via Link
            if (checkData.sms && checkData.sms.href) {
                console.log('📨 [CHECK-TEXTVERIFIED] Fetching SMS content from:', checkData.sms.href)
                const smsRes = await fetch(checkData.sms.href, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                })

                if (smsRes.ok) {
                    const smsList = await smsRes.json()
                    console.log('📱 [CHECK-TEXTVERIFIED] SMS list response:', JSON.stringify(smsList))

                    // TextVerified V2 may return different structures
                    // Try multiple field names and parse from message if needed
                    if (smsList.data && smsList.data.length > 0) {
                        const firstSms = smsList.data[0]
                        console.log('📱 [CHECK-TEXTVERIFIED] First SMS object keys:', Object.keys(firstSms))

                        // Try various field names for the code
                        smsCode = firstSms.code || firstSms.parsedCode || firstSms.verificationCode || null
                        smsText = firstSms.message || firstSms.body || firstSms.text || firstSms.content || null

                        // 🔧 FIX: If code field is missing, extract from message text
                        if (!smsCode && smsText) {
                            console.log('🔍 [CHECK-TEXTVERIFIED] Parsing code from message:', smsText)
                            // Common patterns: G-123456, 123456, code: 123456
                            const patterns = [
                                /\b([A-Z]-?\d{4,8})\b/i,     // G-153058, A-123456
                                /\b(\d{4,8})\b/,            // Just digits: 153058
                                /code[:\s]+(\d{4,8})/i,     // code: 123456
                                /verification[:\s]+(\d{4,8})/i  // verification: 123456
                            ]

                            for (const pattern of patterns) {
                                const match = smsText.match(pattern)
                                if (match) {
                                    smsCode = match[1]
                                    console.log('✅ [CHECK-TEXTVERIFIED] Extracted code:', smsCode)
                                    break
                                }
                            }
                        }
                    }
                }
            }

            // Fallback if code missing but completed - try direct /sms endpoint
            if (!smsCode) {
                console.warn('⚠️ [CHECK-TEXTVERIFIED] Completed but no code found. Retrying SMS fetch...')
                try {
                    const directSmsRes = await fetch(`${TEXTVERIFIED_BASE_URL}/sms?reservationId=${activation.order_id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'User-Agent': 'Mozilla/5.0'
                        }
                    })
                    if (directSmsRes.ok) {
                        const directSmsList = await directSmsRes.json()
                        console.log('📨 [CHECK-TEXTVERIFIED] Direct SMS fetch:', JSON.stringify(directSmsList))

                        if (directSmsList.data && directSmsList.data.length > 0) {
                            const firstSms = directSmsList.data[0]
                            smsCode = firstSms.code || firstSms.parsedCode || null
                            smsText = firstSms.message || firstSms.body || null

                            // Parse from message if still no code
                            if (!smsCode && smsText) {
                                const match = smsText.match(/\b([A-Z]-?\d{4,8})\b/i) || smsText.match(/\b(\d{4,8})\b/)
                                if (match) smsCode = match[1]
                            }
                        }
                    }
                } catch (e) {
                    console.error('❌ [CHECK-TEXTVERIFIED] Direct SMS fetch failed:', e)
                }
            }

        } else if (tvState === 'verificationTimedOut' || tvState === 'verificationCancelled') {
            status = 'cancelled'
        } else {
            status = 'waiting' // verificationPending
        }

        // 5. Update DB (Atomic Charge/Refund)
        // 🔧 FIX: Only mark 'received' if we actually got the SMS code
        if (status === 'received' && !smsCode) {
            console.warn('⚠️ [CHECK-TEXTVERIFIED] API says completed but no SMS code yet. Keeping waiting status.')
            status = 'waiting' // Don't mark received without the actual code!
        }

        if (status !== activation.status) {
            if (status === 'received' && !activation.charged && smsCode) {
                // Complete with code ✅
                await supabaseClient.rpc('atomic_complete_activation', {
                    p_activation_id: activationId,
                    p_sms_code: smsCode,
                    p_sms_text: smsText || `Code: ${smsCode}`
                })
            } else if (status === 'cancelled') {
                await supabaseClient.rpc('atomic_refund', {
                    p_activation_id: activationId
                })
            } else if (status === 'waiting') {
                // Do nothing, still waiting for SMS
            }
            // Removed the 'else' that was updating status without code!
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    status: status,
                    sms_code: smsCode,
                    sms_text: smsText
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ Error:', error.message)
        return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})
