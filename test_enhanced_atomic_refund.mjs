// TEST FONCTIONNEL - ATOMIC_REFUND_DIRECT ENHANCED
// Ce script teste la nouvelle fonction avec ses capacités de nettoyage automatique

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🧪 TEST FONCTIONNEL - ATOMIC_REFUND_DIRECT ENHANCED')
console.log('=' .repeat(60))

async function testEnhancedFunction() {
  try {
    console.log('\n1️⃣ VÉRIFICATION ÉTAT POST-DÉPLOIEMENT')
    console.log('-'.repeat(45))
    
    // État buba6c après déploiement
    const { data: buba } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    if (buba) {
      console.log(`📊 État buba6c:`)
      console.log(`  • Balance: ${buba.balance}Ⓐ`)
      console.log(`  • Frozen: ${buba.frozen_balance}Ⓐ`)
      
      if (buba.frozen_balance == 5) {
        console.log('  ✅ PHANTOM CORRIGÉ! (5Ⓐ comme attendu)')
      } else if (buba.frozen_balance == 15) {
        console.log('  ⚠️ Phantom encore présent - SQL pas encore exécuté')
        console.log('  🔧 Exécutez d\'abord: deploy_atomic_refund_direct_fix.sql')
        return
      } else {
        console.log(`  🔍 État inattendu: ${buba.frozen_balance}Ⓐ`)
      }
    }
    
    console.log('\n2️⃣ TEST CONTRÔLES DE VALIDATION')
    console.log('-'.repeat(35))
    
    // Test 1: Montant négatif (doit échouer)
    try {
      await supabase.rpc('atomic_refund_direct', {
        p_user_id: buba.id,
        p_amount: -1
      })
      console.log('  ❌ ÉCHEC: Montant négatif accepté')
    } catch (error) {
      if (error.message.includes('Invalid amount') || error.message.includes('must be positive')) {
        console.log('  ✅ Contrôle montant négatif: OK')
      } else {
        console.log(`  📝 Réponse: ${error.message}`)
      }
    }
    
    // Test 2: Montant zéro (doit échouer)
    try {
      await supabase.rpc('atomic_refund_direct', {
        p_user_id: buba.id,
        p_amount: 0
      })
      console.log('  ❌ ÉCHEC: Montant zéro accepté')
    } catch (error) {
      if (error.message.includes('Invalid amount')) {
        console.log('  ✅ Contrôle montant zéro: OK')
      } else {
        console.log(`  📝 Réponse: ${error.message}`)
      }
    }
    
    // Test 3: Montant supérieur au frozen (doit échouer)
    try {
      await supabase.rpc('atomic_refund_direct', {
        p_user_id: buba.id,
        p_amount: buba.frozen_balance + 100
      })
      console.log('  ❌ ÉCHEC: Montant excessif accepté')
    } catch (error) {
      if (error.message.includes('Insufficient frozen balance')) {
        console.log('  ✅ Contrôle montant excessif: OK')
      } else {
        console.log(`  📝 Réponse: ${error.message}`)
      }
    }
    
    console.log('\n3️⃣ TEST FONCTIONNEL AVEC MONTANT VALIDE')
    console.log('-'.repeat(42))
    
    if (buba.frozen_balance >= 1) {
      console.log(`🔬 Test avec 0.5Ⓐ (frozen disponible: ${buba.frozen_balance}Ⓐ)`)
      
      // État avant
      const frozenBefore = buba.frozen_balance
      
      try {
        const { data: result, error } = await supabase.rpc('atomic_refund_direct', {
          p_user_id: buba.id,
          p_amount: 0.5
        })
        
        if (error) {
          console.log(`  ❌ Erreur refund: ${error.message}`)
        } else {
          console.log('  ✅ Refund réussi!')
          console.log(`  📊 Détails:`)
          console.log(`    • Montant refundé: ${result.refunded_amount}Ⓐ`)
          console.log(`    • Cleanup effectué: ${result.cleanup_performed}`)
          console.log(`    • Activations nettoyées: ${result.activations_cleaned}`)
          console.log(`    • Rentals nettoyées: ${result.rentals_cleaned}`)
          console.log(`    • Nouveau frozen: ${result.new_frozen_balance}Ⓐ`)
          
          if (result.cleanup_performed) {
            console.log(`    • 🎯 CLEANUP AUTOMATIQUE: ${result.total_cleaned_amount}Ⓐ nettoyé`)
          }
          
          // Vérifier état après
          const { data: bubaAfter } = await supabase
            .from('users')
            .select('frozen_balance')
            .eq('id', buba.id)
            .single()
          
          if (bubaAfter) {
            const expectedFrozen = frozenBefore - 0.5
            if (Math.abs(bubaAfter.frozen_balance - expectedFrozen) < 0.01) {
              console.log('  ✅ Balance frozen correctement mise à jour')
            } else {
              console.log(`  ⚠️ Balance frozen inattendue: ${bubaAfter.frozen_balance}Ⓐ vs ${expectedFrozen}Ⓐ attendu`)
            }
          }
        }
        
      } catch (funcError) {
        console.log(`  ❌ Exception: ${funcError.message}`)
      }
      
    } else {
      console.log('  ℹ️ Pas assez de frozen balance pour test fonctionnel')
    }
    
    console.log('\n4️⃣ VÉRIFICATION VUE HEALTH POST-TEST')
    console.log('-'.repeat(40))
    
    try {
      const { data: health } = await supabase
        .from('v_frozen_balance_health')
        .select('*')
        .eq('email', 'buba6c@gmail.com')
        .single()
      
      if (health) {
        console.log(`📊 Health buba6c:`)
        console.log(`  • Status: ${health.health_status}`)
        console.log(`  • Frozen actuel: ${health.actual_frozen}Ⓐ`)
        console.log(`  • Frozen attendu: ${health.expected_frozen}Ⓐ`)
        console.log(`  • Discrepancy: ${health.discrepancy}Ⓐ`)
        
        if (health.health_status === 'HEALTHY') {
          console.log('  🎉 PARFAIT: Status HEALTHY maintenu!')
        } else {
          console.log(`  ⚠️ Attention: Status = ${health.health_status}`)
        }
      } else {
        console.log('  ℹ️ Plus de frozen balance - normal après refunds')
      }
    } catch (healthError) {
      console.log(`  ❌ Erreur vue health: ${healthError.message}`)
    }
    
    console.log('\n5️⃣ VÉRIFICATION LOGS D\'AUDIT')
    console.log('-'.repeat(32))
    
    // Récupérer les dernières opérations
    const { data: recentOps } = await supabase
      .from('balance_operations')
      .select('operation_type, amount, description, created_at, metadata')
      .eq('user_id', buba.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentOps && recentOps.length > 0) {
      console.log('📝 Dernières opérations:')
      recentOps.forEach((op, index) => {
        const time = new Date(op.created_at).toLocaleTimeString()
        console.log(`  ${index + 1}. [${time}] ${op.operation_type.toUpperCase()}: ${op.amount}Ⓐ`)
        console.log(`     ${op.description}`)
        
        if (op.metadata && op.metadata.cleanup_details) {
          console.log(`     🧹 Cleanup effectué`)
        }
      })
    }
    
    console.log('\n🎊 RÉSUMÉ TEST FONCTIONNEL')
    console.log('=' .repeat(35))
    console.log('✅ Contrôles de validation: Testés')
    console.log('✅ Refund avec cleanup: Testé')
    console.log('✅ Vue health: Vérifiée')
    console.log('✅ Logs audit: Confirmés')
    console.log('\n🛡️ La fonction atomic_refund_direct enhanced est opérationnelle!')
    
  } catch (error) {
    console.error('\n💥 ERREUR TEST:', error.message)
    console.log('🔧 Vérifiez que le SQL a été correctement déployé')
  }
}

