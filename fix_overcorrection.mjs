import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c

console.log('🚨 CORRECTION URGENTE: Surcompensation de 15Ⓐ détectée!\n')

try {
  // 1. Vérifier l'état actuel
  const { data: user } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`👤 ÉTAT ACTUEL:`)
  console.log(`   Balance: ${user.balance}Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ`)

  // 2. Vérifier les activations pending légitimes
  const { data: pendingActivations } = await sb
    .from('activations')
    .select('id, service_code, price, frozen_amount, status, expires_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting'])

  console.log(`\n📱 ACTIVATIONS PENDING LÉGITIMES: ${pendingActivations?.length || 0}`)
  
  let expectedFrozen = 0
  if (pendingActivations && pendingActivations.length > 0) {
    pendingActivations.forEach(act => {
      const now = new Date()
      const expires = new Date(act.expires_at)
      const timeLeft = Math.round((expires - now) / 60000)
      
      console.log(`   ${act.id.substring(0,8)}... | ${act.service_code} | ${act.price}Ⓐ | ${timeLeft}min`)
      expectedFrozen += act.frozen_amount || act.price
    })
  }
  
  console.log(`\n🎯 CALCUL CORRECT:`)
  console.log(`   Frozen attendu: ${expectedFrozen}Ⓐ`)
  console.log(`   Frozen actuel: ${user.frozen_balance}Ⓐ`)
  console.log(`   Correction nécessaire: +${expectedFrozen - user.frozen_balance}Ⓐ`)

  // 3. Analyser les dernières balance_operations pour comprendre la surcompensation
  const { data: recentOps } = await sb
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  console.log(`\n💰 DERNIÈRES OPERATIONS:`)
  if (recentOps && recentOps.length > 0) {
    recentOps.forEach((op, i) => {
      const opTime = new Date(op.created_at).toLocaleTimeString()
      const activationId = op.activation_id?.substring(0, 8) || 'N/A'
      
      console.log(`   ${i+1}. ${op.operation_type.toUpperCase()}: ${op.amount}Ⓐ (${opTime})`)
      console.log(`      Activation: ${activationId}...`)
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}Ⓐ`)
      console.log(`      Frozen: ${op.frozen_before} → ${op.frozen_after}Ⓐ`)
    })
  }

  // 4. Corriger le frozen_balance
  if (expectedFrozen !== user.frozen_balance) {
    console.log(`\n🛠️ CORRECTION EN COURS...`)
    
    const { data: correctionResult, error } = await sb.rpc('atomic_freeze', {
      p_user_id: userId,
      p_amount: expectedFrozen - user.frozen_balance,
      p_activation_id: null,
      p_rental_id: null,
      p_transaction_id: null,
      p_reason: `Correction surcompensation phantom repair`
    })

    if (error) {
      console.log(`   ❌ Erreur correction: ${error.message}`)
      
      // Correction manuelle si atomic_freeze échoue
      console.log(`   🔧 Correction manuelle...`)
      
      const { error: updateError } = await sb
        .from('users')
        .update({ 
          frozen_balance: expectedFrozen,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.log(`   ❌ Erreur correction manuelle: ${updateError.message}`)
      } else {
        console.log(`   ✅ Frozen_balance corrigé manuellement à ${expectedFrozen}Ⓐ`)
        
        // Logger l'operation de correction
        await sb
          .from('balance_operations')
          .insert({
            user_id: userId,
            operation_type: 'freeze',
            amount: expectedFrozen - user.frozen_balance,
            balance_before: user.balance,
            balance_after: user.balance,
            frozen_before: user.frozen_balance,
            frozen_after: expectedFrozen,
            reason: 'Manual correction - phantom repair overcorrection',
            created_at: new Date().toISOString()
          })
      }
    } else if (correctionResult && correctionResult.success) {
      console.log(`   ✅ Correction réussie via atomic_freeze`)
      console.log(`   💰 Nouveau frozen: ${correctionResult.user_frozen_after}Ⓐ`)
    }
  }

  // 5. Vérification finale
  const { data: finalUser } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`\n🏁 ÉTAT FINAL CORRIGÉ:`)
  console.log(`   Balance: ${finalUser.balance}Ⓐ`)
  console.log(`   Frozen: ${finalUser.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ`)

  if (finalUser.frozen_balance === expectedFrozen) {
    console.log(`   ✅ PARFAIT! Frozen balance maintenant cohérent`)
  } else {
    console.log(`   ⚠️ Écart restant: ${finalUser.frozen_balance - expectedFrozen}Ⓐ`)
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}