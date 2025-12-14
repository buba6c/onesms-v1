import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { config } from 'dotenv'
const { Client } = pg

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

const pgClient = new Client({
  host: 'aws-1-eu-central-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.htfqmamvmhdoixqcbbbw',
  password: 'Workeverytime@4##',
  ssl: { rejectUnauthorized: false }
})

console.log('🔬 ANALYSE ULTRA-APPROFONDIE - 30 MINUTES')
console.log('═══════════════════════════════════════════════════════════════════════\n')
console.log('Début:', new Date().toLocaleString('fr-FR'))
console.log('\n═══════════════════════════════════════════════════════════════════════\n')

await pgClient.connect()

// ============================================================================
// PARTIE 1: ÉTAT ACTUEL DU SYSTÈME (5 min)
// ============================================================================

console.log('📊 PARTIE 1/6: ÉTAT ACTUEL DU SYSTÈME')
console.log('─────────────────────────────────────────────────────────────────────\n')

// 1.1 Vérifier les fonctions SQL critiques
console.log('1.1 Fonctions SQL critiques:\n')

const functions = ['process_sms_received', 'atomic_commit', 'atomic_refund', 'secure_freeze_balance', 'prevent_direct_frozen_amount_update']
for (const funcName of functions) {
  const res = await pgClient.query(`
    SELECT 
      proname,
      pg_get_functiondef(oid) as definition,
      prosecdef as is_security_definer
    FROM pg_proc
    WHERE proname = $1
    LIMIT 1
  `, [funcName])
  
  if (res.rows.length > 0) {
    const func = res.rows[0]
    const def = func.definition
    console.log(`✅ ${funcName}`)
    console.log(`   Security Definer: ${func.is_security_definer ? 'YES' : 'NO'}`)
    
    if (funcName === 'prevent_direct_frozen_amount_update') {
      const hasFix = def.includes('pg_trigger_depth()')
      console.log(`   pg_trigger_depth(): ${hasFix ? '✅ OUI (FIXÉ)' : '❌ NON (BUGUÉ!)'}`)
      if (!hasFix) {
        console.log(`   ⚠️  PROBLÈME CRITIQUE: Le trigger bloque atomic_commit!\n`)
      }
    }
    
    if (funcName === 'atomic_commit') {
      const usesRecord = def.includes('RECORD')
      const usesOld = def.includes('OLD.')
      console.log(`   Utilise RECORD: ${usesRecord ? '❌ OUI (peut causer erreur)' : '✅ NON'}`)
      console.log(`   Utilise OLD.: ${usesOld ? '❌ OUI (peut causer erreur)' : '✅ NON'}`)
    }
  } else {
    console.log(`❌ ${funcName} - FONCTION MANQUANTE!`)
  }
  console.log('')
}

// 1.2 État des Edge Functions
console.log('\n1.2 Edge Functions déployées:\n')

const { data: activations } = await supabase
  .from('activations')
  .select('status')
  .gte('created_at', new Date(Date.now() - 3600000).toISOString())

console.log(`Activations créées dernière heure: ${activations?.length || 0}`)

const statusCounts = {}
activations?.forEach(a => {
  statusCounts[a.status] = (statusCounts[a.status] || 0) + 1
})

console.log('Statuts:')
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`   - ${status}: ${count}`)
})

// ============================================================================
// PARTIE 2: ANALYSE DES PROBLÈMES CONNUS (10 min)
// ============================================================================

console.log('\n\n📊 PARTIE 2/6: ANALYSE DES PROBLÈMES CONNUS')
console.log('─────────────────────────────────────────────────────────────────────\n')

// 2.1 Activations avec SMS reçu mais status != received
console.log('2.1 Activations avec SMS mais status incorrect:\n')

const { data: smsButNotReceived } = await supabase
  .from('activations')
  .select('id, order_id, status, sms_code, sms_received_at, charged, frozen_amount, created_at')
  .not('sms_code', 'is', null)
  .neq('status', 'received')
  .order('created_at', { ascending: false })
  .limit(20)

if (smsButNotReceived && smsButNotReceived.length > 0) {
  console.log(`⚠️  ${smsButNotReceived.length} activation(s) avec SMS mais status != received:\n`)
  smsButNotReceived.forEach(act => {
    const age = Math.round((Date.now() - new Date(act.created_at)) / 60000)
    console.log(`   - ${act.order_id}`)
    console.log(`     Status: ${act.status}, Code: ${act.sms_code}`)
    console.log(`     Charged: ${act.charged}, Frozen: ${act.frozen_amount}Ⓐ`)
    console.log(`     Age: ${age}min\n`)
  })
} else {
  console.log('✅ Aucune incohérence SMS/status détectée\n')
}

