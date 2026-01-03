
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Provider cycle - UPDATED: 5sim first, then fallback chain
// TextVerified handled separately (US-only, in buy-number-intelligent)
const PROVIDER_CYCLE = ['5sim', 'sms-activate', 'grizzly', 'onlinesim']

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userId, serviceCode, countryCode } = await req.json()

        // 1. ANALYSE PERSONNELLE (Veto)
        // "Ai-je échoué récemment avec un provider ?"
        const { data: lastActivation } = await supabaseClient
            .from('activations')
            .select('provider, status, sms_code')
            .eq('user_id', userId)
            .eq('service_code', serviceCode)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        let personalVetoProvider = null;
        if (lastActivation) {
            const isFailure = ['cancelled', 'timeout', 'expired', 'refunded'].includes(lastActivation.status) && !lastActivation.sms_code
            if (isFailure) {
                personalVetoProvider = lastActivation.provider
            }
        }

        // 2. INTELLIGENCE GLOBALE (Stats)
        // "Quel provider fonctionne le mieux pour tout le monde ?"
        const { data: globalStats } = await supabaseClient
            .from('provider_performance')
            .select('provider, score, attempts')
            .eq('service_code', serviceCode)
            .gt('attempts', 0) // Highly reactive: Even 1 attempt counts
            .order('score', { ascending: false }) // Best score first

        let preferredProvider = null
        let reasoning = 'Default'

        // 3. DECISION STRATEGIQUE - FORCE SMSPOOL FIRST
        // Always prefer SMSPool UNLESS it failed recently for this user
        if (personalVetoProvider === 'smspool') {
            // SMSPool failed recently, use next best from global stats
            if (globalStats && globalStats.length > 0) {
                const candidates = globalStats.filter(p => p.provider !== 'smspool');
                if (candidates.length > 0) {
                    const winner = candidates[0];
                    preferredProvider = winner.provider;
                    reasoning = `SMSPool vetoed → Next Best: ${winner.provider} (${Number(winner.score).toFixed(0)}% success)`;
                } else {
                    // Fallback to rotation
                    const index = PROVIDER_CYCLE.indexOf('smspool');
                    const nextIndex = (index + 1) % PROVIDER_CYCLE.length;
                    preferredProvider = PROVIDER_CYCLE[nextIndex];
                    reasoning = 'SMSPool vetoed → Rotating to next in cycle';
                }
            } else {
                // No stats, rotate
                const index = PROVIDER_CYCLE.indexOf('smspool');
                const nextIndex = (index + 1) % PROVIDER_CYCLE.length;
                preferredProvider = PROVIDER_CYCLE[nextIndex];
                reasoning = 'SMSPool vetoed → Rotating to next in cycle';
            }
        } else {
            // SMSPool is good or unknown → ALWAYS USE IT
            preferredProvider = 'smspool';
            reasoning = 'SMSPool (Priority Provider)';
        }

        console.log(`🧠 [PREDICT] User: ${userId}, Service: ${serviceCode} -> Suggestion: ${preferredProvider} (${reasoning})`)

        return new Response(
            JSON.stringify({
                preferredProvider,
                reasoning,
                veto: personalVetoProvider,
                lastStatus: lastActivation?.status || null
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
