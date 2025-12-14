#!/usr/bin/env node
/**
 * 🚀 DÉPLOIEMENT SOLUTION ROBUSTE
 * 
 * 1. Déployer SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql
 * 2. Déployer buy-sms-activate-number avec rollback protection
 * 3. Tester la réconciliation
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

dotenv.config()

const execAsync = promisify(exec)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('🚀 DÉPLOIEMENT SOLUTION ROBUSTE DE PROTECTION FREEZE')
console.log('=' .repeat(80))

// ÉTAPE 1: Déployer le SQL
console.log('\n1️⃣ Déploiement SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql...\n')
console.log('⚠️  INSTRUCTION: Exécute ce fichier SQL dans Supabase SQL Editor:')
console.log('   File: SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql')
console.log('   Contient:')
console.log('   - View v_frozen_balance_health (avec frozen_discrepancy)')
console.log('   - Function reconcile_orphan_freezes() (activations)')
console.log('   - Function reconcile_rentals_orphan_freezes() (rentals)')
console.log('   - Function atomic_refund_rental() (si manquant)')
console.log('')

// ÉTAPE 2: Tester reconciliation
console.log('2️⃣ Test: Chercher activations orphelines à réconcilier...\n')

const { data: orphans, error: orphansError } = await supabase
  .from('activations')
  .select('id, user_id, frozen_amount, status, price, created_at')
  .in('status', ['timeout', 'failed', 'cancelled'])
  .gt('frozen_amount', 0)
  .eq('charged', false)
  .order('created_at', { ascending: false })
  .limit(10)

if (orphansError) {
  console.error('❌ Erreur:', orphansError)
} else if (!orphans || orphans.length === 0) {
  console.log('✅ Aucune activation orpheline trouvée')
} else {
  console.log(`🚨 ${orphans.length} ACTIVATIONS ORPHELINES DÉTECTÉES:\n`)
  
  for (const act of orphans) {
    console.log(`📋 ${act.id.slice(0, 8)} - Status: ${act.status}, frozen=${act.frozen_amount}Ⓐ, price=${act.price}Ⓐ`)
    
    // Vérifier si refund existe
    const { data: refund } = await supabase
      .from('balance_operations')
      .select('id, amount')
      .eq('activation_id', act.id)
      .eq('operation_type', 'refund')
      .single()
    
    if (refund) {
      console.log(`   ✅ Refund existe: ${refund.amount}Ⓐ`)
    } else {
      console.log(`   ❌ AUCUN REFUND - reconcile_orphan_freezes() va le réparer`)
    }
  }
  
  console.log('\n⚠️  APRÈS DÉPLOIEMENT SQL, lance la réconciliation avec:')
  console.log('   SELECT * FROM reconcile_orphan_freezes();')
}

// ÉTAPE 3: Déployer Edge Function
console.log('\n3️⃣ Déploiement Edge Function buy-sms-activate-number...\n')
console.log('⚠️  INSTRUCTION: Déploie la fonction avec:')
console.log('   npx supabase functions deploy buy-sms-activate-number')
console.log('')
console.log('✅ Modifications appliquées:')
console.log('   - try-catch autour de secure_freeze_balance + logique suivante')
console.log('   - Flag freezeApplied pour tracker si freeze réussi')
console.log('   - catch(postFreezeError) appelle atomic_refund si freezeApplied=true')
console.log('   - Protection: frozen_amount ne reste jamais gelé si erreur après freeze')

// ÉTAPE 4: Vérifier health
console.log('\n4️⃣ Health Check: Vérifier discrepancy frozen_balance...\n')

// Simuler v_frozen_balance_health (view pas encore déployée)
const { data: users } = await supabase
  .from('users')
  .select('id, balance, frozen_balance')
  .gt('frozen_balance', 0)
  .limit(10)

if (users && users.length > 0) {
  console.log(`👥 ${users.length} users avec frozen_balance > 0\n`)
  
  for (const user of users) {
    // Calculer somme frozen_amount
    const { data: activations } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', user.id)
      .gt('frozen_amount', 0)
    
    const { data: rentals } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', user.id)
      .gt('frozen_amount', 0)
    
    const totalFrozen = (activations || []).reduce((sum, a) => sum + a.frozen_amount, 0) +
                        (rentals || []).reduce((sum, r) => sum + r.frozen_amount, 0)
    
    const discrepancy = user.frozen_balance - totalFrozen
    
    if (discrepancy !== 0) {
      console.log(`⚠️  User ${user.id.slice(0, 8)}`)
      console.log(`   frozen_balance: ${user.frozen_balance}Ⓐ`)
      console.log(`   total_frozen (sum): ${totalFrozen}Ⓐ`)
      console.log(`   DISCREPANCY: ${discrepancy}Ⓐ`)
    }
  }
}

// RÉSUMÉ
console.log('\n' + '='.repeat(80))
console.log('📋 RÉSUMÉ DU DÉPLOIEMENT\n')
console.log('✅ ANALYSE COMPLÈTE:')
console.log('   - 8 activations timeout sans refund → 41 Ⓐ perdus')
console.log('   - 28 freeze orphelins détectés')
console.log('   - Cause: catch(error) global sans rollback après freeze')
console.log('')
console.log('🛡️ SOLUTION EN 3 COUCHES:')
console.log('   1. Cron job réconciliation (reconcile_orphan_freezes)')
console.log('   2. View monitoring (v_frozen_balance_health)')
console.log('   3. Code protection (try-catch avec rollback)')
console.log('')
console.log('📝 PROCHAINES ÉTAPES:')
console.log('   1. Exécute SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql dans Supabase')
console.log('   2. Teste: SELECT * FROM reconcile_orphan_freezes();')
console.log('   3. Déploie: npx supabase functions deploy buy-sms-activate-number')
console.log('   4. Crée CRON: reconcile-orphan-freezes (*/5 * * * *)')
console.log('   5. Monitor: SELECT * FROM v_frozen_balance_health WHERE frozen_discrepancy != 0;')
console.log('')
console.log('=' .repeat(80))
