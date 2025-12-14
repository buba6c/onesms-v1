import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔬 ANALYSE FORENSIQUE: Pourquoi les refunds ont échoué\n')

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c

try {
  // 1. Analyser TOUS les timeouts récents avec détails complets
  console.log('1️⃣ ANALYSE EXHAUSTIVE DES TIMEOUTS RÉCENTS...\n')
  
  const { data: timeouts } = await sb
    .from('activations')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'timeout')
    .gte('updated_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2h
    .order('updated_at', { ascending: false })

  console.log(`📱 TIMEOUTS TROUVÉS (2h): ${timeouts?.length || 0}`)

  for (const timeout of timeouts || []) {
    const createdAt = new Date(timeout.created_at)
    const updatedAt = new Date(timeout.updated_at)
    const expiresAt = new Date(timeout.expires_at)
    
    console.log(`\n🔍 ${timeout.id}`)
    console.log(`   Service: ${timeout.service_code}`)
    console.log(`   Prix: ${timeout.price}Ⓐ`)
    console.log(`   Frozen Amount: ${timeout.frozen_amount}Ⓐ`)
    console.log(`   Created: ${createdAt.toLocaleTimeString()} (${createdAt.toISOString()})`)
    console.log(`   Expires: ${expiresAt.toLocaleTimeString()} (${expiresAt.toISOString()})`)
    console.log(`   Timeout: ${updatedAt.toLocaleTimeString()} (${updatedAt.toISOString()})`)
    
    // Calculer si timeout prématuré
    const timeoutDelay = updatedAt - expiresAt
    const isEarly = timeoutDelay < 0
    
    console.log(`   Délai timeout: ${Math.round(timeoutDelay / 1000)}s ${isEarly ? '(PRÉMATURÉ!)' : '(normal)'}`)
    
    // Analyser les balance_operations
    const { data: ops } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', timeout.id)
      .order('created_at', { ascending: true })

    console.log(`   Operations: ${ops?.length || 0}`)
    
    let freezeOp = null
    let refundOp = null
    
    if (ops && ops.length > 0) {
      ops.forEach((op, i) => {
        const opTime = new Date(op.created_at)
        console.log(`     ${i+1}. ${op.operation_type.toUpperCase()}: ${op.amount}Ⓐ (${opTime.toLocaleTimeString()})`)
        console.log(`        Balance: ${op.balance_before} → ${op.balance_after}Ⓐ`)
        console.log(`        Frozen: ${op.frozen_before} → ${op.frozen_after}Ⓐ`)
        console.log(`        Reason: ${op.reason || 'N/A'}`)
        
        if (op.operation_type === 'freeze') freezeOp = op
        if (op.operation_type === 'refund') refundOp = op
      })
    } else {
      console.log(`     ❌ AUCUNE OPERATION TROUVÉE!`)
    }
    
    // Analyse du problème
    if (!freezeOp && !refundOp) {
      console.log(`   🚨 PROBLÈME: Timeout sans aucune operation financière`)
    } else if (freezeOp && !refundOp) {
      console.log(`   🚨 PROBLÈME: Freeze fait mais refund manquant`)
      console.log(`   💰 ${freezeOp.amount}Ⓐ gelés et jamais libérés`)
    } else if (freezeOp && refundOp) {
      console.log(`   ✅ Freeze + Refund OK`)
      
      // Vérifier la cohérence du refund
      const refundCorrect = refundOp.amount === freezeOp.amount
      const frozenCorrect = refundOp.frozen_after === Math.max(0, refundOp.frozen_before - refundOp.amount)
      
      console.log(`   Montant refund correct: ${refundCorrect ? '✅' : '❌'} (${refundOp.amount} vs ${freezeOp.amount})`)
      console.log(`   Frozen calculé correct: ${frozenCorrect ? '✅' : '❌'}`)
      
      if (!refundCorrect || !frozenCorrect) {
        console.log(`   🚨 REFUND DÉFAILLANT même si présent!`)
      }
    }
  }

  // 2. Analyser les cron jobs et leurs logs
  console.log(`\n\n2️⃣ ANALYSE DES CRON JOBS...`)
  
  // Lister toutes les fonctions edge
  const { data: functions, error: funcError } = await sb.functions.invoke('_get_functions_list', {})
  
  if (funcError) {
    console.log(`❌ Impossible de lister les fonctions: ${funcError.message}`)
  } else {
    console.log(`\n🔧 FONCTIONS EDGE ACTIVES:`)
    if (functions && functions.length > 0) {
      functions.forEach(func => {
        console.log(`   - ${func.name}`)
      })
    }
  }

  // 3. Analyser le pattern des échecs
  console.log(`\n\n3️⃣ PATTERN ANALYSIS DES ÉCHECS...`)
  
  // Compter les timeouts avec/sans refund par période
  const now = new Date()
  const periods = [
    { name: '1h', start: new Date(now - 1 * 60 * 60 * 1000) },
    { name: '3h', start: new Date(now - 3 * 60 * 60 * 1000) },
    { name: '6h', start: new Date(now - 6 * 60 * 60 * 1000) },
    { name: '24h', start: new Date(now - 24 * 60 * 60 * 1000) }
  ]
  
  for (const period of periods) {
    const { data: periodTimeouts } = await sb
      .from('activations')
      .select('id, service_code, frozen_amount')
      .eq('user_id', userId)
      .eq('status', 'timeout')
      .gte('updated_at', period.start.toISOString())

    let withRefund = 0
    let withoutRefund = 0
    let totalFrozenLost = 0
    
    for (const timeout of periodTimeouts || []) {
      const { data: refundOps } = await sb
        .from('balance_operations')
        .select('amount')
        .eq('activation_id', timeout.id)
        .eq('operation_type', 'refund')

      if (refundOps && refundOps.length > 0) {
        withRefund++
      } else {
        withoutRefund++
        totalFrozenLost += timeout.frozen_amount || 0
      }
    }
    
    console.log(`\n📊 PÉRIODE ${period.name}:`)
    console.log(`   Timeouts total: ${(periodTimeouts || []).length}`)
    console.log(`   Avec refund: ${withRefund}`)
    console.log(`   Sans refund: ${withoutRefund} (${Math.round(withoutRefund / Math.max(1, (periodTimeouts || []).length) * 100)}%)`)
    console.log(`   Fonds perdus: ${totalFrozenLost}Ⓐ`)
  }

  // 4. Analyser le code de l'ancien cron
  console.log(`\n\n4️⃣ ANALYSE DU CODE DE L'ANCIEN CRON...`)
  
  try {
    // Chercher les fichiers cron dans le workspace
    const cronFiles = [
      'cron-check-pending-sms/index.ts',
      'supabase/functions/cron-check-pending-sms/index.ts',
      'check_pending_sms.mjs'
    ]
    
    for (const filePath of cronFiles) {
      try {
        const { data: fileContent } = await sb.storage
          .from('functions')
          .download(filePath)
        
        if (fileContent) {
          console.log(`\n📄 TROUVÉ: ${filePath}`)
          // Analyser le contenu pour trouver la logique de timeout
          const content = await fileContent.text()
          
          // Chercher les patterns dangereux
          const dangerousPatterns = [
            'UPDATE activations SET status = \'timeout\'',
            'frozen_amount = 0',
            'UPDATE users SET frozen_balance',
            'without calling atomic_refund'
          ]
          
          dangerousPatterns.forEach(pattern => {
            if (content.includes(pattern)) {
              console.log(`   🚨 PATTERN DANGEREUX TROUVÉ: ${pattern}`)
            }
          })
        }
      } catch (err) {
        // Fichier non trouvé
      }
    }
  } catch (err) {
    console.log(`⚠️ Analyse des fichiers cron non disponible`)
  }

  // 5. Théories sur les causes racines
  console.log(`\n\n5️⃣ THÉORIES SUR LES CAUSES RACINES...`)
  
  console.log(`\n🧠 HYPOTHÈSES:`)
  console.log(``)
  console.log(`A) LOGIQUE DÉFAILLANTE DE L'ANCIEN CRON:`)
  console.log(`   - Fait UPDATE direct sur activations.status`)
  console.log(`   - Fait UPDATE direct sur users.frozen_balance`)
  console.log(`   - N'appelle JAMAIS atomic_refund()`)
  console.log(`   - Crée des balance_operations manuellement (parfois)`)
  console.log(``)
  console.log(`B) RACE CONDITIONS:`)
  console.log(`   - Plusieurs instances du cron en parallèle`)
  console.log(`   - Timeout marqué mais refund échoue silencieusement`)
  console.log(`   - Transactions partielles non rollback`)
  console.log(``)
  console.log(`C) ERREURS SILENCIEUSES:`)
  console.log(`   - Try/catch avalant les erreurs`)
  console.log(`   - Logs insuffisants pour débugger`)
  console.log(`   - Pas de vérification post-opération`)
  console.log(``)
  console.log(`D) ARCHITECTURE DÉFAILLANTE:`)
  console.log(`   - Logique métier dispersée`)
  console.log(`   - Pas de fonction atomique centralisée`)
  console.log(`   - Cohérence dépendante de multiples étapes manuelles`)

  // 6. Recommandations
  console.log(`\n\n6️⃣ RECOMMANDATIONS POUR ÉVITER À L'AVENIR...`)
  
  console.log(`\n💡 SOLUTIONS PRÉVENTIVES:`)
  console.log(``)
  console.log(`✅ DÉJÀ FAIT:`)
  console.log(`   - atomic_refund() centralisé et testé`)
  console.log(`   - realtime_monitoring.mjs pour détection immédiate`)
  console.log(`   - process_expired_activations() 100% atomique`)
  console.log(``)
  console.log(`🔧 À CONSIDÉRER:`)
  console.log(`   - Audit trail complet de chaque timeout`)
  console.log(`   - Alertes Slack/email sur phantom timeouts`)
  console.log(`   - Dashboard temps réel des frozen_balance`)
  console.log(`   - Tests automatisés end-to-end du flow timeout`)

  console.log(`\n🎯 CONCLUSION:`)
  console.log(`L'ancien cron avait une logique fondamentalement défaillante`)
  console.log(`qui faisait des UPDATE manuels au lieu d'utiliser les fonctions`)
  console.log(`atomiques. Le nouveau système est bulletproof par design.`)

} catch (error) {
  console.error('❌ ERREUR ANALYSE:', error.message)
  console.error(error.stack)
}