// VALIDATION SIMPLE ET DIRECTE
// Test de l'état actuel du système avant/après correction

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

async function quickValidation() {
  console.log('🔍 VALIDATION RAPIDE - ÉTAT ACTUEL')
  console.log('=' .repeat(50))
  
  try {
    // 1. Vérifier état buba6c
    console.log('\n1️⃣ ÉTAT BUBA6C')
    const { data: buba } = await supabase
      .from('users')
      .select('email, balance, frozen_balance')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    if (buba) {
      console.log(`  • Balance: ${buba.balance}Ⓐ`)
      console.log(`  • Frozen: ${buba.frozen_balance}Ⓐ`)
      
      if (buba.frozen_balance == 15) {
        console.log('  ⚠️ PHANTOM ENCORE PRÉSENT (15Ⓐ au lieu de 5Ⓐ attendus)')
      } else if (buba.frozen_balance == 5) {
        console.log('  ✅ PHANTOM CORRIGÉ (5Ⓐ comme attendu)')
      } else {
        console.log(`  🔍 État inattendu: ${buba.frozen_balance}Ⓐ`)
      }
    }
    
    // 2. Test fonction atomic_refund_direct
    console.log('\n2️⃣ TEST FONCTION ATOMIC_REFUND_DIRECT')
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    if (user) {
      // Test avec montant invalide pour vérifier la fonction
      try {
        await supabase.rpc('atomic_refund_direct', {
          p_user_id: user.id,
          p_amount: -1  // Montant invalide
        })
        console.log('  ❌ Fonction ne valide pas les montants')
      } catch (error) {
        if (error.message.includes('Invalid amount') || 
            error.message.includes('must be positive') ||
            error.message.includes('Invalid')) {
          console.log('  ✅ Fonction répond correctement aux contrôles')
        } else {
          console.log(`  📝 Réponse fonction: ${error.message}`)
        }
      }
    }
    
    // 3. Test vue health (si elle existe)
    console.log('\n3️⃣ TEST VUE HEALTH CHECK')
    try {
      const { data: health, error } = await supabase
        .from('v_frozen_balance_health')
        .select('*')
        .limit(3)
      
      if (error) {
        console.log('  ❌ Vue health non disponible:', error.message)
      } else {
        console.log(`  ✅ Vue health accessible (${health.length} entrées)`)
        
        const bubaHealth = health.find(h => h.email === 'buba6c@gmail.com')
        if (bubaHealth) {
          console.log(`    • Buba6c status: ${bubaHealth.health_status}`)
          console.log(`    • Discrepancy: ${bubaHealth.discrepancy}Ⓐ`)
        }
      }
    } catch (e) {
      console.log('  ❌ Vue health non testable:', e.message)
    }
    
    // 4. Résumé système
    console.log('\n4️⃣ RÉSUMÉ SYSTÈME')
    const { data: allUsers } = await supabase
      .from('users')
      .select('frozen_balance')
      .gt('frozen_balance', 0)
    
    if (allUsers) {
      const totalFrozen = allUsers.reduce((sum, u) => sum + u.frozen_balance, 0)
      console.log(`  • Utilisateurs avec frozen: ${allUsers.length}`)
      console.log(`  • Total frozen système: ${totalFrozen}Ⓐ`)
    }
    
    console.log('\n📋 INSTRUCTIONS DÉPLOIEMENT')
    console.log('-'.repeat(30))
    console.log('1. Ouvrez Supabase Dashboard SQL Editor')
    console.log('2. Exécutez: deploy_atomic_refund_direct_fix.sql')  
    console.log('3. Relancez ce script pour validation')
    console.log('\n🔗 https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql')
    
  } catch (error) {
    console.error('💥 Erreur:', error.message)
  }
}

quickValidation()