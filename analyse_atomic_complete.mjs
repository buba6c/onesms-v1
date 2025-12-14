#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 ANALYSE DEEP: ATOMIC FUNCTIONS & COMMIT/REFUND SYSTEM\n')
console.log('='= 70 + '\n')

// 1. Vérifier les fonctions SQL déployées
console.log('📋 1. FONCTIONS SQL DÉPLOYÉES\n')
const { data: users } = await supabase.from('users').select('id,email,balance,frozen_balance').limit(3)
console.log('✅ Connexion DB OK')
console.log('Users sample:', users?.map(u => ({email: u.email, bal: u.balance, froz: u.frozen_balance})))

// 2. Tester atomic_freeze
console.log('\n📋 2. TEST atomic_freeze (sans exécuter)\n')
const testUserId = users?.[0]?.id
if (testUserId) {
  const { error } = await supabase.rpc('atomic_freeze', {
    p_user_id: testUserId,
    p_amount: 0,
    p_activation_id: null,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: 'dry-run test'
  })
  console.log('atomic_freeze:', error ? `❌ ${error.message}` : '✅ EXISTS')
} else {
  console.log('⚠️ No user to test')
}

// 3. Analyser balance_operations récentes
console.log('\n📋 3. BALANCE_OPERATIONS (20 dernières)\n')
const { data: ops } = await supabase
  .from('balance_operations')
  .select('operation_type,amount,balance_before,balance_after,frozen_before,frozen_after,reason,created_at')
  .order('created_at', { ascending: false })
  .limit(20)

const grouped = ops?.reduce((acc, op) => {
  acc[op.operation_type] = (acc[op.operation_type] || 0) + 1
  return acc
}, {})

console.log('Operations par type:', grouped)
console.log('\nDernières 5:')
ops?.slice(0, 5).forEach(op => {
  console.log(`  ${op.operation_type}: ${op.amount}Ⓐ | bal ${op.balance_before}→${op.balance_after} | froz ${op.frozen_before}→${op.frozen_after}`)
  console.log(`    Reason: ${op.reason}`)
})

// 4. Analyser activations avec frozen_amount
console.log('\n📋 4. ACTIVATIONS AVEC FROZEN_AMOUNT > 0\n')
const { data: frozenAct, count: frozenCount } = await supabase
  .from('activations')
  .select('id,status,frozen_amount,charged,price,created_at', { count: 'exact' })
  .gt('frozen_amount', 0)
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`Total activations avec frozen > 0: ${frozenCount}`)
if (frozenAct && frozenAct.length > 0) {
  console.log('\nTop 10:')
  frozenAct.forEach(a => {
    console.log(`  ${a.id.slice(0,8)}... | status:${a.status} charged:${a.charged} frozen:${a.frozen_amount}Ⓐ price:${a.price}Ⓐ`)
  })
} else {
  console.log('✅ Aucune activation avec frozen_amount > 0')
}

// 5. Analyser rentals avec frozen_amount
console.log('\n📋 5. RENTALS AVEC FROZEN_AMOUNT > 0\n')
const { data: frozenRent, count: frozenRentCount } = await supabase
  .from('rentals')
  .select('id,status,frozen_amount,price,created_at', { count: 'exact' })
  .gt('frozen_amount', 0)
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`Total rentals avec frozen > 0: ${frozenRentCount}`)
if (frozenRent && frozenRent.length > 0) {
  console.log('\nTop 10:')
  frozenRent.forEach(r => {
    console.log(`  ${r.id.slice(0,8)}... | status:${r.status} frozen:${r.frozen_amount}Ⓐ price:${r.price}Ⓐ`)
  })
} else {
  console.log('✅ Aucun rental avec frozen_amount > 0')
}

// 6. Vérifier cohérence frozen_balance
console.log('\n📋 6. VÉRIFICATION COHÉRENCE FROZEN_BALANCE\n')
const { data: usersFull } = await supabase
  .from('users')
  .select('id,email,balance,frozen_balance')
  .gt('frozen_balance', 0)

if (usersFull && usersFull.length > 0) {
  console.log(`${usersFull.length} users avec frozen_balance > 0:\n`)
  for (const user of usersFull) {
    // Calculer le frozen attendu
    const { data: actFrozen } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', user.id)
      .gt('frozen_amount', 0)
    
    const { data: rentFrozen } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', user.id)
      .gt('frozen_amount', 0)
    
    const expectedFrozen = (
      (actFrozen || []).reduce((sum, a) => sum + (a.frozen_amount || 0), 0) +
      (rentFrozen || []).reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
    )
    
    const diff = user.frozen_balance - expectedFrozen
    const status = Math.abs(diff) < 0.01 ? '✅' : '❌'
    console.log(`  ${status} ${user.email}: frozen=${user.frozen_balance}Ⓐ expected=${expectedFrozen.toFixed(2)}Ⓐ diff=${diff.toFixed(2)}Ⓐ`)
  }
} else {
  console.log('✅ Aucun user avec frozen_balance > 0')
}

// 7. Analyser transactions pending/failed
console.log('\n📋 7. TRANSACTIONS PENDING/FAILED\n')
const { data: pendingTx, count: pendingCount } = await supabase
  .from('transactions')
  .select('type,status,amount,created_at', { count: 'exact' })
  .in('status', ['pending', 'failed'])
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`Total transactions pending/failed: ${pendingCount}`)
if (pendingTx && pendingTx.length > 0) {
  pendingTx.forEach(tx => {
    console.log(`  ${tx.type} | ${tx.status} | ${tx.amount}Ⓐ | ${tx.created_at}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('✅ ANALYSE TERMINÉE')
