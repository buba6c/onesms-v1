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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('🔍 [SETUP-TEXTVERIFIED] Starting verification...')

        // 1. Get Credentials from DB first (preferred source of truth)
        let apiKey = ''
        let apiUser = ''

        const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .in('key', ['textverified_api_key', 'textverified_api_username'])

        settings?.forEach((s: any) => {
            if (s.key === 'textverified_api_key') apiKey = s.value
            if (s.key === 'textverified_api_username') apiUser = s.value
        })

        // Fallback to Env
        if (!apiKey) apiKey = Deno.env.get('TEXTVERIFIED_API_KEY') ?? ''
        if (!apiUser) apiUser = Deno.env.get('TEXTVERIFIED_API_USERNAME') ?? ''

        if (!apiKey || !apiUser) {
            throw new Error('❌ Missing credentials! Please add textverified_api_key and textverified_api_username to system_settings.')
        }

        // 2. Authenticate
        console.log('🔐 [SETUP-TEXTVERIFIED] Authenticating...')
        const authRes = await fetch('https://www.textverified.com/api/pub/v2/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, api_username: apiUser })
        })

        if (!authRes.ok) {
            const errText = await authRes.text()
            throw new Error(`Authentication Failed: ${authRes.status} ${errText}`)
        }

        const { bearer_token } = await authRes.json()

        // 3. Check Balance (Verify everything works)
        // There isn't a direct "Balance" endpoint easily documented publicly without logging in, 
        // but we can try to get "Users" info or generic "Targets" to prove access.
        // Actually, usually POST /api/Users returns user details if authorized? NO.
        // Let's try GET /api/Targets to just verify the token works and we can read data.

        console.log('💰 [SETUP-TEXTVERIFIED] Verifying Token & Access...')
        const targetsRes = await fetch('https://www.textverified.com/api/Targets?pageSize=1', {
            headers: { 'Authorization': `Bearer ${bearer_token}` }
        })

        if (!targetsRes.ok) {
            throw new Error('Token verification failed (Targets call). Access denied?')
        }

        // 4. Update System Mode
        console.log('✅ [SETUP-TEXTVERIFIED] SUCCESS! Enabling "textverified" mode...')

        const { error: updateError } = await supabaseAdmin
            .from('system_settings')
            .upsert({
                key: 'sms_provider_mode',
                value: 'textverified',
                category: 'sms_provider',
                type: 'string',
                description: 'Active SMS Provider'
            })

        if (updateError) {
            throw new Error(`DB Update Failed: ${updateError.message}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'TextVerified Connected & Enabled!',
                details: 'Credentials valid. API Accessible. Provider mode set to "textverified".'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [SETUP-TEXTVERIFIED] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