// 2.2 Activations received avec frozen_amount > 0
console.log('2.2 Activations received avec frozen_amount > 0:\n')

const { data: receivedButFrozen } = await supabase
  .from('activations')
  .select('id, order_id, status, charged, frozen_amount, price, user_id')
  .eq('status', 'received')
  .gt('frozen_amount', 0)
  .limit(20)

if (receivedButFrozen && receivedButFrozen.length > 0) {
  console.log(`❌ ${receivedButFrozen.length} activation(s) received mais frozen_amount > 0:\n`)
  let totalFrozenStuck = 0
  receivedButFrozen.forEach(act => {
    totalFrozenStuck += act.frozen_amount
    console.log(`   - ${act.order_id}: ${act.frozen_amount}Ⓐ gelé (charged: ${act.charged})`)
  })
  console.log(`\n   💰 TOTAL BLOQUÉ: ${totalFrozenStuck.toFixed(2)}Ⓐ\n`)
} else {
  console.log('✅ Aucune activation received avec frozen_amount > 0\n')
}

// 2.3 Transactions pending depuis > 20 minutes
console.log('2.3 Transactions pending anciennes:\n')

const { data: oldPendingTx } = await supabase
  .from('transactions')
  .select('id, type, amount, status, related_activation_id, created_at')
  .eq('status', 'pending')
  .lt('created_at', new Date(Date.now() - 1200000).toISOString())
  .order('created_at', { ascending: true })
  .limit(30)

if (oldPendingTx && oldPendingTx.length > 0) {
  console.log(`⚠️  ${oldPendingTx.length} transaction(s) pending depuis > 20min:\n`)
  let totalPendingAmount = 0
  
  for (const tx of oldPendingTx.slice(0, 10)) {
    const age = Math.round((Date.now() - new Date(tx.created_at)) / 60000)
    totalPendingAmount += Math.abs(tx.amount)
    
    if (tx.related_activation_id) {
      const { data: act } = await supabase
        .from('activations')
        .select('status, sms_code')
        .eq('id', tx.related_activation_id)
        .single()
      
      console.log(`   - ${tx.type}: ${tx.amount}Ⓐ (${age}min)`)
      console.log(`     Activation: ${act?.status || 'N/A'}, SMS: ${act?.sms_code ? 'OUI' : 'NON'}`)
    } else {
      console.log(`   - ${tx.type}: ${tx.amount}Ⓐ (${age}min) - PAS D'ACTIVATION`)
    }
  }
  
  if (oldPendingTx.length > 10) {
    console.log(`   ... et ${oldPendingTx.length - 10} autres`)
  }
  console.log(`\n   💰 TOTAL PENDING: ${totalPendingAmount.toFixed(2)}Ⓐ\n`)
} else {
  console.log('✅ Aucune transaction pending ancienne\n')
}

// ============================================================================
// PARTIE 3: COHÉRENCE FINANCIÈRE (10 min)
// ============================================================================

console.log('\n\n📊 PARTIE 3/6: COHÉRENCE FINANCIÈRE')
console.log('─────────────────────────────────────────────────────────────────────\n')

// 3.1 Balance vs Frozen vs Activations/Rentals
console.log('3.1 Cohérence Balance/Frozen:\n')

const { data: users } = await supabase
  .from('users')
  .select('id, email, balance, frozen_balance')

let totalBalance = 0
let totalFrozen = 0
let usersWithIssues = []

users.forEach(user => {
  totalBalance += parseFloat(user.balance)
  totalFrozen += parseFloat(user.frozen_balance)
  
  if (user.balance < 0 || user.frozen_balance < 0) {
    usersWithIssues.push({
      email: user.email,
      balance: user.balance,
      frozen: user.frozen_balance
    })
  }
})

console.log(`Total users balance: ${totalBalance.toFixed(2)}Ⓐ`)
console.log(`Total users frozen: ${totalFrozen.toFixed(2)}Ⓐ`)

const { data: allActivations } = await supabase
  .from('activations')
  .select('frozen_amount')

let totalFrozenActivations = 0
allActivations.forEach(a => {
  totalFrozenActivations += parseFloat(a.frozen_amount)
})

const { data: allRentals } = await supabase
  .from('rentals')
  .select('frozen_amount')

let totalFrozenRentals = 0
allRentals.forEach(r => {
  totalFrozenRentals += parseFloat(r.frozen_amount)
})

