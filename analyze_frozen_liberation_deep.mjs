// ANALYSE COMPLÈTE - Pourquoi le frozen_balance n'est pas libéré
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeWhyFrozenNotLiberated() {
  console.log('🔍 ANALYSE COMPLETE - Pourquoi frozen_balance n\'est pas libéré')
  console.log('=' .repeat(80))

  try {
    // 1. ÉTAT ACTUEL du système
    console.log('1️⃣ ÉTAT ACTUEL DU SYSTÈME')
    console.log('-'.repeat(80))
    
    const { data: healthCheck } = await supabase
      .from('v_frozen_balance_health')
      .select('*')
      .limit(10)
    
    if (healthCheck && healthCheck.length > 0) {
      console.log('⚠️  PROBLÈMES DÉTECTÉS par v_frozen_balance_health:')
      healthCheck.forEach(issue => {
        console.log(`   • User: ${issue.email}`)
        console.log(`     Balance: ${issue.balance}Ⓐ | Frozen: ${issue.frozen_balance}Ⓐ`)
        console.log(`     Expected frozen: ${issue.expected_frozen}Ⓐ | Diff: ${issue.frozen_diff}Ⓐ`)
        console.log(`     Status: ${issue.health_status}`)
      })
    } else {
      console.log('✅ Aucun problème détecté par la vue de santé')
    }

    // 2. ANALYSE DES OPÉRATIONS RÉCENTES
    console.log('\n2️⃣ ANALYSE DES OPÉRATIONS BALANCE RÉCENTES (20 dernières)')
    console.log('-'.repeat(80))
    
    const { data: operations } = await supabase
      .from('balance_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (operations) {
      let totalFreezeCount = 0
      let totalRefundCount = 0
      let totalCommitCount = 0
      
      operations.forEach((op, idx) => {
        const time = new Date(op.created_at).toLocaleString('fr-FR')
        const frozenDelta = op.frozen_after - op.frozen_before
        const balanceDelta = op.balance_after - op.balance_before
        
        if (op.operation_type === 'freeze') totalFreezeCount++
        if (op.operation_type === 'refund') totalRefundCount++
        if (op.operation_type === 'commit') totalCommitCount++
        
        let icon = '📊'
        if (op.operation_type === 'freeze') icon = '🔒'
        if (op.operation_type === 'refund') icon = '💰'
        if (op.operation_type === 'commit') icon = '✅'
        
        console.log(`${icon} ${idx + 1}. [${time}] ${op.operation_type.toUpperCase()} - ${op.amount}Ⓐ`)
        console.log(`   Balance: ${op.balance_before} → ${op.balance_after} (${balanceDelta >= 0 ? '+' : ''}${balanceDelta})`)
        console.log(`   Frozen: ${op.frozen_before} → ${op.frozen_after} (${frozenDelta >= 0 ? '+' : ''}${frozenDelta})`)
        console.log(`   Reason: ${op.reason || 'No reason'}`)
        if (op.activation_id) console.log(`   Activation: ${op.activation_id.slice(0, 8)}...`)
        if (op.rental_id) console.log(`   Rental: ${op.rental_id.slice(0, 8)}...`)
        console.log('')
      })
      
      console.log(`📊 RÉSUMÉ OPÉRATIONS: Freeze=${totalFreezeCount}, Refund=${totalRefundCount}, Commit=${totalCommitCount}`)
      
      // 3. ANALYSE DES PATTERNS SUSPECTS
      console.log('\n3️⃣ PATTERNS SUSPECTS DÉTECTÉS')
      console.log('-'.repeat(80))
      
      // Freeze sans refund/commit correspondant
      const freezeOperations = operations.filter(op => op.operation_type === 'freeze')
      const refundOperations = operations.filter(op => op.operation_type === 'refund')
      const commitOperations = operations.filter(op => op.operation_type === 'commit')
      
      console.log(`🔒 Operations FREEZE: ${freezeOperations.length}`)
      console.log(`💰 Operations REFUND: ${refundOperations.length}`)
      console.log(`✅ Operations COMMIT: ${commitOperations.length}`)
      
      if (freezeOperations.length > (refundOperations.length + commitOperations.length)) {
        console.log(`⚠️  PROBLÈME: Plus de FREEZE (${freezeOperations.length}) que de REFUND+COMMIT (${refundOperations.length + commitOperations.length})`)
        console.log(`   → Indicates potential orphaned frozen amounts`)
      }
      
      // Recherche de refunds successifs pour le même rental/activation
      const refundsByRental = {}
      const refundsByActivation = {}
      
      refundOperations.forEach(refund => {
        if (refund.rental_id) {
          if (!refundsByRental[refund.rental_id]) refundsByRental[refund.rental_id] = []
          refundsByRental[refund.rental_id].push(refund)
        }
        if (refund.activation_id) {
          if (!refundsByActivation[refund.activation_id]) refundsByActivation[refund.activation_id] = []
          refundsByActivation[refund.activation_id].push(refund)
        }
      })
      
      Object.entries(refundsByRental).forEach(([rentalId, refunds]) => {
        if (refunds.length > 1) {
          console.log(`⚠️  MULTIPLE REFUNDS pour rental ${rentalId.slice(0, 8)}...: ${refunds.length} refunds`)
        }
      })
    }

    // 4. ANALYSER LES RENTALS AVEC frozen_amount > 0 MAIS frozen_balance = 0
    console.log('\n4️⃣ RENTALS ORPHELINS (frozen_amount > 0 mais user.frozen_balance = 0)')
    console.log('-'.repeat(80))
    
    const { data: orphanedRentals } = await supabase
      .from('rentals')
      .select(`
        id, user_id, rent_id, phone, service_code, status, 
        frozen_amount, price, created_at,
        users!inner(id, email, balance, frozen_balance)
      `)
      .gt('frozen_amount', 0)
      .eq('users.frozen_balance', 0)

    if (orphanedRentals && orphanedRentals.length > 0) {
      console.log(`🚨 TROUVÉ ${orphanedRentals.length} RENTALS ORPHELINS:`)
      orphanedRentals.forEach((rental, idx) => {
        console.log(`${idx + 1}. Rental ${rental.id.slice(0, 8)}... (${rental.phone})`)
        console.log(`   User: ${rental.users.email} | Frozen: ${rental.users.frozen_balance}Ⓐ`)
        console.log(`   Rental frozen_amount: ${rental.frozen_amount}Ⓐ | Status: ${rental.status}`)
        console.log(`   Created: ${new Date(rental.created_at).toLocaleString('fr-FR')}`)
      })
    } else {
      console.log('✅ Aucun rental orphelin détecté')
    }

    // 5. ACTIVATIONS ORPHELINES
    console.log('\n5️⃣ ACTIVATIONS ORPHELINES (frozen_amount > 0 mais user.frozen_balance = 0)')
    console.log('-'.repeat(80))
    
    const { data: orphanedActivations } = await supabase
      .from('activations')
      .select(`
        id, user_id, order_id, phone, service_code, status, 
        frozen_amount, price, created_at,
        users!inner(id, email, balance, frozen_balance)
      `)
      .gt('frozen_amount', 0)
      .eq('users.frozen_balance', 0)

    if (orphanedActivations && orphanedActivations.length > 0) {
      console.log(`🚨 TROUVÉ ${orphanedActivations.length} ACTIVATIONS ORPHELINES:`)
      orphanedActivations.forEach((activation, idx) => {
        console.log(`${idx + 1}. Activation ${activation.id.slice(0, 8)}... (${activation.phone})`)
        console.log(`   User: ${activation.users.email} | Frozen: ${activation.users.frozen_balance}Ⓐ`)
        console.log(`   Activation frozen_amount: ${activation.frozen_amount}Ⓐ | Status: ${activation.status}`)
        console.log(`   Created: ${new Date(activation.created_at).toLocaleString('fr-FR')}`)
      })
    } else {
      console.log('✅ Aucune activation orpheline détectée')
    }

    // 6. ANALYSE DES EDGE FUNCTIONS ET LEURS LOGS
    console.log('\n6️⃣ ANALYSE DE LA LOGIQUE DES EDGE FUNCTIONS')
    console.log('-'.repeat(80))
    
    console.log('🔍 SCÉNARIOS DE LIBÉRATION DU FROZEN:')
    console.log('')
    console.log('Scenario 1: SUCCÈS (SMS reçu/Rental terminé)')
    console.log('   → atomic_commit(user_id, activation_id/rental_id)')
    console.log('   → frozen_balance -= frozen_amount (balance inchangé)')
    console.log('   → frozen_amount = 0')
    console.log('')
    console.log('Scenario 2: ANNULATION/EXPIRATION avec remboursement')
    console.log('   → atomic_refund(user_id, activation_id/rental_id)')
    console.log('   → balance += frozen_amount, frozen_balance -= frozen_amount')
    console.log('   → frozen_amount = 0')
    console.log('')
    console.log('Scenario 3: ÉCHEC DE CRÉATION (avant activation/rental créé)')
    console.log('   → atomic_refund_direct(user_id, amount)')
    console.log('   → frozen_balance -= amount (balance inchangé)')
    console.log('   → ⚠️  NE TOUCHE PAS aux frozen_amount des activations/rentals!')
    console.log('')
    
    console.log('🚨 PROBLÈME IDENTIFIÉ:')
    console.log('   atomic_refund_direct libère le frozen_balance de l\'utilisateur')
    console.log('   MAIS ne reset pas les frozen_amount des rentals/activations créés')
    console.log('   → Résultat: frozen_balance = 0, mais frozen_amount > 0 (incohérence)')

    // 7. RECOMMANDATIONS
    console.log('\n7️⃣ RECOMMANDATIONS DE CORRECTION')
    console.log('-'.repeat(80))
    
    console.log('✅ SOLUTIONS POSSIBLES:')
    console.log('')
    console.log('Solution 1: MODIFIER atomic_refund_direct')
    console.log('   → Ajouter la recherche des activations/rentals avec frozen_amount > 0')
    console.log('   → Reset leurs frozen_amount à 0 lors du refund_direct')
    console.log('   → Plus complexe mais plus propre')
    console.log('')
    console.log('Solution 2: MODIFIER la logique des Edge Functions')
    console.log('   → Passer rental_id/activation_id à atomic_refund_direct')
    console.log('   → Ou utiliser atomic_refund au lieu de atomic_refund_direct')
    console.log('   → Plus simple mais nécessite changements dans les fonctions')
    console.log('')
    console.log('Solution 3: NETTOYAGE PÉRIODIQUE')
    console.log('   → Cron job qui reset les frozen_amount orphelins')
    console.log('   → Temporaire mais résout les incohérences existantes')

  } catch (error) {
    console.error('❌ Erreur analyse:', error)
  }
}

analyzeWhyFrozenNotLiberated()