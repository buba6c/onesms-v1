import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🚨 URGENCE: Détection timeout sans refund!\n')

try {
  const now = new Date()
  const recentTime = new Date(now.getTime() - 10 * 60 * 1000) // 10 minutes ago

  // 1. Trouver les timeouts récents sans refund
  console.log('1️⃣ Recherche des timeouts récents sans refund...')
  
  const { data: recentTimeouts, error: timeoutError } = await sb
    .from('activations')
    .select('id, user_id, service_code, price, frozen_amount, status, expires_at, updated_at, created_at')
    .eq('status', 'timeout')
    .gte('updated_at', recentTime.toISOString())
    .order('updated_at', { ascending: false })
    .limit(10)

  if (timeoutError) {
    throw new Error(`Erreur recherche timeouts: ${timeoutError.message}`)
  }

  console.log(`📊 ${recentTimeouts?.length || 0} timeouts récents trouvés`)

  if (!recentTimeouts || recentTimeouts.length === 0) {
    console.log('✅ Aucun timeout récent')
    process.exit(0)
  }

  // 2. Vérifier lesquels n'ont pas de refund
  const suspectTimeouts = []
  
  for (const timeout of recentTimeouts) {
    const { data: operations } = await sb
      .from('balance_operations')
      .select('operation_type, amount, created_at')
      .eq('activation_id', timeout.id)
      .order('created_at', { ascending: true })

    const hasRefund = operations?.some(op => op.operation_type === 'refund')
    const timeoutAge = Math.round((now - new Date(timeout.updated_at)) / 60000)
    
    console.log(`\n📱 ${timeout.id.substring(0,8)}... (${timeout.service_code})`)
    console.log(`   Prix: ${timeout.price}Ⓐ | frozen_amount: ${timeout.frozen_amount}Ⓐ`)
    console.log(`   Timeout il y a: ${timeoutAge} minutes`)
    console.log(`   Operations: ${operations?.map(o => `${o.operation_type}(${o.amount}Ⓐ)`).join(', ') || 'aucune'}`)
    console.log(`   Refund: ${hasRefund ? '✅' : '❌ MANQUANT'}`)
    
    if (!hasRefund) {
      suspectTimeouts.push({
        ...timeout,
        age_minutes: timeoutAge,
        operations
      })
    }
  }

  if (suspectTimeouts.length === 0) {
    console.log('\n✅ Tous les timeouts récents ont leurs refunds')
    process.exit(0)
  }

  // 3. Réparer immédiatement les timeouts sans refund
  console.log(`\n🔧 RÉPARATION IMMÉDIATE: ${suspectTimeouts.length} timeouts sans refund`)
  
  let repaired = 0
  let totalRefunded = 0

  for (const suspect of suspectTimeouts) {
    try {
      console.log(`\n🔄 Réparation de ${suspect.id.substring(0,8)}... (${suspect.service_code}, ${suspect.price}Ⓐ)`)
      
      // Utiliser atomic_refund pour réparer
      const { data: refundResult, error: refundError } = await sb.rpc('atomic_refund', {
        p_user_id: suspect.user_id,
        p_amount: suspect.price,
        p_activation_id: suspect.id,
        p_reason: `Emergency repair - timeout without refund (${suspect.age_minutes}min ago)`
      })

      if (refundError) {
        console.error(`❌ Erreur refund ${suspect.id.substring(0,8)}...`, refundError.message)
        
        // Tenter refund direct si atomic_refund échoue
        if (refundError.message?.includes('rental') || refundError.message?.includes('transaction')) {
          console.log('   ⚠️ Tentative refund direct...')
          
          const { data: directResult, error: directError } = await sb.rpc('atomic_refund_direct', {
            p_user_id: suspect.user_id,
            p_amount: suspect.price,
            p_transaction_id: crypto.randomUUID(),
            p_reason: 'Emergency direct refund'
          })

          if (directError) {
            console.error('   ❌ Refund direct échoué:', directError.message)
          } else {
            console.log(`   ✅ Refund direct réussi: ${directResult?.amount_refunded || suspect.price}Ⓐ`)
            repaired++
            totalRefunded += (directResult?.amount_refunded || suspect.price)
          }
        }
      } else {
        console.log(`   ✅ Refund réussi: ${refundResult?.amount_refunded || suspect.price}Ⓐ`)
        repaired++
        totalRefunded += (refundResult?.amount_refunded || suspect.price)
      }

    } catch (error) {
      console.error(`❌ Erreur réparation ${suspect.id.substring(0,8)}...`, error.message)
    }
  }

  // 4. Résumé final
  console.log(`\n🎯 RÉSUMÉ URGENCE:`)
  console.log(`   Timeouts détectés: ${suspectTimeouts.length}`)
  console.log(`   Réparés: ${repaired}`)
  console.log(`   Total refundé: ${totalRefunded}Ⓐ`)

  if (repaired === suspectTimeouts.length) {
    console.log(`\n✅ URGENCE RÉSOLUE! Tous les timeouts ont été refundés`)
  } else {
    console.log(`\n⚠️ ${suspectTimeouts.length - repaired} timeouts non réparés - Investigation nécessaire`)
  }

  // 5. Vérifier l'état user après réparation
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c
  const { data: finalUser } = await sb
    .from('users')
    .select('frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`\n💰 User frozen_balance final: ${finalUser.frozen_balance}Ⓐ`)

} catch (error) {
  console.error('❌ ERREUR URGENCE:', error.message)
}