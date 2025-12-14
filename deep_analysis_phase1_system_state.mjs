// ANALYSE DEEP PHASE 1: ÉTAT SYSTÈME COMPLET
// Analyse exhaustive de l'état actuel du système

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 PHASE 1: ANALYSE ÉTAT SYSTÈME COMPLET')
console.log('=' .repeat(60))

// 1. ÉTAT GÉNÉRAL DES UTILISATEURS
async function analyzeUsersState() {
  console.log('\n📊 1. ANALYSE UTILISATEURS')
  console.log('-'.repeat(30))
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance, created_at')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Erreur récupération utilisateurs:', error)
    return
  }
  
  console.log(`Total utilisateurs: ${users.length}`)
  
  // Stats globales
  const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0)
  const totalFrozen = users.reduce((sum, u) => sum + (u.frozen_balance || 0), 0)
  const usersWithFrozen = users.filter(u => u.frozen_balance > 0)
  
  console.log(`💰 Balance totale: ${totalBalance}Ⓐ`)
  console.log(`🧊 Frozen total: ${totalFrozen}Ⓐ`)
  console.log(`🔒 Utilisateurs avec frozen: ${usersWithFrozen.length}`)
  
  // Détail utilisateurs avec frozen
  if (usersWithFrozen.length > 0) {
    console.log('\n🔒 UTILISATEURS AVEC FROZEN_BALANCE:')
    usersWithFrozen.forEach(u => {
      console.log(`  • ${u.email}: balance=${u.balance}Ⓐ, frozen=${u.frozen_balance}Ⓐ`)
    })
  }
  
  return { totalBalance, totalFrozen, usersWithFrozen }
}

// 2. ÉTAT DES ACTIVATIONS
async function analyzeActivationsState() {
  console.log('\n📱 2. ANALYSE ACTIVATIONS')
  console.log('-'.repeat(30))
  
  const { data: activations, error } = await supabase
    .from('activations')
    .select('id, user_id, status, frozen_amount, created_at, service_name')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Erreur récupération activations:', error)
    return
  }
  
  console.log(`Total activations: ${activations.length}`)
  
  // Stats par status
  const statusStats = {}
  const frozenAmountTotal = activations.reduce((sum, a) => {
    statusStats[a.status] = (statusStats[a.status] || 0) + 1
    return sum + (a.frozen_amount || 0)
  }, 0)
  
  console.log('📊 Répartition par status:')
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`  • ${status}: ${count}`)
  })
  
  console.log(`🧊 Total frozen_amount dans activations: ${frozenAmountTotal}Ⓐ`)
  
  // Activations avec frozen_amount > 0
  const activationsWithFrozen = activations.filter(a => a.frozen_amount > 0)
  console.log(`🔒 Activations avec frozen_amount: ${activationsWithFrozen.length}`)
  
  if (activationsWithFrozen.length > 0) {
    console.log('\n🔒 ACTIVATIONS AVEC FROZEN_AMOUNT:')
    activationsWithFrozen.forEach(a => {
      console.log(`  • ID:${a.id} User:${a.user_id} Status:${a.status} Frozen:${a.frozen_amount}Ⓐ Service:${a.service_name}`)
    })
  }
  
  return { totalActivations: activations.length, frozenAmountTotal, activationsWithFrozen, statusStats }
}

// 3. ÉTAT DES RENTALS
async function analyzeRentalsState() {
  console.log('\n🏠 3. ANALYSE RENTALS')
  console.log('-'.repeat(30))
  
  const { data: rentals, error } = await supabase
    .from('rentals')
    .select('id, user_id, status, frozen_amount, created_at, service_name')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Erreur récupération rentals:', error)
    return
  }
  
  console.log(`Total rentals: ${rentals.length}`)
  
  // Stats par status
  const statusStats = {}
  const frozenAmountTotal = rentals.reduce((sum, r) => {
    statusStats[r.status] = (statusStats[r.status] || 0) + 1
    return sum + (r.frozen_amount || 0)
  }, 0)
  
  console.log('📊 Répartition par status:')
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`  • ${status}: ${count}`)
  })
  
  console.log(`🧊 Total frozen_amount dans rentals: ${frozenAmountTotal}Ⓐ`)
  
  // Rentals avec frozen_amount > 0
  const rentalsWithFrozen = rentals.filter(r => r.frozen_amount > 0)
  console.log(`🔒 Rentals avec frozen_amount: ${rentalsWithFrozen.length}`)
  
  if (rentalsWithFrozen.length > 0) {
    console.log('\n🔒 RENTALS AVEC FROZEN_AMOUNT:')
    rentalsWithFrozen.forEach(r => {
      console.log(`  • ID:${r.id} User:${r.user_id} Status:${r.status} Frozen:${r.frozen_amount}Ⓐ Service:${r.service_name}`)
    })
  }
  
  return { totalRentals: rentals.length, frozenAmountTotal, rentalsWithFrozen, statusStats }
}

