import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c

console.log('🔍 IDENTIFICATION EXACTE des timeouts fantômes pour buba6c\n')

try {
  // Récupérer TOUS les timeouts récents avec frozen_amount=0
  const { data: timeouts } = await sb
    .from('activations')
    .select('id, service_code, price, frozen_amount, status, updated_at, created_at')
    .eq('user_id', userId)
    .eq('status', 'timeout')
    .eq('frozen_amount', 0)
    .order('updated_at', { ascending: false })
    .limit(10)

  console.log(`📱 TIMEOUTS TROUVÉS: ${timeouts?.length || 0}`)

  if (timeouts && timeouts.length > 0) {
    const phantoms = []
    
    for (const timeout of timeouts) {
      console.log(`\n🔍 ${timeout.id.substring(0,8)}... | ${timeout.service_code} | ${timeout.price}Ⓐ`)
      console.log(`   Created: ${new Date(timeout.created_at).toLocaleTimeString()}`)
      console.log(`   Timeout: ${new Date(timeout.updated_at).toLocaleTimeString()}`)
      
      // Vérifier les balance_operations pour cette activation
      const { data: ops } = await sb
        .from('balance_operations')
        .select('operation_type, amount, created_at')
        .eq('activation_id', timeout.id)
        .order('created_at', { ascending: true })

      console.log(`   Operations: ${ops?.length || 0}`)
      
      let hasFreeze = false
      let hasRefund = false
      let freezeAmount = 0
      
      if (ops && ops.length > 0) {
        ops.forEach(op => {
          const opTime = new Date(op.created_at).toLocaleTimeString()
          console.log(`     ${op.operation_type}: ${op.amount}Ⓐ (${opTime})`)
          
          if (op.operation_type === 'freeze') {
            hasFreeze = true
            freezeAmount = op.amount
          }
          if (op.operation_type === 'refund') {
            hasRefund = true
          }
        })
      }
      
      // Un phantom = freeze sans refund
      if (hasFreeze && !hasRefund) {
        console.log(`   🚨 PHANTOM CONFIRMÉ: ${freezeAmount}Ⓐ gelés sans refund`)
        phantoms.push({
          id: timeout.id,
          service: timeout.service_code,
          amount: freezeAmount,
          price: timeout.price
        })
      } else if (hasRefund) {
        console.log(`   ✅ Refund OK`)
      } else {
        console.log(`   ⚠️ Aucune operation`)
      }
    }
    
    console.log(`\n🎯 PHANTOMS À RÉPARER: ${phantoms.length}`)
    
    let totalToRecover = 0
    phantoms.forEach(phantom => {
      console.log(`   ${phantom.id.substring(0,8)}... (${phantom.service}) - ${phantom.amount}Ⓐ`)
      totalToRecover += phantom.amount
    })
    
    console.log(`\n💰 TOTAL À RÉCUPÉRER: ${totalToRecover}Ⓐ`)
    
    if (phantoms.length > 0) {
      console.log(`\n🛠️ RÉPARATION EN COURS...`)
      
      for (const phantom of phantoms) {
        console.log(`\n🔧 ${phantom.id.substring(0,8)}... (${phantom.service}) - ${phantom.amount}Ⓐ`)
        
        const { data: result, error } = await sb.rpc('atomic_refund', {
          p_user_id: userId,
          p_amount: phantom.amount,
          p_activation_id: phantom.id,
          p_rental_id: null,
          p_transaction_id: null,
          p_reason: `Phantom timeout repair - ${phantom.service}`
        })

        if (error) {
          console.log(`   ❌ Erreur: ${error.message}`)
        } else if (result && result.success) {
          console.log(`   ✅ ${phantom.amount}Ⓐ récupérés`)
          console.log(`   💰 Frozen après: ${result.user_frozen_after}Ⓐ`)
        } else {
          console.log(`   ❌ Échec: ${result?.message || 'unknown'}`)
        }
      }
      
      // Vérifier l'état final
      const { data: finalUser } = await sb
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', userId)
        .single()

      console.log(`\n🏁 ÉTAT FINAL:`)
      console.log(`   Balance: ${finalUser?.balance || 0}Ⓐ`)
      console.log(`   Frozen: ${finalUser?.frozen_balance || 0}Ⓐ`)
      console.log(`   Disponible: ${(finalUser?.balance || 0) - (finalUser?.frozen_balance || 0)}Ⓐ`)
      
      // Vérifier cohérence
      const { data: activeActs } = await sb
        .from('activations')
        .select('frozen_amount')
        .eq('user_id', userId)
        .in('status', ['pending', 'waiting'])

      const expectedFrozen = activeActs?.reduce((sum, act) => sum + act.frozen_amount, 0) || 0
      
      console.log(`\n✅ VÉRIFICATION FINALE:`)
      console.log(`   Frozen attendu: ${expectedFrozen}Ⓐ`)
      console.log(`   Frozen réel: ${finalUser?.frozen_balance || 0}Ⓐ`)
      
      if (expectedFrozen === finalUser?.frozen_balance) {
        console.log(`   🎉 PARFAIT! Frozen balance cohérent`)
      } else {
        console.log(`   ⚠️ Écart: ${(finalUser?.frozen_balance || 0) - expectedFrozen}Ⓐ`)
      }
    }
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}