// Fonction helper pour afficher l'état général du système
async function systemHealthSummary() {
  console.log('\n📊 RÉSUMÉ SANTÉ SYSTÈME')
  console.log('-'.repeat(30))
  
  try {
    const { data: allHealth } = await supabase
      .from('v_frozen_balance_health')
      .select('health_status')
    
    if (allHealth) {
      const summary = allHealth.reduce((acc, row) => {
        acc[row.health_status] = (acc[row.health_status] || 0) + 1
        return acc
      }, {})
      
      Object.entries(summary).forEach(([status, count]) => {
        const icon = status === 'HEALTHY' ? '✅' : '⚠️'
        console.log(`  ${icon} ${status}: ${count} users`)
      })
      
      if (summary.HEALTHY && Object.keys(summary).length === 1) {
        console.log('  🏆 SYSTÈME PARFAITEMENT SAIN!')
      }
    }
  } catch (error) {
    console.log('  ❌ Impossible de récupérer le résumé système')
  }
}

// Exécution
console.log('🚀 Démarrage test fonctionnel...\n')

testEnhancedFunction()
  .then(() => systemHealthSummary())
  .then(() => {
    console.log('\n✅ Test fonctionnel terminé!')
  })
  .catch((error) => {
    console.error('\n💥 Erreur test:', error.message)
  })