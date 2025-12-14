#!/usr/bin/env node
/**
 * 🔬 DIAGNOSTIC COMPLET PROFOND
 * 
 * PROBLÈMES RAPPORTÉS:
 * 1. Activation échoue → frozen déduit même si pas son frozen (autre activation?)
 * 2. Rent expire → frozen libéré ET balance augmente (devrait juste libérer frozen)
 * 3. Problèmes généraux de libération frozen
 * 
 * ANALYSE:
 * - Tracer TOUT le flow: freeze → (success/fail) → commit/refund
 * - Vérifier Model A: balance CONSTANT, seul frozen change
 * - Identifier où balance est modifié incorrectement
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('🔬 DIAGNOSTIC COMPLET PROFOND - SYSTÈME FREEZE/REFUND/COMMIT')
console.log('=' .repeat(100))

// =============================================================================
// 1️⃣ AUDIT: Toutes les fonctions SQL qui touchent frozen_balance ou balance
// =============================================================================
console.log('\n1️⃣ AUDIT SQL: Fonctions qui modifient balance ou frozen_balance\n')

const sqlFunctions = [
  'secure_freeze_balance',
  'secure_unfreeze_balance', 
  'atomic_refund',
  'atomic_commit',
  'atomic_freeze',
  'atomic_refund_direct',
  'atomic_refund_rental'
]

console.log('📋 Fonctions à auditer:')
sqlFunctions.forEach(fn => console.log(`   - ${fn}()`))

console.log('\n⚠️  INSTRUCTION: Va dans Supabase SQL Editor et exécute:\n')
console.log('-- Voir définition de chaque fonction')
for (const fn of sqlFunctions) {
  console.log(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '${fn}';`)
}
console.log('')

// =============================================================================
// 2️⃣ SCÉNARIO 1: Activation échoue → frozen déduit incorrectement
// =============================================================================
console.log('2️⃣ SCÉNARIO 1: Activation échoue → frozen déduit même si pas son frozen\n')

// Chercher cas récents d'activation failed/timeout avec changement balance
const { data: failedActivations, error: failedError } = await supabase
  .from('activations')
  .select('id, user_id, status, price, frozen_amount, charged, created_at, expires_at')
  .in('status', ['failed', 'timeout', 'cancelled'])
  .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2h
  .order('created_at', { ascending: false })
  .limit(20)

if (failedError) {
  console.error('❌ Erreur:', failedError)
} else if (!failedActivations || failedActivations.length === 0) {
  console.log('✅ Aucune activation échouée dans les 2 dernières heures')
} else {
  console.log(`🔍 ${failedActivations.length} activations échouées trouvées\n`)
  
  for (const act of failedActivations) {
    console.log(`📋 Activation ${act.id.slice(0, 8)}`)
    console.log(`   User: ${act.user_id.slice(0, 8)}`)
    console.log(`   Status: ${act.status}`)
    console.log(`   Prix: ${act.price} Ⓐ`)
    console.log(`   frozen_amount: ${act.frozen_amount} Ⓐ`)
    console.log(`   charged: ${act.charged}`)
    console.log(`   Créée: ${new Date(act.created_at).toLocaleString('fr-FR')}`)
    
    // Chercher TOUTES les balance_operations pour cette activation
    const { data: ops } = await supabase
      .from('balance_operations')
      .select('id, operation_type, amount, balance_before, balance_after, created_at')
      .eq('activation_id', act.id)
      .order('created_at', { ascending: true })
    
    if (ops && ops.length > 0) {
      console.log(`   📊 Balance Operations:`)
      for (const op of ops) {
        const balanceChange = op.balance_after - op.balance_before
        console.log(`      ${op.operation_type}: ${op.amount}Ⓐ | balance ${op.balance_before} → ${op.balance_after} (Δ${balanceChange})`)
      }
      
      // 🚨 DÉTECTER PROBLÈME: Si refund ET balance change
      const refundOps = ops.filter(o => o.operation_type === 'refund')
      if (refundOps.length > 0) {
        for (const refund of refundOps) {
          if (refund.balance_after !== refund.balance_before) {
            console.log(`   🚨 PROBLÈME DÉTECTÉ: refund change balance ${refund.balance_before} → ${refund.balance_after}`)
            console.log(`      En Model A, refund doit SEULEMENT réduire frozen_balance, PAS balance!`)
          }
        }
      }
    } else {
      console.log(`   ⚠️  AUCUNE balance_operation trouvée`)
    }
    
    // Vérifier état actuel du user
    const { data: user } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', act.user_id)
      .single()
    
    if (user) {
      console.log(`   💰 User actuel: balance=${user.balance}Ⓐ, frozen=${user.frozen_balance}Ⓐ`)
    }
    
    console.log('')
  }
}

// =============================================================================
// 3️⃣ SCÉNARIO 2: Rent expire → balance augmente (incorrect)
// =============================================================================
console.log('3️⃣ SCÉNARIO 2: Rent expire → frozen libéré ET balance augmente\n')

const { data: expiredRentals, error: rentalsError } = await supabase
  .from('rentals')
  .select('id, user_id, status, price, frozen_amount, charged, created_at, expires_at')
  .in('status', ['expired', 'timeout', 'cancelled'])
  .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false })
  .limit(20)

if (rentalsError) {
  console.error('❌ Erreur:', rentalsError)
} else if (!expiredRentals || expiredRentals.length === 0) {
  console.log('✅ Aucun rental expiré dans les 2 dernières heures')
} else {
  console.log(`🔍 ${expiredRentals.length} rentals expirés trouvés\n`)
  
  for (const rent of expiredRentals) {
    console.log(`📋 Rental ${rent.id.slice(0, 8)}`)
    console.log(`   User: ${rent.user_id.slice(0, 8)}`)
    console.log(`   Status: ${rent.status}`)
    console.log(`   Prix: ${rent.price} Ⓐ`)
    console.log(`   frozen_amount: ${rent.frozen_amount} Ⓐ`)
    console.log(`   charged: ${rent.charged}`)
    
    // Chercher balance_operations
    const { data: ops } = await supabase
      .from('balance_operations')
      .select('id, operation_type, amount, balance_before, balance_after, created_at')
      .eq('rental_id', rent.id)
      .order('created_at', { ascending: true })
    
    if (ops && ops.length > 0) {
      console.log(`   📊 Balance Operations:`)
      for (const op of ops) {
        const balanceChange = op.balance_after - op.balance_before
        console.log(`      ${op.operation_type}: ${op.amount}Ⓐ | balance ${op.balance_before} → ${op.balance_after} (Δ${balanceChange})`)
        
        // 🚨 DÉTECTER: Si refund AUGMENTE balance
        if (op.operation_type === 'refund' && op.balance_after > op.balance_before) {
          console.log(`   🚨 PROBLÈME CRITIQUE: refund AUGMENTE balance de ${balanceChange}Ⓐ`)
          console.log(`      Model A: balance doit rester CONSTANT lors d'un refund!`)
          console.log(`      Seul frozen_balance doit diminuer`)
        }
      }
    } else {
      console.log(`   ⚠️  AUCUNE balance_operation`)
    }
    
    console.log('')
  }
}

// =============================================================================
// 4️⃣ AUDIT: Vérifier cohérence Model A sur échantillon
// =============================================================================
console.log('4️⃣ AUDIT: Vérifier cohérence Model A (balance constant)\n')

// Prendre 5 users avec activité récente
const { data: recentUsers, error: usersError } = await supabase
  .from('balance_operations')
  .select('user_id')
  .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false })
  .limit(50)

if (!usersError && recentUsers) {
  const uniqueUsers = [...new Set(recentUsers.map(u => u.user_id))].slice(0, 5)
  
  console.log(`📊 Analyse de ${uniqueUsers.length} users avec activité récente\n`)
  
  for (const userId of uniqueUsers) {
    console.log(`👤 User ${userId.slice(0, 8)}`)
    
    // Toutes les opérations de ce user
    const { data: userOps } = await supabase
      .from('balance_operations')
      .select('id, operation_type, amount, balance_before, balance_after, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (userOps && userOps.length > 0) {
      console.log(`   📋 ${userOps.length} opérations récentes:`)
      
      const violations = []
      
      for (const op of userOps) {
        const balanceChange = op.balance_after - op.balance_before
        const symbol = balanceChange > 0 ? '+' : ''
        console.log(`      ${op.operation_type.padEnd(10)} | ${symbol}${balanceChange}Ⓐ | ${op.balance_before} → ${op.balance_after}`)
        
        // RÈGLES MODEL A:
        // - freeze: balance CONSTANT (Δ = 0)
        // - refund: balance CONSTANT (Δ = 0)
        // - commit: balance DIMINUE (Δ < 0)
        // - charge: balance DIMINUE (Δ < 0)
        // - deposit: balance AUGMENTE (Δ > 0)
        
        if (op.operation_type === 'freeze' && balanceChange !== 0) {
          violations.push(`freeze change balance (Δ${balanceChange})`)
        }
        if (op.operation_type === 'refund' && balanceChange !== 0) {
          violations.push(`refund change balance (Δ${balanceChange})`)
        }
        if (op.operation_type === 'commit' && balanceChange >= 0) {
          violations.push(`commit ne diminue pas balance (Δ${balanceChange})`)
        }
      }
      
      if (violations.length > 0) {
        console.log(`   🚨 VIOLATIONS MODEL A:`)
        violations.forEach(v => console.log(`      - ${v}`))
      } else {
        console.log(`   ✅ Toutes opérations respectent Model A`)
      }
    }
    
    console.log('')
  }
}

// =============================================================================
// 5️⃣ RÉSUMÉ ET DIAGNOSTIC
// =============================================================================
console.log('\n' + '='.repeat(100))
console.log('📊 RÉSUMÉ DU DIAGNOSTIC\n')

console.log('🔍 PROBLÈMES À VÉRIFIER DANS LE CODE SQL:\n')
console.log('1️⃣ atomic_refund():')
console.log('   ❓ Est-ce qu\'il fait: UPDATE users SET balance = balance + amount?')
console.log('   ✅ Devrait faire: UPDATE users SET frozen_balance = frozen_balance - amount')
console.log('   ✅ balance doit rester CONSTANT\n')

console.log('2️⃣ atomic_refund_rental():')
console.log('   ❓ Même vérification: balance doit rester constant\n')

console.log('3️⃣ secure_unfreeze_balance():')
console.log('   ❓ Est-ce utilisé? Si oui, vérifie qu\'il ne touche pas balance\n')

console.log('4️⃣ atomic_refund_direct():')
console.log('   ❓ Version "direct" sans activation_id, doit aussi respecter Model A\n')

console.log('5️⃣ Triggers ou autres fonctions:')
console.log('   ❓ Y a-t-il des triggers qui modifient automatiquement balance?\n')

console.log('=' .repeat(100))
console.log('\n📝 PROCHAINES ÉTAPES:\n')
console.log('1. Exécute les SELECT pg_get_functiondef() pour voir le code SQL')
console.log('2. Cherche TOUS les endroits où balance est modifié (pas frozen_balance)')
console.log('3. Vérifie que SEULS deposit/commit/charge modifient balance')
console.log('4. Vérifie que freeze/refund ne touchent QUE frozen_balance')
console.log('')
