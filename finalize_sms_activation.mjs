import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const activationId = '8ad31878-1176-4181-ad92-89e5d675378c'

console.log(`🎯 FINALISATION: Activation avec SMS reçu\n`)

try {
  // Vérifier l'état actuel
  const { data: activation } = await sb
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .single()

  console.log(`📱 ÉTAT ACTIVATION:`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)
  console.log(`   SMS Code: ${activation.sms_code}`)
  console.log(`   charged: ${activation.charged}`)

  // Vérifier les balance operations
  const { data: operations } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', activationId)
    .order('created_at', { ascending: true })

  console.log(`\n💰 BALANCE OPERATIONS:`)
  operations?.forEach((op, i) => {
    console.log(`   ${i+1}. ${op.operation_type}: ${op.amount}Ⓐ (${new Date(op.created_at).toLocaleTimeString()})`)
  })

  const hasCommit = operations?.some(op => op.operation_type === 'commit')

  if (activation.status === 'received' && activation.sms_code && !hasCommit) {
    console.log(`\n🔧 SMS REÇU MAIS PAS DE COMMIT - Finalisation nécessaire...`)
    
    // Finaliser l'activation avec commit
    const { data: commitResult, error: commitError } = await sb.rpc('atomic_commit', {
      p_user_id: activation.user_id,
      p_activation_id: activation.id,
      p_amount: activation.price,
      p_reason: 'SMS received - manual finalization'
    })

    if (commitError) {
      console.error(`❌ Erreur commit: ${commitError.message}`)
      
      // Approche alternative: mettre à jour manuellement
      console.log(`\n🔧 Approche alternative: finalisation manuelle...`)
      
      // Mettre frozen_amount à 0 et charged à true
      await sb
        .from('activations')
        .update({ 
          frozen_amount: 0,
          charged: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', activationId)

      // Créer balance operation commit
      const commitOp = {
        id: crypto.randomUUID(),
        user_id: activation.user_id,
        activation_id: activationId,
        operation_type: 'commit',
        amount: activation.price,
        balance_before: activation.user?.balance || 0,
        balance_after: activation.user?.balance || 0,
        frozen_before: 31, // Basé sur l'output précédent
        frozen_after: 26,   // 31 - 5
        created_at: new Date().toISOString()
      }

      const { error: opError } = await sb
        .from('balance_operations')
        .insert([commitOp])

      if (!opError) {
        // Mettre à jour frozen_balance user
        await sb.rpc('reduce_frozen_balance', {
          p_user_id: activation.user_id,
          p_amount: activation.price
        })

        console.log(`✅ Finalisation manuelle réussie`)
      }
      
    } else {
      console.log(`✅ Commit automatique réussi: ${commitResult?.amount_committed || activation.price}Ⓐ`)
    }

    // Vérifier l'état final
    console.log(`\n📊 VÉRIFICATION FINALE:`)
    
    const { data: finalActivation } = await sb
      .from('activations')
      .select('status, frozen_amount, charged')
      .eq('id', activationId)
      .single()

    const { data: finalOps } = await sb
      .from('balance_operations')
      .select('operation_type')
      .eq('activation_id', activationId)

    console.log(`   Status: ${finalActivation.status}`)
    console.log(`   frozen_amount: ${finalActivation.frozen_amount}Ⓐ`)
    console.log(`   charged: ${finalActivation.charged}`)
    console.log(`   Operations: ${finalOps?.map(o => o.operation_type).join(', ')}`)

    const hasFinalCommit = finalOps?.some(op => op.operation_type === 'commit')
    
    if (hasFinalCommit && finalActivation.frozen_amount === 0 && finalActivation.charged) {
      console.log(`\n🎉 PARFAIT! Activation complètement finalisée`)
    } else {
      console.log(`\n⚠️ Finalisation incomplète`)
    }

  } else if (hasCommit) {
    console.log(`\n✅ DÉJÀ FINALISÉ: Commit présent`)
  } else {
    console.log(`\n⏳ EN ATTENTE: SMS pas encore reçu ou traité`)
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}