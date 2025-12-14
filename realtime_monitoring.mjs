import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('👁️ MONITORING TEMPS RÉEL: Système atomic vs ancien cron\n')

let monitoringActive = true
let checkCount = 0

async function startRealtimeMonitoring() {
  try {
    console.log('🚀 Démarrage du monitoring temps réel...')
    console.log('⏰ Vérifications toutes les 30 secondes')
    console.log('🔍 Détection automatique des timeouts fantômes')
    console.log('🛡️ Réparation automatique si nécessaire\n')

    const monitoringInterval = setInterval(async () => {
      if (!monitoringActive) {
        clearInterval(monitoringInterval)
        return
      }

      checkCount++
      const now = new Date()
      
      console.log(`[${checkCount.toString().padStart(3, '0')}] ${now.toLocaleTimeString()} 🔍`)
      
      try {
        // 1. Vérifier les activations en cours
        const { data: activeActivations } = await sb
          .from('activations')
          .select('id, service_code, price, frozen_amount, status, expires_at')
          .in('status', ['pending', 'waiting'])
          .order('expires_at', { ascending: true })
          .limit(5)

        const { data: recentTimeouts } = await sb
          .from('activations')
          .select('id, service_code, price, status, updated_at')
          .eq('status', 'timeout')
          .gte('updated_at', new Date(now.getTime() - 2 * 60 * 1000).toISOString())

        // 2. État utilisateur
        const { data: user } = await sb
          .from('users')
          .select('frozen_balance')
          .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
          .single()

        console.log(`   💰 User frozen: ${user.frozen_balance}Ⓐ`)
        
        if (activeActivations && activeActivations.length > 0) {
          console.log(`   📱 Active: ${activeActivations.length}`)
          
          // Vérifier les expirations imminentes
          activeActivations.forEach(act => {
            const expires = new Date(act.expires_at)
            const timeLeft = Math.round((expires - now) / 60000)
            if (timeLeft <= 2) {
              console.log(`     ⏰ ${act.id.substring(0,8)}... (${act.service_code}) expire dans ${timeLeft}min`)
            }
          })
        }

        if (recentTimeouts && recentTimeouts.length > 0) {
          console.log(`   🚨 Timeouts récents: ${recentTimeouts.length}`)
          
          // Vérifier si ils ont des refunds
          for (const timeout of recentTimeouts) {
            const { data: ops } = await sb
              .from('balance_operations')
              .select('operation_type')
              .eq('activation_id', timeout.id)
              .eq('operation_type', 'refund')

            const hasRefund = ops && ops.length > 0
            const timeoutAge = Math.round((now - new Date(timeout.updated_at)) / 60000)
            
            if (!hasRefund) {
              console.log(`     ❌ FANTÔME: ${timeout.id.substring(0,8)}... (${timeout.service_code}) - ${timeoutAge}min sans refund`)
              
              // Réparation automatique des fantômes récents
              if (timeoutAge <= 5) { // Moins de 5 minutes
                console.log(`       🔧 Réparation auto...`)
                await repairPhantomTimeout(timeout)
              }
            } else {
              console.log(`     ✅ OK: ${timeout.id.substring(0,8)}... avec refund`)
            }
          }
        }

        // 3. Test périodique du nouveau système (toutes les 5 vérifications)
        if (checkCount % 5 === 0) {
          console.log(`   🔄 Test système atomic...`)
          
          const { data: cronResult, error: cronError } = await sb.functions.invoke('cron-atomic-reliable', {
            body: { trigger: 'monitoring_test', check: checkCount }
          })
          
          if (cronError) {
            console.log(`   ❌ Système atomic error: ${cronError.message}`)
          } else {
            const tp = cronResult?.timeout_processing
            const sc = cronResult?.sms_checking
            console.log(`   ✅ Atomic OK: ${tp?.processed || 0} timeouts, ${sc?.checked || 0} SMS`)
            
            if (tp?.processed > 0) {
              console.log(`     💰 ${tp.refunded_total}Ⓐ auto-refunded`)
            }
          }
        }

        // 4. Arrêter après 20 minutes (40 checks)
        if (checkCount >= 40) {
          console.log('\n⏰ Monitoring terminé après 20 minutes')
          console.log('🎯 Système surveillé avec succès')
          monitoringActive = false
        }

      } catch (error) {
        console.error(`   ❌ Erreur monitoring: ${error.message}`)
      }
      
    }, 30000) // Toutes les 30 secondes

    console.log('🔴 Monitoring démarré (CTRL+C pour arrêter)')
    
    // Arrêt propre
    process.on('SIGINT', () => {
      console.log('\n🔴 Arrêt du monitoring...')
      monitoringActive = false
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ ERREUR MONITORING:', error.message)
  }
}

async function repairPhantomTimeout(timeout) {
  try {
    const { data: activation } = await sb
      .from('activations')
      .select('user_id, price')
      .eq('id', timeout.id)
      .single()

    const { data: refundResult, error: refundError } = await sb.rpc('atomic_refund', {
      p_user_id: activation.user_id,
      p_amount: activation.price,
      p_activation_id: timeout.id,
      p_reason: 'Auto-repair phantom timeout via monitoring'
    })

    if (refundError) {
      console.log(`       ⚠️ Échec auto-repair: ${refundError.message}`)
    } else {
      console.log(`       ✅ Auto-repaired: ${refundResult?.amount_refunded || activation.price}Ⓐ`)
    }
  } catch (error) {
    console.log(`       ❌ Erreur auto-repair: ${error.message}`)
  }
}

startRealtimeMonitoring()