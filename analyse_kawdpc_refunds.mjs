#!/usr/bin/env node
/**
 * ANALYSE: Remboursements automatiques pour kawdpc@gmail.com
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('╔═══════════════════════════════════════════════════════════════════╗')
console.log('║  🔍 ANALYSE: Remboursements automatiques kawdpc@gmail.com       ║')
console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

async function main() {
  // 1. Trouver l'utilisateur
  const { data: user } = await sb
    .from('users')
    .select('*')
    .eq('email', 'kawdpc@gmail.com')
    .single()

  if (!user) {
    console.log('❌ Utilisateur non trouvé')
    return
  }

  console.log('👤 UTILISATEUR:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Balance: ${user.balance}Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

  // 2. Chercher les activations récentes
  const { data: activations } = await sb
    .from('activations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  console.log(`📱 ACTIVATIONS RÉCENTES: ${activations?.length || 0}\n`)

  const now = new Date()
  let expiredWithoutRefund = []

  for (const act of activations || []) {
    const expiresAt = new Date(act.expires_at)
    const isExpired = now > expiresAt
    const time = act.created_at.slice(11, 19)
    
    console.log(`[${time}] ${act.id.slice(0, 8)} | ${act.service_code} | ${act.status}`)
    console.log(`   Phone: ${act.phone}`)
    console.log(`   Price: ${act.price}Ⓐ | Frozen: ${act.frozen_amount}Ⓐ`)
    console.log(`   Expires: ${act.expires_at.slice(0, 19)} ${isExpired ? '⏰ EXPIRÉ' : '✅ Valide'}`)
    
    // Chercher les balance_operations
    const { data: freeze } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', act.id)
      .eq('operation_type', 'freeze')
      .single()
    
    const { data: refund } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', act.id)
      .eq('operation_type', 'refund')
      .single()
    
    if (freeze) {
      console.log(`   ✅ FREEZE: ${freeze.amount}Ⓐ (frozen: ${freeze.frozen_before}→${freeze.frozen_after})`)
    } else {
      console.log('   ⚠️  Pas de FREEZE trouvé')
    }
    
    if (refund) {
      console.log(`   ✅ REFUND: ${refund.amount}Ⓐ (frozen: ${refund.frozen_before}→${refund.frozen_after})`)
    } else {
      console.log('   ❌ PAS DE REFUND')
      
      if (isExpired && ['timeout', 'cancelled', 'expired'].includes(act.status) && act.frozen_amount === 0) {
        expiredWithoutRefund.push(act)
      }
    }
    
    console.log('')
  }

  // 3. Résumé
  console.log('═'.repeat(70))
  console.log('\n💡 DIAGNOSTIC:\n')

  if (expiredWithoutRefund.length > 0) {
    console.log(`❌ ${expiredWithoutRefund.length} activation(s) expirée(s) SANS refund:`)
    for (const act of expiredWithoutRefund) {
      console.log(`   - ${act.id.slice(0, 8)} | ${act.service_code} | ${act.status} | frozen_amount=${act.frozen_amount}`)
    }
    console.log('')
    console.log('🐛 PROBLÈME: Le cron ne fonctionne pas ou n\'a pas tourné')
    console.log('')
    console.log('📝 SOLUTIONS:')
    console.log('   1. Vérifier que le cron cron-check-pending-sms tourne')
    console.log('   2. Vérifier les logs du cron dans Supabase Dashboard')
    console.log('   3. Lancer manuellement le cleanup pour cet utilisateur')
  } else {
    console.log('✅ Toutes les activations expirées ont été remboursées')
  }

  // 4. Vérifier la cohérence frozen_balance
  const { data: freezeOps } = await sb
    .from('balance_operations')
    .select('*')
    .eq('user_id', user.id)
    .eq('operation_type', 'freeze')

  const { data: refundOps } = await sb
    .from('balance_operations')
    .select('*')
    .eq('user_id', user.id)
    .eq('operation_type', 'refund')

  const totalFrozen = (freezeOps || []).reduce((sum, op) => sum + parseFloat(op.amount), 0)
  const totalRefunded = (refundOps || []).reduce((sum, op) => sum + parseFloat(op.amount), 0)
  const expectedFrozen = totalFrozen - totalRefunded

  console.log('')
  console.log('🔢 COHÉRENCE FROZEN_BALANCE:')
  console.log(`   Total FREEZE ops: ${totalFrozen}Ⓐ (${freezeOps?.length || 0} ops)`)
  console.log(`   Total REFUND ops: ${totalRefunded}Ⓐ (${refundOps?.length || 0} ops)`)
  console.log(`   Frozen attendu: ${expectedFrozen}Ⓐ`)
  console.log(`   Frozen actuel: ${user.frozen_balance}Ⓐ`)
  console.log(`   Différence: ${user.frozen_balance - expectedFrozen}Ⓐ ${user.frozen_balance === expectedFrozen ? '✅' : '❌'}`)

  // 5. Chercher les rentals aussi
  const { data: rentals } = await sb
    .from('rentals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (rentals && rentals.length > 0) {
    console.log('')
    console.log(`🏠 RENTALS RÉCENTS: ${rentals.length}\n`)

    for (const rental of rentals) {
      const expiresAt = new Date(rental.expires_at || rental.end_date)
      const isExpired = now > expiresAt
      const time = rental.created_at.slice(11, 19)
      
      console.log(`[${time}] ${rental.id.slice(0, 8)} | ${rental.service_code} | ${rental.status}`)
      console.log(`   Phone: ${rental.phone}`)
      console.log(`   Price: ${rental.price}Ⓐ | Frozen: ${rental.frozen_amount}Ⓐ`)
      console.log(`   Expires: ${rental.expires_at?.slice(0, 19) || rental.end_date?.slice(0, 19)} ${isExpired ? '⏰ EXPIRÉ' : '✅ Valide'}`)
      
      // Chercher les balance_operations
      const { data: freeze } = await sb
        .from('balance_operations')
        .select('*')
        .eq('rental_id', rental.id)
        .eq('operation_type', 'freeze')
        .single()
      
      const { data: refund } = await sb
        .from('balance_operations')
        .select('*')
        .eq('rental_id', rental.id)
        .eq('operation_type', 'refund')
        .single()
      
      if (freeze) {
        console.log(`   ✅ FREEZE: ${freeze.amount}Ⓐ`)
      } else {
        console.log('   ⚠️  Pas de FREEZE trouvé')
      }
      
      if (refund) {
        console.log(`   ✅ REFUND: ${refund.amount}Ⓐ`)
      } else {
        console.log('   ❌ PAS DE REFUND')
      }
      
      console.log('')
    }
  }
}

main().catch(console.error)