// 4. ANALYSE BALANCE OPERATIONS
async function analyzeBalanceOperations() {
  console.log('\n💳 4. ANALYSE BALANCE OPERATIONS')
  console.log('-'.repeat(30))
  
  const { data: operations, error } = await supabase
    .from('balance_operations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error('❌ Erreur récupération balance_operations:', error)
    return
  }
  
  console.log(`Total opérations (50 dernières): ${operations.length}`)
  
  // Grouper par type d'opération
  const opTypes = {}
  operations.forEach(op => {
    opTypes[op.operation_type] = (opTypes[op.operation_type] || 0) + 1
  })
  
  console.log('📊 Répartition par type d\'opération:')
  Object.entries(opTypes).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count}`)
  })
  
  // Analyser les opérations de freeze/unfreeze
  const freezeOps = operations.filter(op => 
    op.operation_type === 'FREEZE' || 
    op.operation_type === 'REFUND' || 
    op.operation_type === 'COMMIT'
  )
  
  console.log(`\n🧊 Opérations liées au frozen (50 dernières): ${freezeOps.length}`)
  
  if (freezeOps.length > 0) {
    console.log('\n🔍 DERNIÈRES OPÉRATIONS FREEZE/REFUND/COMMIT:')
    freezeOps.slice(0, 10).forEach(op => {
      console.log(`  • ${op.created_at} | ${op.operation_type} | User:${op.user_id} | Amount:${op.amount}Ⓐ | ${op.description || 'No desc'}`)
    })
  }
  
  return { totalOps: operations.length, opTypes, freezeOps }
}

// 5. VÉRIFICATION FONCTIONS RPC
async function checkRPCFunctions() {
  console.log('\n⚙️ 5. VÉRIFICATION FONCTIONS RPC')
  console.log('-'.repeat(30))
  
  const functions = ['atomic_freeze', 'atomic_refund', 'atomic_commit', 'atomic_refund_direct']
  
  for (const funcName of functions) {
    try {
      // Test avec des paramètres bidon pour voir si la fonction existe
      const { error } = await supabase.rpc(funcName, { 
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 1
      })
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${funcName}: N'EXISTE PAS`)
        } else {
          console.log(`✅ ${funcName}: Existe (erreur attendue: ${error.message.substring(0, 50)}...)`)
        }
      } else {
        console.log(`✅ ${funcName}: Existe et fonctionne`)
      }
    } catch (e) {
      console.log(`❓ ${funcName}: Erreur test - ${e.message.substring(0, 50)}...`)
    }
  }
}

// ANALYSE PRINCIPALE
async function runPhase1Analysis() {
  try {
    const usersData = await analyzeUsersState()
    const activationsData = await analyzeActivationsState()
    const rentalsData = await analyzeRentalsState()
    const operationsData = await analyzeBalanceOperations()
    await checkRPCFunctions()
    
    // SYNTHÈSE PHASE 1
    console.log('\n🎯 SYNTHÈSE PHASE 1')
    console.log('=' .repeat(40))
    
    const totalFrozenInUsers = usersData?.totalFrozen || 0
    const totalFrozenInActivations = activationsData?.frozenAmountTotal || 0
    const totalFrozenInRentals = rentalsData?.frozenAmountTotal || 0
    const expectedFrozen = totalFrozenInActivations + totalFrozenInRentals
    
    console.log(`🧊 Frozen dans users: ${totalFrozenInUsers}Ⓐ`)
    console.log(`🧊 Frozen dans activations: ${totalFrozenInActivations}Ⓐ`)
    console.log(`🧊 Frozen dans rentals: ${totalFrozenInRentals}Ⓐ`)
    console.log(`🧊 Expected frozen total: ${expectedFrozen}Ⓐ`)
    
    const discrepancy = totalFrozenInUsers - expectedFrozen
    if (discrepancy !== 0) {
      console.log(`⚠️ INCOHÉRENCE DÉTECTÉE: ${discrepancy}Ⓐ de différence!`)
    } else {
      console.log(`✅ COHÉRENCE: Frozen balances concordent`)
    }
    
    return {
      usersData,
      activationsData, 
      rentalsData,
      operationsData,
      discrepancy,
      summary: {
        totalUsers: usersData?.usersWithFrozen?.length || 0,
        totalActivations: activationsData?.totalActivations || 0,
        totalRentals: rentalsData?.totalRentals || 0,
        frozenDiscrepancy: discrepancy
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse phase 1:', error)
    throw error
  }
}

// EXÉCUTION
runPhase1Analysis()
  .then(result => {
    console.log('\n✅ PHASE 1 TERMINÉE')
    console.log('Passez à la Phase 2 pour analyser la cohérence des données')
  })
  .catch(error => {
    console.error('💥 ÉCHEC PHASE 1:', error)
  })