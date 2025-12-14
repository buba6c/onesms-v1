// ========================================================================
// CRON: Wallet Health Check
// ========================================================================
// Tâche automatique exécutée toutes les heures pour:
// 1. Détecter incohérences frozen_balance
// 2. Corriger automatiquement si possible
// 3. Alerter admin pour cas critiques
// ========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔍 [CRON-WALLET-HEALTH] Starting wallet health check...')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // ========================================================================
    // 1. DÉTECTER INCOHÉRENCES via v_frozen_balance_health
    // ========================================================================
    
    const { data: issues, error: issuesError } = await supabase
      .from('v_frozen_balance_health')
      .select('*')

    if (issuesError) {
      console.error('❌ [CRON-WALLET-HEALTH] Error fetching issues:', issuesError)
      return new Response(
        JSON.stringify({ success: false, error: issuesError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!issues || issues.length === 0) {
      console.log('✅ [CRON-WALLET-HEALTH] All wallets healthy')
      return new Response(
        JSON.stringify({ success: true, issues: 0, message: 'All wallets healthy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`⚠️ [CRON-WALLET-HEALTH] Issues detected: ${issues.length}`)

    // ========================================================================
    // 2. CLASSIFIER LES ISSUES
    // ========================================================================
    
    const criticalIssues = issues.filter(i => i.health_status.includes('CRITICAL'))
    const warningIssues = issues.filter(i => i.health_status.includes('WARNING'))

    console.log(`   CRITICAL: ${criticalIssues.length}`)
    console.log(`   WARNING: ${warningIssues.length}`)

    // ========================================================================
    // 3. AUTO-CORRIGER WARNING (Frozen Mismatch)
    // ========================================================================
    
    const corrected = []
    const failed = []

    for (const issue of warningIssues) {
      try {
        console.log(`🔧 [CRON-WALLET-HEALTH] Auto-correcting user ${issue.user_id} (${issue.email})`)
        console.log(`   Current: frozen=${issue.frozen_balance}, expected=${issue.expected_frozen}`)

        // Recalculer frozen correct (déjà fait dans la vue, mais on re-vérifie)
        const { data: activations } = await supabase
          .from('activations')
          .select('frozen_amount')
          .eq('user_id', issue.user_id)
          .in('status', ['pending', 'waiting'])

        const { data: rentals } = await supabase
          .from('rentals')
          .select('frozen_amount')
          .eq('user_id', issue.user_id)
          .eq('status', 'active')

        const correctFrozen = 
          (activations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0) +
          (rentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0)

        // Corriger
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            frozen_balance: correctFrozen,
            updated_at: new Date().toISOString()
          })
          .eq('id', issue.user_id)

        if (updateError) {
          throw updateError
        }

        console.log(`✅ [CRON-WALLET-HEALTH] Corrected: frozen ${issue.frozen_balance} → ${correctFrozen}`)
        
        corrected.push({
          user_id: issue.user_id,
          email: issue.email,
          old_frozen: issue.frozen_balance,
          new_frozen: correctFrozen,
          diff: issue.frozen_diff
        })

        // Log correction dans balance_operations (optionnel)
        try {
          await supabase.from('balance_operations').insert({
            user_id: issue.user_id,
            operation_type: 'refund', // Type générique pour correction
            amount: Math.abs(issue.frozen_diff),
            balance_before: issue.balance,
            balance_after: issue.balance,
            frozen_before: issue.frozen_balance,
            frozen_after: correctFrozen,
            reason: `Auto-correction by cron-wallet-health: frozen mismatch detected (${issue.frozen_diff})`
          })
        } catch (logError) {
          console.warn('⚠️ [CRON-WALLET-HEALTH] Could not log correction:', logError)
        }

      } catch (error) {
        console.error(`❌ [CRON-WALLET-HEALTH] Failed to correct user ${issue.user_id}:`, error)
        failed.push({
          user_id: issue.user_id,
          email: issue.email,
          error: error.message
        })
      }
    }

    // ========================================================================
    // 4. ALERTER ADMIN POUR CRITICAL
    // ========================================================================
    
    if (criticalIssues.length > 0) {
      console.error('🚨 [CRON-WALLET-HEALTH] CRITICAL ISSUES DETECTED:')
      criticalIssues.forEach(issue => {
        console.error(`   User: ${issue.email} (${issue.user_id})`)
        console.error(`   Status: ${issue.health_status}`)
        console.error(`   Balance: ${issue.balance}, Frozen: ${issue.frozen_balance}`)
        if (issue.health_status.includes('Frozen mismatch')) {
          console.error(`   Expected frozen: ${issue.expected_frozen}, Diff: ${issue.frozen_diff}`)
        }
      })

      // TODO: Envoyer notification admin (email, SMS, Slack, etc.)
      // Exemple:
      // await sendAdminAlert({
      //   type: 'wallet_critical',
      //   issues: criticalIssues,
      //   count: criticalIssues.length
      // })
    }

    // ========================================================================
    // 5. GÉNÉRER RAPPORT
    // ========================================================================
    
    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_issues: issues.length,
        critical: criticalIssues.length,
        warning: warningIssues.length,
        corrected: corrected.length,
        failed: failed.length
      },
      critical_issues: criticalIssues.map(i => ({
        user_id: i.user_id,
        email: i.email,
        status: i.health_status,
        balance: i.balance,
        frozen: i.frozen_balance,
        expected_frozen: i.expected_frozen
      })),
      corrections: corrected,
      failures: failed
    }

    console.log('📊 [CRON-WALLET-HEALTH] Report:', JSON.stringify(report.summary, null, 2))

    // Sauvegarder rapport dans system_logs (optionnel)
    try {
      await supabase.from('system_logs').insert({
        level: criticalIssues.length > 0 ? 'ERROR' : warningIssues.length > 0 ? 'WARN' : 'INFO',
        source: 'cron-wallet-health',
        message: `Wallet health check: ${issues.length} issues (${criticalIssues.length} critical, ${corrected.length} corrected)`,
        metadata: report
      })
    } catch (logError) {
      console.warn('⚠️ [CRON-WALLET-HEALTH] Could not save report:', logError)
    }

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ [CRON-WALLET-HEALTH] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
