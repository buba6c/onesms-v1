import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔥 TEST LIVE: Nouveau cron sur activations réelles\n')

async function testLiveRefund() {
  try {
    console.log('1️⃣ État AVANT le cron...')
    
    // État avant
    const { data: beforeActivations } = await sb
      .from('activations')
      .select('id, service_code, price, frozen_amount, status, expires_at')
      .in('status', ['pending', 'waiting'])
      .lt('expires_at', new Date().toISOString())
      .gt('frozen_amount', 0)
    
    const { data: beforeUser } = await sb
      .from('users')
      .select('frozen_balance')
      .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
      .single()

    console.log(`   Activations expirées avec frozen > 0: ${beforeActivations?.length || 0}`)
    if (beforeActivations && beforeActivations.length > 0) {
      beforeActivations.forEach(act => {
        console.log(`     ${act.id.substring(0,8)}... | ${act.service_code} | ${act.frozen_amount}Ⓐ`)
      })
    }
    console.log(`   User frozen_balance: ${beforeUser.frozen_balance}Ⓐ`)

    // Appeler le nouveau cron atomic
    console.log('\n2️⃣ Appel du nouveau cron atomic-reliable...')
    
    const startTime = Date.now()
    const { data: cronResult, error: cronError } = await sb.functions.invoke('cron-atomic-reliable', {
      body: { trigger: 'live_test', timestamp: new Date().toISOString() }
    })
    const endTime = Date.now()

    if (cronError) {
      console.error('❌ Erreur cron:', cronError.message)
      return
    }

    console.log(`✅ Cron terminé en ${endTime - startTime}ms`)
    console.log('📊 Résultat:')
    if (cronResult?.timeout_processing) {
      const tp = cronResult.timeout_processing
      console.log(`   🔄 Timeouts: ${tp.processed} processed, ${tp.refunded_total}Ⓐ refunded, ${tp.errors} errors`)
    }
    if (cronResult?.sms_checking) {
      const sc = cronResult.sms_checking
      console.log(`   📱 SMS: ${sc.checked} checked, ${sc.found} found, ${sc.errors} errors`)
    }

    // État après
    console.log('\n3️⃣ État APRÈS le cron...')
    
    await new Promise(resolve => setTimeout(resolve, 2000)) // Attendre 2s pour la propagation

    const { data: afterActivations } = await sb
      .from('activations')
      .select('id, service_code, price, frozen_amount, status, expires_at')
      .in('status', ['pending', 'waiting'])
      .lt('expires_at', new Date().toISOString())
      .gt('frozen_amount', 0)
    
    const { data: afterUser } = await sb
      .from('users')
      .select('frozen_balance')
      .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
      .single()

    console.log(`   Activations expirées avec frozen > 0: ${afterActivations?.length || 0}`)
    console.log(`   User frozen_balance: ${beforeUser.frozen_balance} → ${afterUser.frozen_balance}Ⓐ`)
    
    const refundAmount = beforeUser.frozen_balance - afterUser.frozen_balance
    
    if (refundAmount > 0) {
      console.log(`\n🎉 REFUND AUTOMATIQUE RÉUSSI!`)
      console.log(`   💰 ${refundAmount}Ⓐ automatiquement refundés`)
      console.log(`   ✅ Le nouveau système fonctionne sur les activations réelles`)
    } else if (beforeActivations?.length === 0) {
      console.log(`\n✅ Aucun timeout à traiter - Système en attente`)
    } else {
      console.log(`\n⚠️ Timeouts détectés mais pas de refund - Analyser pourquoi`)
    }

    // Vérifier les timeouts fantômes récupérables
    console.log('\n4️⃣ Timeouts fantômes à récupérer...')
    
    const { data: phantoms } = await sb
      .from('activations')
      .select('id, price, service_code')
      .eq('status', 'timeout')
      .eq('frozen_amount', 0)
      .limit(5)

    let phantomCount = 0
    let phantomAmount = 0
    
    if (phantoms) {
      for (const phantom of phantoms) {
        const { data: ops } = await sb
          .from('balance_operations')
          .select('operation_type')
          .eq('activation_id', phantom.id)
          .eq('operation_type', 'refund')

        if (!ops || ops.length === 0) {
          phantomCount++
          phantomAmount += phantom.price
        }
      }
    }

    if (phantomCount > 0) {
      console.log(`   💰 ${phantomCount} timeouts fantômes = ${phantomAmount}Ⓐ récupérables`)
      console.log(`   💡 Utilisez: node recover_phantom_timeouts.mjs`)
    } else {
      console.log(`   ✅ Aucun timeout fantôme`)
    }

  } catch (error) {
    console.error('❌ ERREUR TEST:', error.message)
  }
}

testLiveRefund()