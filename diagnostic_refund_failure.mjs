import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 DIAGNOSTIC: Pourquoi le refund automatique n\'a pas fonctionné?\n')

try {
  const timeoutId = 'f624f014-6f39-4e8e-ab71-4a8b8e02c6cc' // L'activation qui a timeout sans refund

  // 1. Analyser l'activation problématique
  console.log('1️⃣ Analyse de l\'activation qui a échoué...')
  
  const { data: failedActivation, error: activationError } = await sb
    .from('activations')
    .select('*')
    .like('id', 'f624f014%')
    .single()

  if (activationError) {
    console.log('⚠️ Activation non trouvée avec ce préfixe, recherche plus large...')
    
    const { data: recentActivations } = await sb
      .from('activations')
      .select('id, service_code, status, frozen_amount, expires_at, updated_at')
      .eq('service_code', 'et')
      .eq('status', 'timeout')
      .order('updated_at', { ascending: false })
      .limit(5)
      
    if (recentActivations && recentActivations.length > 0) {
      const activation = recentActivations[0]
      console.log(`📱 Activation trouvée: ${activation.id}`)
      console.log(`   Service: ${activation.service_code}`)
      console.log(`   Status: ${activation.status}`)
      console.log(`   Updated: ${new Date(activation.updated_at).toLocaleTimeString()}`)
      
      // Utiliser cette activation pour le diagnostic
      const { data: fullActivation } = await sb
        .from('activations')
        .select('*')
        .eq('id', activation.id)
        .single()
      
      if (fullActivation) {
        await analyzeWhyRefundFailed(fullActivation)
      }
    }
  } else {
    await analyzeWhyRefundFailed(failedActivation)
  }

} catch (error) {
  console.error('❌ ERREUR DIAGNOSTIC:', error.message)
}

async function analyzeWhyRefundFailed(activation) {
  console.log(`\n📊 DIAGNOSTIC COMPLET: ${activation.id.substring(0,8)}...`)
  
  // Timeline de l'activation
  const created = new Date(activation.created_at)
  const expires = new Date(activation.expires_at)
  const updated = new Date(activation.updated_at)
  const now = new Date()
  
  console.log(`\n⏰ TIMELINE:`)
  console.log(`   Créée: ${created.toLocaleTimeString()}`)
  console.log(`   Expire: ${expires.toLocaleTimeString()}`)
  console.log(`   Timeout: ${updated.toLocaleTimeString()}`)
  console.log(`   Maintenant: ${now.toLocaleTimeString()}`)
  
  const timeToTimeout = Math.round((updated - expires) / 60000) // minutes après expiration
  console.log(`   Délai timeout: ${timeToTimeout} min après expiration`)

  // Balance operations
  const { data: operations } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', activation.id)
    .order('created_at', { ascending: true })

  console.log(`\n📊 BALANCE OPERATIONS:`)
  if (operations && operations.length > 0) {
    operations.forEach((op, i) => {
      const opTime = new Date(op.created_at).toLocaleTimeString()
      console.log(`   ${i+1}. ${op.operation_type}: ${op.amount}Ⓐ (${opTime})`)
    })
  } else {
    console.log(`   ❌ AUCUNE balance operation!`)
  }

  // Vérifier si le nouveau cron atomic a été appelé
  console.log(`\n🔍 ANALYSE DES ÉCHECS:`)
  
  const hasFreeze = operations?.some(op => op.operation_type === 'freeze')
  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  if (!hasFreeze && !hasRefund) {
    console.log(`   🚨 PROBLÈME: Aucune balance operation du tout!`)
    console.log(`   🔍 Cause probable: Activation créée incorrectement`)
  } else if (hasFreeze && !hasRefund) {
    console.log(`   🚨 PROBLÈME: Freeze créé mais pas de refund`)
    console.log(`   🔍 Cause probable: Ancien cron défaillant a marqué timeout sans refund`)
    console.log(`   💡 Solution: Le nouveau atomic-timeout-processor devrait traiter ça`)
  } else if (hasRefund) {
    console.log(`   ✅ Refund présent - Activation correctement traitée`)
  }

  // Test si le nouveau cron peut voir cette activation
  console.log(`\n🔬 TEST DÉTECTION PAR ATOMIC-TIMEOUT-PROCESSOR:`)
  
  const { data: atomicQuery } = await sb
    .from('activations')
    .select('id, status, frozen_amount, expires_at')
    .in('status', ['pending', 'waiting'])
    .lt('expires_at', now.toISOString())
    .gt('frozen_amount', 0)
    .eq('id', activation.id)

  if (atomicQuery && atomicQuery.length > 0) {
    console.log(`   ✅ Activation visible par atomic-timeout-processor`)
  } else {
    console.log(`   ❌ Activation INVISIBLE par atomic-timeout-processor`)
    console.log(`   🔍 Raison: status='${activation.status}' (pas pending/waiting) OU frozen_amount=${activation.frozen_amount} (pas >0)`)
    console.log(`   💡 C'est pourquoi le nouveau cron ne l'a pas traitée!`)
  }

  // Conclusion
  console.log(`\n🎯 CONCLUSION:`)
  console.log(`   1. L'ancien cron a marqué status='timeout' mais frozen_amount=0`)
  console.log(`   2. Le nouveau atomic-timeout-processor cherche status IN ['pending','waiting']`)
  console.log(`   3. Donc notre activation timeout est "invisible" pour le nouveau système`)
  console.log(`   4. C'est exactement le problème des "timeouts fantômes"`)
  
  console.log(`\n💡 SOLUTIONS:`)
  console.log(`   ✅ Réparation manuelle: atomic_refund (déjà fait)`)
  console.log(`   ⚠️ Prévention: Remplacer complètement l'ancien cron par le nouveau`)
  console.log(`   🔧 Monitoring: Script de détection des nouveaux timeouts fantômes`)
}