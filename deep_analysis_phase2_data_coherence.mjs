// ANALYSE DEEP PHASE 2: COHÉRENCE DES DONNÉES
// Analyse détaillée des incohérences détectées

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 PHASE 2: ANALYSE COHÉRENCE DES DONNÉES')
console.log('=' .repeat(60))

// 1. DIAGNOSTIC INCOHÉRENCE FROZEN BALANCE
async function diagnoseFrozenIncohérence() {
  console.log('\n🚨 1. DIAGNOSTIC INCOHÉRENCE FROZEN BALANCE')
  console.log('-'.repeat(50))
  
  // User avec frozen balance
  const { data: userBuba, error: errorUser } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('email', 'buba6c@gmail.com')
    .single()
  
  if (errorUser || !userBuba) {
    console.error('❌ Erreur récupération user buba:', errorUser)
    return
  }
  
  console.log(`🔍 User buba6c: balance=${userBuba.balance}Ⓐ, frozen=${userBuba.frozen_balance}Ⓐ`)
  
  // Activations pour ce user (correction du nom de colonne)
  const { data: activations, error: errorActivations } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, service_code, created_at')
    .eq('user_id', userBuba.id)
    .order('created_at', { ascending: false })
  
  if (errorActivations) {
    console.error('❌ Erreur récupération activations:', errorActivations)
  } else {
    console.log(`🔍 Activations trouvées: ${activations.length}`)
    
    const totalFrozenActivations = activations.reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
    console.log(`🧊 Total frozen_amount activations: ${totalFrozenActivations}Ⓐ`)
    
    if (activations.length > 0) {
      console.log('📋 Détail activations:')
      activations.forEach(a => {
        console.log(`  • ${a.id} | ${a.status} | frozen:${a.frozen_amount}Ⓐ | ${a.service_code} | ${a.created_at}`)
      })
    }
  }
  
  // Rentals pour ce user
  const { data: rentals, error: errorRentals } = await supabase
    .from('rentals')
    .select('id, status, frozen_amount, service_name, created_at')
    .eq('user_id', userBuba.id)
    .order('created_at', { ascending: false })
  
  if (errorRentals) {
    console.error('❌ Erreur récupération rentals:', errorRentals)
  } else {
    console.log(`🔍 Rentals trouvées: ${rentals.length}`)
    
    const totalFrozenRentals = rentals.reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
    console.log(`🧊 Total frozen_amount rentals: ${totalFrozenRentals}Ⓐ`)
    
    if (rentals.length > 0) {
      console.log('📋 Détail rentals:')
      rentals.forEach(r => {
        console.log(`  • ${r.id} | ${r.status} | frozen:${r.frozen_amount}Ⓐ | ${r.service_name} | ${r.created_at}`)
      })
    }
    
    // ANALYSE DE L'INCOHÉRENCE
    const totalFrozenActivations = (errorActivations) ? 0 : activations.reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
    const expectedFrozen = totalFrozenActivations + totalFrozenRentals
    const actualFrozen = userBuba.frozen_balance
    const discrepancy = actualFrozen - expectedFrozen
    
    console.log('\n🎯 BILAN INCOHÉRENCE:')
    console.log(`Expected frozen: ${expectedFrozen}Ⓐ`)
    console.log(`Actual frozen: ${actualFrozen}Ⓐ`)
    console.log(`Discrepancy: ${discrepancy}Ⓐ`)
    
    if (discrepancy > 0) {
      console.log(`⚠️ FROZEN BALANCE EXCÉDENTAIRE: ${discrepancy}Ⓐ`)
    } else if (discrepancy < 0) {
      console.log(`⚠️ FROZEN BALANCE INSUFFISANT: ${Math.abs(discrepancy)}Ⓐ`)
    }
    
    return { userBuba, activations, rentals, expectedFrozen, actualFrozen, discrepancy }
  }
}

