#!/usr/bin/env node
/**
 * 🔍 ANALYSE PROFONDE: Problème de libération frozen_amount sur échec
 * 
 * SYMPTÔME:
 * - Activation échoue (ex: API error, timeout, cancel)
 * - frozen_amount est libéré MAIS balance ne remonte pas
 * - User perd des Ⓐ même si l'activation a échoué
 * 
 * ANALYSE:
 * - Chercher tous les points où frozen_amount peut être libéré
 * - Vérifier si atomic_refund est toujours appelé
 * - Identifier les cas où libération échoue silencieusement
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_KEY')
  console.error('Available env:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('🔍 ANALYSE DES POINTS DE LIBÉRATION FROZEN_AMOUNT\n')
console.log('=' .repeat(80))

// 1️⃣ CHERCHER ACTIVATIONS AVEC frozen_amount=0 MAIS status=échoué/timeout
console.log('\n1️⃣ ACTIVATIONS ÉCHOUÉES AVEC frozen_amount=0 (SUSPECTS)\n')

const { data: suspectActivations, error: suspectError } = await supabase
  .from('activations')
  .select('id, order_id, user_id, status, price, frozen_amount, charged, created_at, expires_at')
  .in('status', ['timeout', 'failed', 'cancelled'])
  .eq('frozen_amount', 0)
  .eq('charged', false)
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Dernières 24h
  .order('created_at', { ascending: false })
  .limit(20)

if (suspectError) {
  console.error('❌ Erreur:', suspectError)
} else if (!suspectActivations || suspectActivations.length === 0) {
  console.log('✅ Aucune activation suspecte trouvée (frozen_amount=0, status=échoué, charged=false)')
} else {
  console.log(`🚨 ${suspectActivations.length} ACTIVATIONS SUSPECTES TROUVÉES:\n`)
  
  for (const act of suspectActivations) {
    console.log(`📋 Activation ${act.id.slice(0, 8)}`)
    console.log(`   Status: ${act.status}`)
    console.log(`   Prix: ${act.price} Ⓐ`)
    console.log(`   frozen_amount: ${act.frozen_amount} Ⓐ`)
    console.log(`   charged: ${act.charged}`)
    console.log(`   Créée: ${new Date(act.created_at).toLocaleString('fr-FR')}`)
    
    // Vérifier si refund existe
    const { data: refundOps } = await supabase
      .from('balance_operations')
      .select('id, operation_type, amount, created_at')
      .eq('activation_id', act.id)
      .eq('operation_type', 'refund')
      .order('created_at', { ascending: false })
    
    if (refundOps && refundOps.length > 0) {
      console.log(`   ✅ Refund trouvé: ${refundOps[0].amount} Ⓐ (${new Date(refundOps[0].created_at).toLocaleString('fr-FR')})`)
    } else {
      console.log(`   ❌ AUCUN REFUND TROUVÉ - PERTE DE ${act.price} Ⓐ`)
    }
    
    console.log('')
  }
}

// 2️⃣ ANALYSER LES BALANCE_OPERATIONS ORPHELINES
console.log('\n2️⃣ FREEZE SANS REFUND/COMMIT CORRESPONDANT\n')

const { data: freezeOps, error: freezeError } = await supabase
  .from('balance_operations')
  .select('id, user_id, activation_id, amount, operation_type, created_at')
  .eq('operation_type', 'freeze')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false })
  .limit(30)

if (freezeError) {
  console.error('❌ Erreur freeze ops:', freezeError)
} else if (freezeOps && freezeOps.length > 0) {
  console.log(`📦 ${freezeOps.length} FREEZE trouvées (dernières 24h)\n`)
  
  let orphanCount = 0
  
  for (const freeze of freezeOps) {
    // Chercher refund/commit correspondant
    const { data: counterOps } = await supabase
      .from('balance_operations')
      .select('id, operation_type, amount, created_at')
      .eq('activation_id', freeze.activation_id)
      .in('operation_type', ['refund', 'commit'])
      .gte('created_at', freeze.created_at) // Après le freeze
    
    if (!counterOps || counterOps.length === 0) {
      orphanCount++
      console.log(`🔴 FREEZE ORPHELIN: ${freeze.id.slice(0, 8)}`)
      console.log(`   Activation: ${freeze.activation_id?.slice(0, 8) || 'null'}`)
      console.log(`   Montant: ${freeze.amount} Ⓐ`)
      console.log(`   Créé: ${new Date(freeze.created_at).toLocaleString('fr-FR')}`)
      
      // Vérifier status de l'activation
      if (freeze.activation_id) {
        const { data: act } = await supabase
          .from('activations')
          .select('status, frozen_amount, charged')
          .eq('id', freeze.activation_id)
          .single()
        
        if (act) {
          console.log(`   Activation status: ${act.status}, frozen=${act.frozen_amount}, charged=${act.charged}`)
          
          if (act.status === 'pending' || act.status === 'waiting') {
            console.log(`   ℹ️  Activation toujours en cours`)
          } else if (act.frozen_amount === 0 && !act.charged) {
            console.log(`   🚨 PROBLÈME: frozen=0 mais aucun refund/commit dans balance_operations`)
          }
        }
      }
      console.log('')
    }
  }
  
  console.log(`\n📊 RÉSUMÉ: ${orphanCount}/${freezeOps.length} freeze orphelins trouvés`)
}

// 3️⃣ ANALYSER LES THROW ERROR DANS buy-sms-activate-number
console.log('\n3️⃣ POINTS D\'ÉCHEC DANS buy-sms-activate-number\n')
console.log('Points où throw Error est appelé APRÈS freeze:')
console.log('  ❌ Line 451: Failed to create activation (AVANT freeze - OK)')
console.log('  ❌ Line 474-476: Failed to freeze balance (AVANT freeze - OK)')
console.log('  ❌ Line 549: catch(error) général (PEUT CAPTURER ERREUR APRÈS FREEZE)')
console.log('')
console.log('⚠️  PROBLÈME IDENTIFIÉ:')
console.log('  Si une erreur survient APRÈS secure_freeze_balance (ligne 457-476)')
console.log('  mais AVANT la fin de la fonction, le catch(error) ligne 549')
console.log('  retourne une Response avec error mais NE FAIT PAS DE REFUND!')
console.log('')
console.log('  Exemple: Si linkError (ligne 494) ou linkFreezeError (ligne 504) throw,')
console.log('  le frozen_amount reste gelé mais user reçoit une erreur.')

// 4️⃣ VÉRIFIER ÉTAT ACTUEL DES USERS AVEC DISCREPANCY
console.log('\n4️⃣ USERS AVEC DISCREPANCY frozen_balance\n')

const { data: healthData, error: healthError } = await supabase
  .from('v_frozen_balance_health')
  .select('*')
  .neq('frozen_discrepancy', 0)
  .order('frozen_discrepancy', { ascending: false })
  .limit(10)

if (healthError) {
  console.error('❌ Erreur health check:', healthError)
} else if (!healthData || healthData.length === 0) {
  console.log('✅ Tous les users ont frozen_balance cohérent')
} else {
  console.log(`🚨 ${healthData.length} USERS AVEC DISCREPANCY:\n`)
  
  for (const user of healthData) {
    console.log(`👤 User ${user.user_id?.slice(0, 8)}`)
    console.log(`   frozen_balance (table): ${user.frozen_balance_user} Ⓐ`)
    console.log(`   frozen_amount (sum): ${user.total_frozen_activations} Ⓐ`)
    console.log(`   DISCREPANCY: ${user.frozen_discrepancy} Ⓐ`)
    console.log('')
  }
}

// 5️⃣ RECOMMANDATIONS
console.log('\n5️⃣ SOLUTION ROBUSTE PROPOSÉE\n')
console.log('=' .repeat(80))
console.log('')
console.log('📋 STRATÉGIE DE PROTECTION:')
console.log('')
console.log('1️⃣ WRAP TOUTE LA LOGIQUE APRÈS freeze DANS UN TRY-CATCH')
console.log('   try {')
console.log('     const freezeResult = await secure_freeze_balance(...)')
console.log('     // ... reste de la logique')
console.log('   } catch (error) {')
console.log('     // ⚠️ Si on arrive ici APRÈS freeze, ROLLBACK OBLIGATOIRE')
console.log('     await atomic_refund(...)')
console.log('     throw error')
console.log('   }')
console.log('')
console.log('2️⃣ AJOUTER UN FLAG "freeze_completed" SUR ACTIVATION')
console.log('   - Permet de tracker si freeze a réussi')
console.log('   - Si freeze_completed=true mais status=failed, on sait qu\'il faut refund')
console.log('')
console.log('3️⃣ CRON JOB DE RÉCONCILIATION')
console.log('   - Toutes les 5 minutes:')
console.log('     * Trouver activations avec frozen_amount > 0 ET status IN (timeout, failed, cancelled)')
console.log('     * Vérifier si refund existe dans balance_operations')
console.log('     * Si non, appeler atomic_refund')
console.log('')
console.log('4️⃣ DEADLOCK TIMEOUT SUR atomic_refund/atomic_commit')
console.log('   - Ajouter LOCK_TIMEOUT pour éviter blocages éternels')
console.log('   - Si timeout, logger et réessayer')
console.log('')
console.log('=' .repeat(80))
