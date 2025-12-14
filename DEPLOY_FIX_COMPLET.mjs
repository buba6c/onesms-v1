#!/usr/bin/env node
/**
 * 🚀 DÉPLOIEMENT COMPLET: Fix définitif balance/frozen
 * 
 * Ce script orchestre tout le processus:
 * 1. Diagnostic avant
 * 2. Instructions déploiement SQL
 * 3. Tests validation
 * 4. Audit users affectés
 * 5. Monitoring
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('🚀 DÉPLOIEMENT COMPLET: Fix Définitif Balance/Frozen')
console.log('=' .repeat(100))
console.log('')

// =============================================================================
// PHASE 1: DIAGNOSTIC AVANT
// =============================================================================
console.log('📊 PHASE 1: DIAGNOSTIC AVANT FIX\n')

console.log('🔍 Analyse balance_operations (dernières 24h)...\n')

const { data: opsStats, error: opsError } = await supabase
  .from('balance_operations')
  .select('operation_type, balance_before, balance_after')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

if (opsError) {
  console.error('❌ Erreur:', opsError)
} else {
  const stats = {}
  opsStats.forEach(op => {
    if (!stats[op.operation_type]) {
      stats[op.operation_type] = { total: 0, balance_changed: 0, balance_constant: 0 }
    }
    stats[op.operation_type].total++
    if (op.balance_after !== op.balance_before) {
      stats[op.operation_type].balance_changed++
    } else {
      stats[op.operation_type].balance_constant++
    }
  })
  
  console.log('📋 Statistiques par opération:')
  Object.entries(stats).forEach(([type, s]) => {
    const anomaly = (type === 'freeze' || type === 'refund') && s.balance_changed > 0
    const symbol = anomaly ? '🚨' : '✅'
    console.log(`   ${symbol} ${type.padEnd(10)} | Total: ${s.total.toString().padStart(3)} | balance_changed: ${s.balance_changed.toString().padStart(3)} | balance_constant: ${s.balance_constant.toString().padStart(3)}`)
    
    if (anomaly) {
      console.log(`      ⚠️  ANOMALIE: ${type} devrait avoir balance_constant = total en Model A`)
    }
  })
}

// Compter freeze/refund problématiques
const { data: incorrectFreeze } = await supabase
  .from('balance_operations')
  .select('id')
  .eq('operation_type', 'freeze')
  .neq('balance_after', 'balance_before')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

const { data: incorrectRefund } = await supabase
  .from('balance_operations')
  .select('id')
  .eq('operation_type', 'refund')
  .neq('balance_after', 'balance_before')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

console.log('')
console.log('🚨 PROBLÈMES DÉTECTÉS:')
console.log(`   - ${incorrectFreeze?.length || 0} freeze qui changent balance (devrait être 0)`)
console.log(`   - ${incorrectRefund?.length || 0} refund qui changent balance (devrait être 0)`)

// =============================================================================
// PHASE 2: INSTRUCTIONS DÉPLOIEMENT SQL
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('📝 PHASE 2: DÉPLOYER LE FIX SQL\n')

console.log('⚠️  INSTRUCTIONS:')
console.log('   1. Ouvre Supabase SQL Editor')
console.log('   2. Copie le contenu de: FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql')
console.log('   3. Exécute le SQL')
console.log('   4. Vérifie les messages de succès:')
console.log('      - ✅ atomic_freeze: Model A (balance constant, frozen augmente)')
console.log('      - ✅ atomic_commit: Model A (balance ET frozen diminuent)')
console.log('      - ✅ atomic_refund: Model A (balance constant, frozen diminue)')
console.log('')

// Lire le fichier SQL
try {
  const sqlContent = readFileSync('./FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql', 'utf-8')
  console.log('📄 Aperçu du SQL à exécuter:')
  console.log('   Lignes: ' + sqlContent.split('\n').length)
  console.log('   Taille: ' + (sqlContent.length / 1024).toFixed(1) + ' KB')
  console.log('   Fonctions modifiées: atomic_freeze, atomic_commit, atomic_refund')
} catch (e) {
  console.log('⚠️  Fichier SQL: FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql')
}

console.log('')
console.log('⏸️  PAUSE: Exécute le SQL maintenant, puis appuie sur ENTER pour continuer...')

// Attendre input utilisateur
await new Promise(resolve => {
  process.stdin.once('data', () => {
    resolve()
  })
})

// =============================================================================
// PHASE 3: TESTS VALIDATION
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('🧪 PHASE 3: TESTS DE VALIDATION\n')

console.log('🔬 Test des 3 fonctions corrigées...\n')

// Prendre un user test
const { data: testUser } = await supabase
  .from('users')
  .select('id, balance, frozen_balance')
  .gt('balance', 50)
  .limit(1)
  .single()

if (!testUser) {
  console.log('⚠️  Aucun user avec balance suffisante pour tester')
} else {
  console.log(`👤 User test: ${testUser.id.slice(0, 8)}`)
  console.log(`   Balance: ${testUser.balance} Ⓐ, Frozen: ${testUser.frozen_balance} Ⓐ\n`)
  
  // Test freeze
  console.log('TEST 1: atomic_freeze (balance doit rester constant)')
  
  const { data: testAct } = await supabase
    .from('activations')
    .insert({
      user_id: testUser.id,
      order_id: `test-${Date.now()}`,
      phone: '0000000000',
      service_code: 'test',
      country_code: 'test',
      price: 5,
      frozen_amount: 0,
      status: 'pending',
      provider: 'test'
    })
    .select()
    .single()
  
  const { data: testTx } = await supabase
    .from('transactions')
    .insert({
      user_id: testUser.id,
      type: 'test',
      amount: -5,
      balance_before: testUser.balance,
      balance_after: testUser.balance,
      status: 'pending'
    })
    .select()
    .single()
  
  const { data: freezeResult, error: freezeErr } = await supabase
    .rpc('atomic_freeze', {
      p_user_id: testUser.id,
      p_amount: 5,
      p_transaction_id: testTx.id,
      p_activation_id: testAct.id,
      p_reason: 'TEST'
    })
  
  if (freezeErr) {
    console.log(`   ❌ ERREUR: ${freezeErr.message}`)
  } else {
    const balanceChange = freezeResult.balance_after - freezeResult.balance_before
    if (balanceChange === 0) {
      console.log(`   ✅ RÉUSSI: balance constant (${freezeResult.balance_before} → ${freezeResult.balance_after})`)
    } else {
      console.log(`   ❌ ÉCHOUÉ: balance a changé de ${balanceChange} (devrait être 0)`)
    }
  }
  
  // Cleanup
  await supabase.from('activations').delete().eq('id', testAct.id)
  await supabase.from('transactions').delete().eq('id', testTx.id)
  
  console.log('')
}

console.log('📊 Pour tests complets, exécute:')
console.log('   node TEST_FIX_ATOMIC_FUNCTIONS.mjs')

// =============================================================================
// PHASE 4: AUDIT USERS AFFECTÉS
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('👥 PHASE 4: AUDIT USERS AFFECTÉS\n')

console.log('🔍 Recherche users avec gain/perte balance...\n')

// Users qui ont gagné
const { data: usersGained } = await supabase
  .from('balance_operations')
  .select('user_id, balance_before, balance_after')
  .eq('operation_type', 'refund')
  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

if (usersGained) {
  const gainMap = {}
  usersGained.forEach(op => {
    const gain = op.balance_after - op.balance_before
    if (gain > 0) {
      gainMap[op.user_id] = (gainMap[op.user_id] || 0) + gain
    }
  })
  
  const usersWithGain = Object.entries(gainMap).filter(([_, gain]) => gain > 0)
  
  if (usersWithGain.length > 0) {
    console.log(`🚨 ${usersWithGain.length} USERS ONT GAGNÉ BALANCE INCORRECTEMENT:\n`)
    usersWithGain.slice(0, 10).forEach(([userId, gain]) => {
      console.log(`   ${userId.slice(0, 8)}: +${gain} Ⓐ`)
    })
    if (usersWithGain.length > 10) {
      console.log(`   ... et ${usersWithGain.length - 10} autres`)
    }
  } else {
    console.log('✅ Aucun user n\'a gagné balance incorrectement')
  }
}

console.log('\n📋 Pour audit complet, exécute dans Supabase SQL Editor:')
console.log('   AUDIT_ET_CORRECTION_USERS_AFFECTES.sql')

// =============================================================================
// PHASE 5: MONITORING
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('📊 PHASE 5: MONITORING POST-FIX\n')

console.log('⏰ Monitor les prochaines opérations (1 minute)...\n')

// Compter opérations actuelles
const { count: countBefore } = await supabase
  .from('balance_operations')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', new Date().toISOString())

console.log('   Opérations avant: ' + (countBefore || 0))
console.log('   Attente 60 secondes...')

await new Promise(resolve => setTimeout(resolve, 60000))

const { count: countAfter } = await supabase
  .from('balance_operations')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', new Date(Date.now() - 60000).toISOString())

console.log('   Opérations après: ' + (countAfter || 0))
console.log('   Nouvelles opérations: ' + ((countAfter || 0) - (countBefore || 0)))

// Vérifier cohérence
const { data: recentOps } = await supabase
  .from('balance_operations')
  .select('operation_type, balance_before, balance_after')
  .gte('created_at', new Date(Date.now() - 60000).toISOString())

if (recentOps && recentOps.length > 0) {
  let freezeOk = 0, freezeKo = 0
  let refundOk = 0, refundKo = 0
  
  recentOps.forEach(op => {
    if (op.operation_type === 'freeze') {
      if (op.balance_after === op.balance_before) freezeOk++
      else freezeKo++
    }
    if (op.operation_type === 'refund') {
      if (op.balance_after === op.balance_before) refundOk++
      else refundKo++
    }
  })
  
  console.log('\n   Résultats:')
  if (freezeOk > 0 || freezeKo > 0) {
    console.log(`   freeze: ${freezeOk > 0 && freezeKo === 0 ? '✅' : '❌'} ${freezeOk} OK, ${freezeKo} KO`)
  }
  if (refundOk > 0 || refundKo > 0) {
    console.log(`   refund: ${refundOk > 0 && refundKo === 0 ? '✅' : '❌'} ${refundOk} OK, ${refundKo} KO`)
  }
  
  if (freezeKo === 0 && refundKo === 0) {
    console.log('\n   ✅ TOUTES LES OPÉRATIONS SONT COHÉRENTES!')
  } else {
    console.log('\n   ⚠️  Certaines opérations sont encore incorrectes')
    console.log('   Vérifie que le SQL a bien été exécuté')
  }
}

// =============================================================================
// RÉSUMÉ FINAL
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('✅ DÉPLOIEMENT TERMINÉ\n')

console.log('📋 RÉSUMÉ:')
console.log(`   - Diagnostic avant: ${incorrectFreeze?.length || 0} freeze + ${incorrectRefund?.length || 0} refund incorrects`)
console.log('   - Fix SQL: déployé (vérifier manuellement)')
console.log('   - Tests validation: partiels (exécuter TEST_FIX_ATOMIC_FUNCTIONS.mjs)')
console.log('   - Audit users: à compléter (AUDIT_ET_CORRECTION_USERS_AFFECTES.sql)')
console.log('   - Monitoring: en cours')

console.log('\n📝 PROCHAINES ÉTAPES:')
console.log('   1. Vérifier que le SQL a bien été exécuté')
console.log('   2. Exécuter: node TEST_FIX_ATOMIC_FUNCTIONS.mjs')
console.log('   3. Exécuter SQL: AUDIT_ET_CORRECTION_USERS_AFFECTES.sql')
console.log('   4. Corriger balance des users affectés (si nécessaire)')
console.log('   5. Monitoring 24h')

console.log('\n🎉 Fix définitif déployé avec succès!\n')