// 2. ANALYSE BALANCE OPERATIONS POUR BUBA
async function analyzeBalanceOperationsBuba(userId) {
  console.log('\n💳 2. ANALYSE BALANCE OPERATIONS BUBA')
  console.log('-'.repeat(40))
  
  const { data: operations, error } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (error) {
    console.error('❌ Erreur récupération balance_operations:', error)
    return
  }
  
  console.log(`Total opérations pour buba6c: ${operations.length}`)
  
  // Grouper par type
  const opsByType = {}
  operations.forEach(op => {
    opsByType[op.operation_type] = (opsByType[op.operation_type] || []).concat(op)
  })
  
  console.log('\n📊 Répartition par type:')
  Object.entries(opsByType).forEach(([type, ops]) => {
    const totalAmount = ops.reduce((sum, op) => sum + op.amount, 0)
    console.log(`  • ${type}: ${ops.length} opérations, ${totalAmount}Ⓐ total`)
  })
  
  // Analyse des opérations FREEZE et REFUND
  const freezeOps = operations.filter(op => op.operation_type === 'freeze')
  const refundOps = operations.filter(op => op.operation_type === 'refund')
  
  console.log('\n🧊 ANALYSE FREEZE/REFUND:')
  console.log(`FREEZE: ${freezeOps.length} opérations`)
  console.log(`REFUND: ${refundOps.length} opérations`)
  
  const totalFrozen = freezeOps.reduce((sum, op) => sum + op.amount, 0)
  const totalRefunded = refundOps.reduce((sum, op) => sum + op.amount, 0)
  const netFrozen = totalFrozen - totalRefunded
  
  console.log(`Total frozen: ${totalFrozen}Ⓐ`)
  console.log(`Total refunded: ${totalRefunded}Ⓐ`)
  console.log(`Net frozen (calculated): ${netFrozen}Ⓐ`)
  
  // Détail des 10 dernières opérations
  console.log('\n📋 10 DERNIÈRES OPÉRATIONS:')
  operations.slice(0, 10).forEach(op => {
    const date = new Date(op.created_at).toLocaleString()
    console.log(`  • ${date} | ${op.operation_type} | ${op.amount}Ⓐ | ${op.description || 'No desc'}`)
  })
  
  return {
    totalOps: operations.length,
    freezeCount: freezeOps.length,
    refundCount: refundOps.length,
    totalFrozen,
    totalRefunded,
    netFrozen,
    operations
  }
}

// 3. VÉRIFICATION CONTRAINTES ET TRIGGERS
async function checkConstraintsAndTriggers() {
  console.log('\n⚙️ 3. VÉRIFICATION CONTRAINTES ET TRIGGERS')
  console.log('-'.repeat(45))
  
  // Vérifier les contraintes sur les tables
  const queries = [
    {
      name: 'CHECK CONSTRAINTS users',
      sql: `
        SELECT constraint_name, check_clause 
        FROM information_schema.check_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name LIKE '%users%'
      `
    },
    {
      name: 'TRIGGERS users',
      sql: `
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'users'
      `
    },
    {
      name: 'TRIGGERS activations',
      sql: `
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'activations'
      `
    },
    {
      name: 'TRIGGERS rentals',
      sql: `
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'rentals'
      `
    }
  ]
  
  for (const query of queries) {
    console.log(`\n🔍 ${query.name}:`)
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: query.sql })
      if (error) {
        console.log(`❌ Erreur: ${error.message}`)
      } else {
        if (data && data.length > 0) {
          data.forEach(row => {
            console.log(`  • ${JSON.stringify(row)}`)
          })
        } else {
          console.log('  • Aucun résultat')
        }
      }
    } catch (e) {
      console.log(`❌ Exception: ${e.message}`)
    }
  }
}

