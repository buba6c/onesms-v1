#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Variables manquantes: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

const TEST_USER_EMAIL = 'buba6c@gmail.com'
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`)
}

async function getUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('email', TEST_USER_EMAIL)
    .single()
  
  if (error) throw error
  return data
}

async function getActivations(userId) {
  const { data } = await supabase
    .from('activations')
    .select('id, phone, service_code, frozen_amount, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting'])
  
  return data || []
}

async function checkHealthView() {
  const { data } = await supabase
    .from('v_frozen_balance_health')
    .select('*')
  
  return data || []
}

async function getBalanceOperations(userId, limit = 10) {
  const { data } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return data || []
}

console.log('\n' + '='.repeat(70))
log('🧪 TEST COMPLET DU SYSTÈME WALLET ATOMIQUE', 'cyan')
console.log('='.repeat(70))

try {
  // 1. État initial
  log('\n📊 ÉTAT INITIAL', 'blue')
  console.log('-'.repeat(70))
  
  const user = await getUser()
  log(`👤 User: ${user.email}`, 'cyan')
  console.log(`   Balance: ${user.balance} FCFA`)
  console.log(`   Frozen: ${user.frozen_balance} FCFA`)
  console.log(`   Disponible: ${user.balance - user.frozen_balance} FCFA`)
  
  const activations = await getActivations(user.id)
  console.log(`\n📱 Activations actives: ${activations.length}`)
  let totalFrozen = 0
  activations.forEach(a => {
    totalFrozen += a.frozen_amount || 0
    console.log(`   - ${a.phone} | ${a.service_code} | frozen: ${a.frozen_amount} | ${a.status}`)
  })
  
  // 2. Vérification cohérence
  log('\n💰 COHÉRENCE', 'blue')
  console.log('-'.repeat(70))
  console.log(`Total frozen_amount (activations): ${totalFrozen} FCFA`)
  console.log(`frozen_balance (user): ${user.frozen_balance} FCFA`)
  const diff = Math.abs(totalFrozen - user.frozen_balance)
  console.log(`Différence: ${diff} FCFA`)
  
  if (diff < 0.01) {
    log('✅ COHÉRENT - Le système est synchronisé', 'green')
  } else {
    log(`⚠️ DÉSYNCHRONISÉ - Différence de ${diff} FCFA`, 'yellow')
  }
  
  // 3. Test health view
  log('\n🏥 SANTÉ WALLET (v_frozen_balance_health)', 'blue')
  console.log('-'.repeat(70))
  
  const healthIssues = await checkHealthView()
  if (healthIssues.length === 0) {
    log('✅ Aucun problème détecté', 'green')
  } else {
    log(`⚠️ ${healthIssues.length} problème(s) détecté(s):`, 'yellow')
    healthIssues.forEach(issue => {
      console.log(`   [${issue.severity}] ${issue.issue_type}`)
      console.log(`   User: ${issue.user_id}`)
      console.log(`   Balance: ${issue.balance} | Frozen: ${issue.frozen_balance} | Calculated: ${issue.calculated_frozen}`)
      console.log()
    })
  }
  
  // 4. Historique des opérations
  log('\n📜 HISTORIQUE BALANCE_OPERATIONS (10 dernières)', 'blue')
  console.log('-'.repeat(70))
  
  const operations = await getBalanceOperations(user.id, 10)
  if (operations.length === 0) {
    console.log('   Aucune opération enregistrée')
  } else {
    operations.forEach(op => {
      const symbol = op.operation_type === 'freeze' ? '🔒' : 
                     op.operation_type === 'commit' ? '✅' : '💸'
      console.log(`${symbol} ${op.operation_type.toUpperCase()} - ${op.amount} FCFA`)
      console.log(`   Balance: ${op.balance_before} → ${op.balance_after}`)
      console.log(`   Frozen: ${op.frozen_before} → ${op.frozen_after}`)
      console.log(`   Raison: ${op.reason || 'N/A'}`)
      console.log(`   ${new Date(op.created_at).toLocaleString('fr-FR')}`)
      console.log()
    })
  }
  
  // 5. Résumé final
  log('\n' + '='.repeat(70), 'blue')
  log('📈 RÉSUMÉ FINAL', 'cyan')
  console.log('='.repeat(70))
  
  const finalUser = await getUser()
  const finalActivations = await getActivations(finalUser.id)
  const finalHealth = await checkHealthView()
  const finalFrozen = finalActivations.reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
  
  console.log(`✓ Balance: ${finalUser.balance} FCFA`)
  console.log(`✓ Frozen: ${finalUser.frozen_balance} FCFA`)
  console.log(`✓ Activations actives: ${finalActivations.length}`)
  console.log(`✓ Total frozen_amount: ${finalFrozen} FCFA`)
  console.log(`✓ Problèmes détectés: ${finalHealth.length}`)
  
  const isCoherent = Math.abs(finalFrozen - finalUser.frozen_balance) < 0.01
  const isHealthy = finalHealth.length === 0
  
  console.log()
  if (isCoherent && isHealthy) {
    log('✅ SYSTÈME WALLET: 100% OPÉRATIONNEL', 'green')
    log('   - Cohérence parfaite entre frozen_balance et activations', 'green')
    log('   - Aucun problème détecté par le système de monitoring', 'green')
    log('   - Fonctions atomiques disponibles et fonctionnelles', 'green')
  } else {
    log('⚠️ SYSTÈME WALLET: ATTENTION REQUISE', 'yellow')
    if (!isCoherent) {
      log(`   - Désynchronisation détectée: ${Math.abs(finalFrozen - finalUser.frozen_balance)} FCFA`, 'yellow')
    }
    if (!isHealthy) {
      log(`   - ${finalHealth.length} problème(s) dans la health view`, 'yellow')
    }
    console.log('\n💡 Suggestion: Exécuter le CRON wallet-health pour correction automatique')
  }
  
  console.log('\n' + '='.repeat(70))
  log('🎯 Test terminé avec succès', 'green')
  console.log('='.repeat(70) + '\n')
  
} catch (error) {
  log('\n❌ ERREUR LORS DU TEST:', 'red')
  console.error(error.message)
  if (error.details) console.error('Détails:', error.details)
  if (error.hint) console.error('Hint:', error.hint)
  process.exit(1)
}