console.log(`Total activations frozen: ${totalFrozenActivations.toFixed(2)}Ⓐ`)
console.log(`Total rentals frozen: ${totalFrozenRentals.toFixed(2)}Ⓐ`)
console.log(`Total frozen (act+rent): ${(totalFrozenActivations + totalFrozenRentals).toFixed(2)}Ⓐ`)

const diff = Math.abs(totalFrozen - (totalFrozenActivations + totalFrozenRentals))
if (diff > 0.01) {
  console.log(`\n❌ INCOHÉRENCE FROZEN: ${diff.toFixed(2)}Ⓐ de différence!`)
  console.log(`   Users frozen: ${totalFrozen.toFixed(2)}Ⓐ`)
  console.log(`   Act+Rent frozen: ${(totalFrozenActivations + totalFrozenRentals).toFixed(2)}Ⓐ`)
} else {
  console.log('\n✅ Frozen cohérent entre users et activations/rentals')
}

if (usersWithIssues.length > 0) {
  console.log(`\n❌ ${usersWithIssues.length} utilisateur(s) avec balance négative:`)
  usersWithIssues.forEach(u => {
    console.log(`   - ${u.email}: balance=${u.balance}Ⓐ, frozen=${u.frozen}Ⓐ`)
  })
}

console.log('')

// 3.2 Balance Operations audit
console.log('3.2 Audit Balance Operations:\n')

const { data: recentOps } = await supabase
  .from('balance_operations')
  .select('*')
  .gte('created_at', new Date(Date.now() - 3600000).toISOString())
  .order('created_at', { ascending: false })

const opTypes = {}
let totalAmountMoved = 0

recentOps?.forEach(op => {
  opTypes[op.operation_type] = (opTypes[op.operation_type] || 0) + 1
  totalAmountMoved += Math.abs(parseFloat(op.amount))
})

console.log(`Opérations dernière heure: ${recentOps?.length || 0}`)
console.log('Types:')
Object.entries(opTypes).forEach(([type, count]) => {
  console.log(`   - ${type}: ${count}`)
})
console.log(`Montant total traité: ${totalAmountMoved.toFixed(2)}Ⓐ\n`)

// ============================================================================
// PARTIE 4: ANALYSE DES EDGE FUNCTIONS (5 min)
// ============================================================================

console.log('\n\n📊 PARTIE 4/6: EDGE FUNCTIONS & WEBHOOKS')
console.log('─────────────────────────────────────────────────────────────────────\n')

// 4.1 Tester manuellement le cron
console.log('4.1 Test manuel du cron:\n')

try {
  const cronResponse = await fetch(
    'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    }
  )
  
  const cronResult = await cronResponse.json()
  console.log('Résultat cron:', JSON.stringify(cronResult, null, 2))
  
  if (cronResult.success) {
    console.log('✅ Cron fonctionne')
    console.log(`   Activations vérifiées: ${cronResult.activations?.checked || 0}`)
    console.log(`   SMS trouvés: ${cronResult.activations?.found || 0}`)
    console.log(`   Erreurs: ${cronResult.activations?.errors?.length || 0}`)
  } else {
    console.log('❌ Cron a échoué')
  }
} catch (error) {
  console.log('❌ Erreur appel cron:', error.message)
}

console.log('')

// ============================================================================
// PARTIE 5: TEST EN CONDITIONS RÉELLES (5 min)
// ============================================================================

console.log('\n\n📊 PARTIE 5/6: TEST SYSTÈME EN CONDITIONS RÉELLES')
console.log('─────────────────────────────────────────────────────────────────────\n')

console.log('5.1 Test process_sms_received:\n')

// Prendre une activation pending récente
const { data: testActivation } = await supabase
  .from('activations')
  .select('*')
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (testActivation) {
  console.log(`Test sur activation: ${testActivation.order_id}`)
  console.log(`Status actuel: ${testActivation.status}`)
  console.log(`Frozen: ${testActivation.frozen_amount}Ⓐ\n`)
  
  console.log('Appel process_sms_received...')
  
  const { data: result, error: rpcError } = await supabase.rpc('process_sms_received', {
    p_order_id: testActivation.order_id,
    p_code: 'TEST999',
    p_text: 'Code test: TEST999',
    p_source: 'manual_test'
  })
  
  if (rpcError) {
    console.log('❌ ERREUR RPC:', rpcError.message)
    console.log('   Details:', rpcError.details)
    console.log('   Hint:', rpcError.hint)
  } else {
    console.log('✅ Résultat:', JSON.stringify(result, null, 2))
    
    if (!result.success) {
      console.log('\n⚠️  ÉCHEC TRAITEMENT SMS')
      console.log(`   Erreur: ${result.error}`)
      
      if (result.error?.includes('frozen_balance')) {
        console.log('\n❌ PROBLÈME CONFIRMÉ: Trigger prevent_direct_frozen_amount_update bloque!')
        console.log('   SOLUTION: Exécuter sql/fix_trigger_frozen_balance.sql')
      }
    }
  }
} else {
  console.log('Aucune activation pending pour le test')
}

