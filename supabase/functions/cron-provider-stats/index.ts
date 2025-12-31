
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('📊 [CRON-STATS] Starting provider performance analysis...')

        // 1. Définir la fenêtre d'analyse (ex: 72 dernières heures)
        // On veut capter les tendances récentes mais avec assez de volume.
        const lookbackHours = 72
        const timeThreshold = new Date()
        timeThreshold.setHours(timeThreshold.getHours() - lookbackHours)

        // 2. Récupérer les activations récentes
        // On ignore les "pending" car on ne sait pas encore.
        const { data: activations, error } = await supabase
            .from('activations')
            .select('provider, service_code, status')
            .gte('created_at', timeThreshold.toISOString())
            .in('status', ['completed', 'success', 'refunded', 'cancelled', 'timeout', 'expired'])

        if (error) throw error

        console.log(`📥 [CRON-STATS] Fetched ${activations.length} activations`)

        // 3. Agréger les données en mémoire
        const statsMap = new Map<string, { attempts: number, successes: number }>()

        for (const act of activations) {
            if (!act.provider || !act.service_code) continue

            const key = `${act.provider}::${act.service_code}`

            if (!statsMap.has(key)) {
                statsMap.set(key, { attempts: 0, successes: 0 })
            }

            const entry = statsMap.get(key)!
            entry.attempts++

            // Succès = status 'completed' ou 'success' (et funds committed)
            // Echec = 'refunded', 'cancelled', 'timeout', 'expired'
            if (['completed', 'success'].includes(act.status)) {
                entry.successes++
            }
        }

        // 4. Préparer les Upserts
        const updates = []
        const timestamp = new Date().toISOString()

        for (const [key, stat] of statsMap.entries()) {
            const [provider, service_code] = key.split('::')

            updates.push({
                provider,
                service_code,
                attempts: stat.attempts,
                successes: stat.successes,
                updated_at: timestamp
                // score est auto-calculé par la DB
            })
        }

        // 5. Sauvegarder dans provider_performance
        if (updates.length > 0) {
            const { error: upsertError } = await supabase
                .from('provider_performance')
                .upsert(updates, { onConflict: 'provider, service_code, country_code' }) // Note: country_code defaults to 'ALL'

            if (upsertError) throw upsertError
            console.log(`✅ [CRON-STATS] Updated ${updates.length} records`)
        } else {
            console.log(`ℹ️ [CRON-STATS] No valid data to update.`)
        }

        return new Response(
            JSON.stringify({ success: true, updated: updates.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ [CRON-STATS] Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
