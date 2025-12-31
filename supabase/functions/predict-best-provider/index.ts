
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROVIDER_CYCLE = ['sms-activate', 'smspva', '5sim', 'onlinesim']

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

        // 3. DECISION STRATEGIQUE
        if (globalStats && globalStats.length > 0) {
            // On a des stats !
            // Filtrer: Enlever le provider vetoed (si existe)
            const candidates = globalStats.filter(p => p.provider !== personalVetoProvider);

            if (candidates.length > 0) {
                // Le meilleur est le candidat n°1
                const winner = candidates[0];
                preferredProvider = winner.provider;
                reasoning = `Global Best (${Number(winner.score).toFixed(0)}% success) ` + (personalVetoProvider ? `[Avoided ${personalVetoProvider}]` : '');
            } else {
                // Tous les bons sont vetoed (ex: le seul bon provider a échoué pour moi)
                // Fallback: On essaie quand même le 2ème meilleur global s'il existe (non, candidates est vide)
                // Donc on essaie la rotation classique
                reasoning = "Global best blocked by personal veto. Rotate mode.";
            }
        }

        // Fallback: Si pas de preferredProvider via Global Stats (ou vetoed), utiliser Rotation
        if (!preferredProvider && personalVetoProvider) {
            const index = PROVIDER_CYCLE.indexOf(personalVetoProvider)
            if (index !== -1) {
                const nextIndex = (index + 1) % PROVIDER_CYCLE.length
                preferredProvider = PROVIDER_CYCLE[nextIndex]
                reasoning += ` -> Rotating away from ${personalVetoProvider}`
            }
        }

        // Si toujours rien, on laisse null (le frontend utilisera l'ordre par défaut setting)

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