console.log('')

// ============================================================================
// PARTIE 6: DIAGNOSTICS & RECOMMANDATIONS (5 min)
// ============================================================================

console.log('\n\n📊 PARTIE 6/6: DIAGNOSTICS & RECOMMANDATIONS')
console.log('─────────────────────────────────────────────────────────────────────\n')

const issues = []
const warnings = []
const fixes = []

// Vérifier trigger
const triggerCheck = await pgClient.query(`
  SELECT pg_get_functiondef(oid) as def
  FROM pg_proc
  WHERE proname = 'prevent_direct_frozen_amount_update'
`)

const hasTriggerFix = triggerCheck.rows[0]?.def?.includes('pg_trigger_depth()')

if (!hasTriggerFix) {
  issues.push({
    severity: 'CRITIQUE',
    problem: 'Trigger prevent_direct_frozen_amount_update bloque atomic_commit',
    impact: 'AUCUN SMS ne peut être traité correctement',
    solution: 'Exécuter sql/fix_trigger_frozen_balance.sql dans Supabase Dashboard'
  })
}

if (receivedButFrozen && receivedButFrozen.length > 0) {
  warnings.push({
    severity: 'MOYEN',
    problem: `${receivedButFrozen.length} activations received avec frozen_amount > 0`,
    impact: `${receivedButFrozen.reduce((sum, a) => sum + a.frozen_amount, 0).toFixed(2)}Ⓐ bloqué`,
    solution: 'Exécuter script de réconciliation pour libérer les fonds'
  })
}

if (oldPendingTx && oldPendingTx.length > 10) {
  warnings.push({
    severity: 'MOYEN',
    problem: `${oldPendingTx.length} transactions pending anciennes`,
    impact: 'Balance operations incomplètes',
    solution: 'Compléter ou annuler les transactions manuellement'
  })
}

if (smsButNotReceived && smsButNotReceived.length > 0) {
  warnings.push({
    severity: 'ÉLEVÉ',
    problem: `${smsButNotReceived.length} activations avec SMS mais status != received`,
    impact: 'Utilisateurs ne voient pas leurs SMS',
    solution: 'Corriger le status et charger les fonds'
  })
}

if (diff > 0.01) {
  issues.push({
    severity: 'ÉLEVÉ',
    problem: `Incohérence frozen: ${diff.toFixed(2)}Ⓐ de différence`,
    impact: 'Balance totale incorrecte',
    solution: 'Audit approfondi et réconciliation'
  })
}

console.log('🔴 PROBLÈMES CRITIQUES:\n')
if (issues.length === 0) {
  console.log('✅ Aucun problème critique détecté\n')
} else {
  issues.forEach((issue, idx) => {
    console.log(`${idx + 1}. [${issue.severity}] ${issue.problem}`)
    console.log(`   Impact: ${issue.impact}`)
    console.log(`   Solution: ${issue.solution}\n`)
  })
}

console.log('⚠️  AVERTISSEMENTS:\n')
if (warnings.length === 0) {
  console.log('✅ Aucun avertissement\n')
} else {
  warnings.forEach((warning, idx) => {
    console.log(`${idx + 1}. [${warning.severity}] ${warning.problem}`)
    console.log(`   Impact: ${warning.impact}`)
    console.log(`   Solution: ${warning.solution}\n`)
  })
}

console.log('\n═══════════════════════════════════════════════════════════════════════')
console.log('✅ RÉSUMÉ EXÉCUTIF')
console.log('═══════════════════════════════════════════════════════════════════════\n')

console.log(`🔴 Problèmes critiques: ${issues.length}`)
console.log(`⚠️  Avertissements: ${warnings.length}`)
console.log(`💰 Balance totale: ${totalBalance.toFixed(2)}Ⓐ`)
console.log(`❄️  Frozen total: ${totalFrozen.toFixed(2)}Ⓐ`)
console.log(`📱 Activations totales: ${allActivations.length}`)
console.log(`👥 Utilisateurs: ${users.length}`)

console.log('\n═══════════════════════════════════════════════════════════════════════')
console.log('Fin:', new Date().toLocaleString('fr-FR'))
console.log('═══════════════════════════════════════════════════════════════════════\n')

await pgClient.end()
process.exit(0)
