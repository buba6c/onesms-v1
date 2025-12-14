import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔧 RÉCUPÉRATION: Timeouts fantômes (status=timeout sans refund)\n')

try {
  // 1. Trouver tous les timeouts sans refund
  console.log('1️⃣ Recherche des timeouts fantômes...')
  
  const { data: phantomTimeouts, error: searchError } = await sb
    .from('activations')
    .select('id, user_id, service_code, price, frozen_amount, expires_at')
    .eq('status', 'timeout')
    .eq('frozen_amount', 0)  // Marqué comme timeout mais frozen_amount=0
    .lt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  if (searchError) {
    throw new Error(`Erreur recherche: ${searchError.message}`)
  }

  console.log(`📊 Trouvé ${phantomTimeouts?.length || 0} timeouts fantômes`)

  if (!phantomTimeouts || phantomTimeouts.length === 0) {
    console.log('✅ Aucun timeout fantôme trouvé!')
    process.exit(0)
  }

  // 2. Vérifier lesquels n'ont PAS de refund dans balance_operations
  const realPhantoms = []
  
  for (const timeout of phantomTimeouts) {
    const { data: ops } = await sb
      .from('balance_operations')
      .select('operation_type')
      .eq('activation_id', timeout.id)
      .eq('operation_type', 'refund')

    if (!ops || ops.length === 0) {
      // Pas de refund = vraiment fantôme!
      realPhantoms.push(timeout)
      console.log(`👻 FANTÔME: ${timeout.id} (${timeout.service_code}, ${timeout.price}Ⓐ)`)
    }
  }

  console.log(`\n🚨 TOTAL FANTÔMES: ${realPhantoms.length}`)

  if (realPhantoms.length === 0) {
    console.log('✅ Tous les timeouts ont bien leurs refunds!')
    process.exit(0)
  }

  // 3. Récupérer chaque fantôme individuellement
  let recovered = 0
  let totalRefunded = 0

  for (const phantom of realPhantoms) {
    try {
      console.log(`\n🔄 Récupération de ${phantom.id}...`)
      
      // Appeler atomic_refund avec le montant d'origine (price)
      const { data: refundResult, error: refundError } = await sb.rpc('atomic_refund', {
        p_user_id: phantom.user_id,
        p_amount: phantom.price,  // Utiliser price comme montant original
        p_activation_id: phantom.id,
        p_reason: 'Recovery phantom timeout - missing refund'
      })

      if (refundError) {
        if (refundError.message?.includes('idempotent') || refundError.message?.includes('already')) {
          console.log(`⚠️ Déjà refundé (idempotent): ${phantom.id}`)
        } else {
          console.error(`❌ Échec refund ${phantom.id}: ${refundError.message}`)
        }
      } else {
        console.log(`✅ RÉCUPÉRÉ: ${refundResult?.amount_refunded || phantom.price}Ⓐ refunded`)
        recovered++
        totalRefunded += (refundResult?.amount_refunded || phantom.price)
      }

    } catch (error) {
      console.error(`❌ Erreur récupération ${phantom.id}: ${error.message}`)
    }
  }

  console.log(`\n🎉 RÉCUPÉRATION TERMINÉE:`)
  console.log(`   Récupérés: ${recovered}/${realPhantoms.length}`)
  console.log(`   Total refundé: ${totalRefunded}Ⓐ`)

  // 4. Vérifier le test spécifique
  const testId = '7628e7cc-43ae-49aa-97ca-01e966320d86'
  if (realPhantoms.some(p => p.id === testId)) {
    console.log(`\n✅ Notre test ${testId.substring(0,8)}... a été récupéré!`)
  }

} catch (error) {
  console.error('❌ ERREUR RÉCUPÉRATION:', error.message)
}