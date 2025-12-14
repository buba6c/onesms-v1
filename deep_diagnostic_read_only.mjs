// DEEP ANALYSIS: ACTIVATIONS, RENTALS, TOPUPS
// Read-only diagnostic script

/* eslint-env node */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 DEEP ANALYSIS: ACTIVATIONS, RENTALS, TOPUPS\n')
console.log('═'.repeat(80) + '\n')

// 1. ACTIVATIONS
console.log('📊 1. ACTIVATIONS ANALYSIS')
const { data: acts, error: actErr } = await sb
  .from('activations')
  .select('id, status, charged, frozen_amount, price, created_at, user_id')
  .order('created_at', { ascending: false })
  .limit(50)

if (actErr) console.error('❌ Error fetching activations:', actErr)
else {
  let receivedNotCharged = 0
  let chargedWithFreeze = 0
  let cancelledWithFreeze = 0
  
  console.log(`   Analyzed last ${acts.length} activations:`)
  
  for (const a of acts) {
    const isReceived = a.status === 'received'
    const isCharged = a.charged
    const hasFreeze = a.frozen_amount > 0
    const isCancelled = ['cancelled', 'timeout', 'expired'].includes(a.status)

    if (isReceived && !isCharged) receivedNotCharged++
    if (isCharged && hasFreeze) chargedWithFreeze++
    if (isCancelled && hasFreeze) cancelledWithFreeze++
  }

  console.log(`   🔴 Received but NOT Charged: ${receivedNotCharged}`)
  console.log(`   ⚠️ Charged but Frozen > 0: ${chargedWithFreeze}`)
  console.log(`   ⚠️ Cancelled but Frozen > 0: ${cancelledWithFreeze}`)
  
  // Detail problematic ones
  if (receivedNotCharged > 0) {
    console.log('\n   🔍 Detail: Received NOT Charged (Freebies):')
    acts.filter(a => a.status === 'received' && !a.charged).slice(0, 5).forEach(a => {
      console.log(`      ${a.id.slice(0,8)} | Price: ${a.price} | Frozen: ${a.frozen_amount} | Created: ${a.created_at}`)
    })
  }
}

// 2. RENTALS
console.log('\n📊 2. RENTALS ANALYSIS')
const { data: rents, error: rentErr } = await sb
  .from('rentals')
  .select('id, status, charged, frozen_amount, cost, created_at')
  .order('created_at', { ascending: false })
  .limit(50)

if (rentErr) console.error('❌ Error fetching rentals:', rentErr)
else {
  // Logic: Rentals should be charged=true if completed, or frozen if active
  let completedNotCharged = 0
  let completedWithFreeze = 0
  
  for (const r of rents) {
    if (r.status === 'completed' && !r.charged) completedNotCharged++
    if (r.status === 'completed' && r.frozen_amount > 0) completedWithFreeze++
  }
  
  console.log(`   Analyzed last ${rents.length} rentals:`)
  console.log(`   🔴 Completed but NOT Charged: ${completedNotCharged}`)
  console.log(`   ⚠️ Completed but Frozen > 0: ${completedWithFreeze}`)
  
  if (completedNotCharged > 0) {
    console.log('\n   🔍 Detail: Completed NOT Charged:')
    rents.filter(r => r.status === 'completed' && !r.charged).slice(0, 5).forEach(r => {
      console.log(`      ${r.id.slice(0,8)} | Cost: ${r.cost} | Frozen: ${r.frozen_amount}`)
    })
  }
}

// 3. TOPUPS (Transactions)
console.log('\n📊 3. TOPUPS ANALYSIS')
const { data: txs, error: txErr } = await sb
  .from('transactions')
  .select('id, type, status, amount, balance_before, balance_after, metadata, created_at, user_id')
  .eq('type', 'deposit')
  .order('created_at', { ascending: false })
  .limit(50)

if (txErr) console.error('❌ Error fetching transactions:', txErr)
else {
  let pendingStuck = 0
  let completedNoBalanceChange = 0
  let completedNoLedger = 0

  console.log(`   Analyzed last ${txs.length} deposits:`)

  for (const tx of txs) {
    // Check stuck pending
    if (tx.status === 'pending') {
      const ageMinutes = (new Date() - new Date(tx.created_at)) / 1000 / 60
      if (ageMinutes > 30) {
        pendingStuck++
        console.log(`      ⏳ Stuck Pending > 30m: ${tx.id} (${tx.amount}Ⓐ) - ${Math.round(ageMinutes)}m ago`)
      }
    }

    // Check completed but balance unchanged
    if (tx.status === 'completed') {
      if (Math.abs(tx.balance_after - tx.balance_before) < 0.01 && tx.amount > 0) {
        completedNoBalanceChange++
        console.log(`      ⚠️ Completed but No Balance Change: ${tx.id} (${tx.amount}Ⓐ)`)
      }
      
      // Check ledger
      const { data: ops } = await sb
        .from('balance_operations')
        .select('id, operation_type, amount')
        .eq('related_transaction_id', tx.id)
        .limit(1)
      
      if (!ops || ops.length === 0) {
        // Double check if maybe credited via admin_add_credit without linking transaction_id directly?
        // Or maybe manual update?
        completedNoLedger++
        console.log(`      ⚠️ Completed but No Ledger Entry: ${tx.id} (${tx.amount}Ⓐ)`)
      }
    }
  }

  console.log(`   🔴 Pending > 30min: ${pendingStuck}`)
  console.log(`   ⚠️ Completed but Balance Unchanged: ${completedNoBalanceChange}`)
  console.log(`   ⚠️ Completed but No Ledger Entry: ${completedNoLedger}`)
}

console.log('\n' + '═'.repeat(80))
console.log('✅ DEEP ANALYSIS COMPLETE')