// 4. ANALYSE DES ÉTATS INCOHÉRENTS
async function analyzeInconsistentStates() {
  console.log('\n🔍 4. ANALYSE ÉTATS INCOHÉRENTS')
  console.log('-'.repeat(40))
  
  // Recherche d'autres utilisateurs avec incohérences
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .gt('frozen_balance', 0)
  
  if (error) {
    console.error('❌ Erreur récupération users avec frozen:', error)
    return
  }
  
  console.log(`Utilisateurs avec frozen_balance > 0: ${allUsers.length}`)
  
  for (const user of allUsers) {
    console.log(`\n🔍 Analyse ${user.email}:`)
    
    // Activations avec frozen_amount
    const { data: userActivations } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', user.id)
    
    // Rentals avec frozen_amount  
    const { data: userRentals } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', user.id)
    
    const activationsFrozen = (userActivations || []).reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
    const rentalsFrozen = (userRentals || []).reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
    const expectedFrozen = activationsFrozen + rentalsFrozen
    const discrepancy = user.frozen_balance - expectedFrozen
    
    console.log(`  Balance: ${user.balance}Ⓐ, Frozen: ${user.frozen_balance}Ⓐ`)
    console.log(`  Expected frozen: ${expectedFrozen}Ⓐ (activations: ${activationsFrozen}Ⓐ, rentals: ${rentalsFrozen}Ⓐ)`)
    
    if (discrepancy !== 0) {
      console.log(`  ⚠️ INCOHÉRENCE: ${discrepancy}Ⓐ`)
    } else {
      console.log(`  ✅ Cohérent`)
    }
  }
}

// ANALYSE PRINCIPALE PHASE 2
async function runPhase2Analysis() {
  try {
    const frozenAnalysis = await diagnoseFrozenIncohérence()
    
    if (frozenAnalysis) {
      const balanceOpsAnalysis = await analyzeBalanceOperationsBuba(frozenAnalysis.userBuba.id)
      await checkConstraintsAndTriggers()
      await analyzeInconsistentStates()
      
      // SYNTHÈSE PHASE 2
      console.log('\n🎯 SYNTHÈSE PHASE 2 - COHÉRENCE')
      console.log('=' .repeat(50))
      
      console.log(`🔍 User buba6c analysé:`)
      console.log(`  • Frozen balance actuel: ${frozenAnalysis.actualFrozen}Ⓐ`)
      console.log(`  • Frozen attendu: ${frozenAnalysis.expectedFrozen}Ⓐ`)
      console.log(`  • Incohérence: ${frozenAnalysis.discrepancy}Ⓐ`)
      
      if (balanceOpsAnalysis) {
        console.log(`\n💳 Balance operations:`)
        console.log(`  • Total opérations: ${balanceOpsAnalysis.totalOps}`)
        console.log(`  • FREEZE: ${balanceOpsAnalysis.freezeCount} (${balanceOpsAnalysis.totalFrozen}Ⓐ)`)
        console.log(`  • REFUND: ${balanceOpsAnalysis.refundCount} (${balanceOpsAnalysis.totalRefunded}Ⓐ)`)
        console.log(`  • Net frozen calculé: ${balanceOpsAnalysis.netFrozen}Ⓐ`)
      }
      
      // DIAGNOSTICS POSSIBLES
      console.log('\n🚨 DIAGNOSTICS POSSIBLES:')
      if (frozenAnalysis.discrepancy > 0) {
        console.log(`• Frozen balance phantom de ${frozenAnalysis.discrepancy}Ⓐ`)
        console.log('• Possibles causes:')
        console.log('  - atomic_refund_direct n\'a pas nettoyé les frozen_amount')
        console.log('  - Opérations REFUND sans mise à jour des items')
        console.log('  - Données de test non nettoyées')
      }
      
      return {
        frozenAnalysis,
        balanceOpsAnalysis,
        phase2Summary: {
          mainIssue: 'frozen_balance_phantom',
          phantomAmount: frozenAnalysis.discrepancy,
          affectedUser: 'buba6c@gmail.com',
          rootCause: 'atomic_refund_direct_incomplete_cleanup'
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur analyse phase 2:', error)
    throw error
  }
}

// EXÉCUTION
runPhase2Analysis()
  .then(result => {
    console.log('\n✅ PHASE 2 TERMINÉE')
    console.log('Passez à la Phase 3 pour analyser les flux opérationnels')
  })
  .catch(error => {
    console.error('💥 ÉCHEC PHASE 2:', error)
  })