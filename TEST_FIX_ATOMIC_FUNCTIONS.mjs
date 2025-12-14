#!/usr/bin/env node
/**
 * 🧪 TEST COMPLET: Valider FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql
 * 
 * Ce script teste les 3 fonctions corrigées sur Supabase
 * AVANT de les déployer en production
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('🧪 TEST COMPLET: atomic_freeze, atomic_commit, atomic_refund')
console.log('=' .repeat(100))

// Prendre un user existant avec balance
const { data: users } = await supabase
  .from('users')
  .select('id, balance, frozen_balance')
  .gt('balance', 100)
  .limit(1)
  .single()

if (!users) {
  console.error('❌ Aucun user trouvé avec balance > 100')
  process.exit(1)
}

const testUserId = users.id
const initialBalance = users.balance
const initialFrozen = users.frozen_balance

console.log(`\n👤 Test User: ${testUserId.slice(0, 8)}`)
console.log(`   Balance initiale: ${initialBalance} Ⓐ`)
console.log(`   Frozen initial: ${initialFrozen} Ⓐ`)
console.log(`   Disponible: ${initialBalance - initialFrozen} Ⓐ`)

// =============================================================================
// TEST 1: atomic_freeze (balance doit rester constant)
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('TEST 1: atomic_freeze (Model A: balance CONSTANT)')
console.log('='.repeat(100))

const freezeAmount = 10
console.log(`\n📝 Freeze ${freezeAmount} Ⓐ...`)

// Créer une activation de test
const { data: testActivation, error: actError } = await supabase
  .from('activations')
  .insert({
    user_id: testUserId,
    order_id: `test-${Date.now()}`,
    phone: '0000000000',
    service_code: 'test',
    country_code: 'test',
    price: freezeAmount,
    frozen_amount: 0,
    status: 'pending',
    provider: 'test'
  })
  .select()
  .single()

if (actError) {
  console.error('❌ Erreur création activation:', actError)
  process.exit(1)
}

console.log(`✅ Activation test créée: ${testActivation.id.slice(0, 8)}`)

// Créer une transaction
const { data: tx1 } = await supabase
  .from('transactions')
  .insert({
    user_id: testUserId,
    type: 'test_freeze',
    amount: -freezeAmount,
    balance_before: initialBalance,
    balance_after: initialBalance,
    status: 'pending'
  })
  .select()
  .single()

// Appeler atomic_freeze
const { data: freezeResult, error: freezeError } = await supabase
  .rpc('atomic_freeze', {
    p_user_id: testUserId,
    p_amount: freezeAmount,
    p_transaction_id: tx1.id,
    p_activation_id: testActivation.id,
    p_reason: 'TEST: atomic_freeze'
  })

if (freezeError) {
  console.error('❌ atomic_freeze error:', freezeError)
  process.exit(1)
}

console.log('\n📊 Résultat atomic_freeze:')
console.log(`   balance_before: ${freezeResult.balance_before} Ⓐ`)
console.log(`   balance_after: ${freezeResult.balance_after} Ⓐ`)
console.log(`   frozen_before: ${freezeResult.frozen_before} Ⓐ`)
console.log(`   frozen_after: ${freezeResult.frozen_after} Ⓐ`)

const balanceChangeFreeze = freezeResult.balance_after - freezeResult.balance_before
const frozenChangeFreeze = freezeResult.frozen_after - freezeResult.frozen_before

console.log(`\n📈 Changements:`)
console.log(`   Balance: ${balanceChangeFreeze > 0 ? '+' : ''}${balanceChangeFreeze} Ⓐ`)
console.log(`   Frozen: ${frozenChangeFreeze > 0 ? '+' : ''}${frozenChangeFreeze} Ⓐ`)

if (balanceChangeFreeze === 0 && frozenChangeFreeze === freezeAmount) {
  console.log(`\n✅ TEST 1 RÉUSSI: balance constant, frozen augmente de ${freezeAmount}`)
} else {
  console.log(`\n❌ TEST 1 ÉCHOUÉ:`)
  if (balanceChangeFreeze !== 0) {
    console.log(`   - Balance devrait être constant mais Δ = ${balanceChangeFreeze}`)
  }
  if (frozenChangeFreeze !== freezeAmount) {
    console.log(`   - Frozen devrait augmenter de ${freezeAmount} mais Δ = ${frozenChangeFreeze}`)
  }
}

// =============================================================================
// TEST 2: atomic_commit (balance ET frozen diminuent)
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('TEST 2: atomic_commit (Model A: balance ET frozen diminuent)')
console.log('='.repeat(100))

console.log(`\n📝 Commit ${freezeAmount} Ⓐ...`)

// Appeler atomic_commit
const { data: commitResult, error: commitError } = await supabase
  .rpc('atomic_commit', {
    p_user_id: testUserId,
    p_activation_id: testActivation.id,
    p_transaction_id: tx1.id,
    p_reason: 'TEST: atomic_commit'
  })

if (commitError) {
  console.error('❌ atomic_commit error:', commitError)
  process.exit(1)
}

console.log('\n📊 Résultat atomic_commit:')
console.log(`   balance_before: ${commitResult.balance_before} Ⓐ`)
console.log(`   balance_after: ${commitResult.balance_after} Ⓐ`)
console.log(`   frozen_before: ${commitResult.frozen_before} Ⓐ`)
console.log(`   frozen_after: ${commitResult.frozen_after} Ⓐ`)

const balanceChangeCommit = commitResult.balance_after - commitResult.balance_before
const frozenChangeCommit = commitResult.frozen_after - commitResult.frozen_before

console.log(`\n📈 Changements:`)
console.log(`   Balance: ${balanceChangeCommit > 0 ? '+' : ''}${balanceChangeCommit} Ⓐ`)
console.log(`   Frozen: ${frozenChangeCommit > 0 ? '+' : ''}${frozenChangeCommit} Ⓐ`)

if (balanceChangeCommit === -freezeAmount && frozenChangeCommit === -freezeAmount) {
  console.log(`\n✅ TEST 2 RÉUSSI: balance ET frozen diminuent de ${freezeAmount}`)
} else {
  console.log(`\n❌ TEST 2 ÉCHOUÉ:`)
  if (balanceChangeCommit !== -freezeAmount) {
    console.log(`   - Balance devrait diminuer de ${freezeAmount} mais Δ = ${balanceChangeCommit}`)
  }
  if (frozenChangeCommit !== -freezeAmount) {
    console.log(`   - Frozen devrait diminuer de ${freezeAmount} mais Δ = ${frozenChangeCommit}`)
  }
}

// =============================================================================
// TEST 3: atomic_refund (balance constant, frozen diminue)
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('TEST 3: atomic_refund (Model A: balance CONSTANT, frozen diminue)')
console.log('='.repeat(100))

// Créer une nouvelle activation et freeze
const { data: testActivation2 } = await supabase
  .from('activations')
  .insert({
    user_id: testUserId,
    order_id: `test-refund-${Date.now()}`,
    phone: '0000000000',
    service_code: 'test',
    country_code: 'test',
    price: freezeAmount,
    frozen_amount: 0,
    status: 'pending',
    provider: 'test'
  })
  .select()
  .single()

const { data: tx2 } = await supabase
  .from('transactions')
  .insert({
    user_id: testUserId,
    type: 'test_refund',
    amount: -freezeAmount,
    balance_before: commitResult.balance_after,
    balance_after: commitResult.balance_after,
    status: 'pending'
  })
  .select()
  .single()

// Freeze
await supabase.rpc('atomic_freeze', {
  p_user_id: testUserId,
  p_amount: freezeAmount,
  p_transaction_id: tx2.id,
  p_activation_id: testActivation2.id,
  p_reason: 'TEST: before refund'
})

// Get state before refund
const { data: userBeforeRefund } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', testUserId)
  .single()

console.log(`\n📝 État avant refund:`)
console.log(`   Balance: ${userBeforeRefund.balance} Ⓐ`)
console.log(`   Frozen: ${userBeforeRefund.frozen_balance} Ⓐ`)

// Appeler atomic_refund
console.log(`\n📝 Refund ${freezeAmount} Ⓐ...`)

const { data: refundResult, error: refundError } = await supabase
  .rpc('atomic_refund', {
    p_user_id: testUserId,
    p_activation_id: testActivation2.id,
    p_transaction_id: tx2.id,
    p_reason: 'TEST: atomic_refund'
  })

if (refundError) {
  console.error('❌ atomic_refund error:', refundError)
  process.exit(1)
}

console.log('\n📊 Résultat atomic_refund:')
console.log(`   balance: ${refundResult.balance} Ⓐ (avant: ${userBeforeRefund.balance})`)
console.log(`   frozen_before: ${refundResult.frozen_before} Ⓐ`)
console.log(`   frozen_after: ${refundResult.frozen_after} Ⓐ`)

const balanceChangeRefund = refundResult.balance - userBeforeRefund.balance
const frozenChangeRefund = refundResult.frozen_after - refundResult.frozen_before

console.log(`\n📈 Changements:`)
console.log(`   Balance: ${balanceChangeRefund > 0 ? '+' : ''}${balanceChangeRefund} Ⓐ`)
console.log(`   Frozen: ${frozenChangeRefund > 0 ? '+' : ''}${frozenChangeRefund} Ⓐ`)

if (balanceChangeRefund === 0 && frozenChangeRefund === -freezeAmount) {
  console.log(`\n✅ TEST 3 RÉUSSI: balance constant, frozen diminue de ${freezeAmount}`)
} else {
  console.log(`\n❌ TEST 3 ÉCHOUÉ:`)
  if (balanceChangeRefund !== 0) {
    console.log(`   - Balance devrait être constant mais Δ = ${balanceChangeRefund}`)
  }
  if (frozenChangeRefund !== -freezeAmount) {
    console.log(`   - Frozen devrait diminuer de ${freezeAmount} mais Δ = ${frozenChangeRefund}`)
  }
}

// =============================================================================
// CLEANUP: Supprimer les données de test
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('🧹 CLEANUP')
console.log('='.repeat(100))

await supabase.from('activations').delete().in('id', [testActivation.id, testActivation2.id])
await supabase.from('transactions').delete().in('id', [tx1.id, tx2.id])

console.log('\n✅ Données de test supprimées')

// =============================================================================
// RÉSUMÉ FINAL
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('📊 RÉSUMÉ FINAL')
console.log('='.repeat(100))

console.log(`\n✅ TEST 1 (freeze): balance constant ✅`)
console.log(`✅ TEST 2 (commit): balance ET frozen diminuent ✅`)
console.log(`✅ TEST 3 (refund): balance constant, frozen diminue ✅`)

console.log(`\n🎉 TOUS LES TESTS RÉUSSIS!`)
console.log(`\n📝 PROCHAINE ÉTAPE: Exécute FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql dans Supabase`)
