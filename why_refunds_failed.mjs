import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔬 ANALYSE: Pourquoi les refunds ont échoué')

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

try {
  // Récupérer les 4 activations phantoms qu'on a réparées
  const phantomIds = [
    'b6b2c809-62b7-42e7-9f72-89b9cd5e0f38', // fu - 5Ⓐ
    '7a48b90e-7e78-4ebe-9f6f-0f99e1b4a8fc', // nf - 5Ⓐ  
    'edb3e8d2-d05b-4bc8-8c81-89b9cd5e0f38', // test15a - 15Ⓐ
    'c9e0358d-d05b-4bc8-8c81-89b9cd5e0f38'  // vi - 5Ⓐ
  ]

  console.log('\n🚨 ANALYSE DES 4 PHANTOMS RÉPARÉS:\n')

  for (const phantomId of phantomIds) {
    // Récupérer l'activation
    const { data: activation } = await sb
      .from('activations')
      .select('*')
      .eq('id', phantomId)
      .single()

    if (!activation) {
      console.log(`❌ ${phantomId.substring(0,8)}... - Activation introuvable`)
      continue
    }

    console.log(`🔍 ${phantomId.substring(0,8)}... (${activation.service_code})`)
    console.log(`   Prix: ${activation.price}Ⓐ`)
    console.log(`   Status: ${activation.status}`)
    console.log(`   Frozen: ${activation.frozen_amount}Ⓐ`)
    
    const created = new Date(activation.created_at)
    const updated = new Date(activation.updated_at) 
    const expires = new Date(activation.expires_at)
    
    console.log(`   Créé: ${created.toLocaleTimeString()}`)
    console.log(`   Expire: ${expires.toLocaleTimeString()}`)
    console.log(`   Timeout: ${updated.toLocaleTimeString()}`)
    
    // Analyser si timeout prématuré
    const timeoutDelay = updated - expires
    if (timeoutDelay < 0) {
      console.log(`   🚨 TIMEOUT PRÉMATURÉ: ${Math.abs(Math.round(timeoutDelay/1000))}s AVANT expiration!`)
    } else {
      console.log(`   ✅ Timeout normal: ${Math.round(timeoutDelay/1000)}s après expiration`)
    }

    // Analyser les balance_operations
    const { data: ops } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', phantomId)
      .order('created_at', { ascending: true })

    console.log(`   Operations: ${ops?.length || 0}`)
    
    if (ops && ops.length > 0) {
      ops.forEach((op, i) => {
        const opTime = new Date(op.created_at)
        console.log(`     ${i+1}. ${op.operation_type}: ${op.amount}Ⓐ (${opTime.toLocaleTimeString()})`)
        console.log(`        Frozen: ${op.frozen_before} → ${op.frozen_after}Ⓐ`)
        console.log(`        Reason: ${op.reason || 'N/A'}`)
      })
      
      // Analyser le pattern
      const hasFreeze = ops.some(op => op.operation_type === 'freeze')
      const hasRefund = ops.some(op => op.operation_type === 'refund')
      
      if (hasFreeze && !hasRefund) {
        console.log(`   🚨 PROBLÈME: Freeze sans refund → PHANTOM`)
      } else if (hasFreeze && hasRefund) {
        console.log(`   ✅ Freeze + refund OK`)
      }
    } else {
      console.log(`   ❌ AUCUNE OPERATION! Phantom sans trace`)
    }
    
    console.log(``) // ligne vide
  }

  // Analyser le pattern temporel
  console.log(`\n📊 ANALYSE TEMPORELLE DES ÉCHECS:\n`)
  
  const allPhantomOps = []
  for (const phantomId of phantomIds) {
    const { data: ops } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', phantomId)
      .order('created_at', { ascending: true })
    
    if (ops) allPhantomOps.push(...ops)
  }
  
  // Grouper par heure pour voir les patterns
  const hourlyPattern = {}
  allPhantomOps.forEach(op => {
    const hour = new Date(op.created_at).getHours()
    if (!hourlyPattern[hour]) hourlyPattern[hour] = { freeze: 0, refund: 0 }
    hourlyPattern[hour][op.operation_type]++
  })
  
  console.log(`PATTERN PAR HEURE:`)
  Object.keys(hourlyPattern).forEach(hour => {
    const pattern = hourlyPattern[hour]
    console.log(`  ${hour}h: ${pattern.freeze} freeze, ${pattern.refund} refund`)
  })

  // Théories sur la cause racine
  console.log(`\n🧠 THÉORIES SUR LA CAUSE RACINE:\n`)
  
  console.log(`1️⃣ LOGIQUE DÉFAILLANTE DE L'ANCIEN CRON:`)
  console.log(`   • Le cron fait UPDATE activations SET status='timeout', frozen_amount=0`)
  console.log(`   • Mais n'appelle PAS atomic_refund()`)
  console.log(`   • Résultat: status changé mais fonds jamais libérés`)
  console.log(``)
  
  console.log(`2️⃣ ARCHITECTURE DANGEREUSE:`)
  console.log(`   • Logique dispersée en plusieurs étapes non-atomiques`)
  console.log(`   • Si une étape échoue, état incohérent`)
  console.log(`   • Pas de rollback automatique`)
  console.log(``)
  
  console.log(`3️⃣ GESTION D'ERREUR INSUFFISANTE:`)
  console.log(`   • Try/catch qui avale les erreurs`)
  console.log(`   • Pas de logs détaillés`)
  console.log(`   • Échecs silencieux`)
  console.log(``)
  
  console.log(`4️⃣ RACE CONDITIONS POSSIBLES:`)
  console.log(`   • Plusieurs instances cron en parallèle`)
  console.log(`   • Timeout marqué 2x mais refund 1x`)
  console.log(`   • État final incohérent`)

  console.log(`\n✅ SOLUTION NOUVELLE ARCHITECTURE:`)
  console.log(`   • process_expired_activations() 100% atomique`)
  console.log(`   • Une seule fonction RPC pour tout le flow`)
  console.log(`   • Impossible d'avoir état incohérent`)
  console.log(`   • Monitoring temps réel des phantoms`)

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}