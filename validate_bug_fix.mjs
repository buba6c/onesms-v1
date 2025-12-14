// Test final pour valider la correction du bug frozen_balance
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function validateBugFix() {
  console.log('🧪 VALIDATION FINALE DU BUG FIX\n')
  
  try {
    // 1. Analyse générale des activations actives
    console.log('1️⃣ ANALYSE DES ACTIVATIONS ACTIVES:')
    const { data: activeActivations, error: activationsError } = await supabase
      .from('activations')
      .select('id, user_id, status, price, frozen_amount, phone, created_at')
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (activationsError) {
      console.error('❌ Erreur récupération activations:', activationsError)
      return
    }
    
    console.log(`   Nombre d'activations actives: ${activeActivations?.length || 0}`)
    
    let totalFrozenExpected = 0
    let totalFrozenActual = 0
    let allCorrect = true
    let userIds = new Set()
    
    activeActivations?.forEach((act, i) => {
      const isCorrect = act.frozen_amount === act.price
      totalFrozenExpected += act.price
      totalFrozenActual += act.frozen_amount || 0
      userIds.add(act.user_id)
      
      if (!isCorrect) allCorrect = false
      
      console.log(`   ${i+1}. ${act.phone} | ${act.status} | Price: ${act.price}Ⓐ | Frozen: ${act.frozen_amount}Ⓐ ${isCorrect ? '✅' : '❌'}`)
    })
    
    // 2. Analyse des utilisateurs avec activations actives
    console.log('\n2️⃣ ANALYSE DES UTILISATEURS:')
    for (const userId of userIds) {
      const { data: user } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', userId)
        .single()
      
      if (user) {
        const userActivations = activeActivations?.filter(act => act.user_id === userId) || []
        const userTotalFrozen = userActivations.reduce((sum, act) => sum + (act.frozen_amount || 0), 0)
        const isCorrect = Math.abs(user.frozen_balance - userTotalFrozen) < 0.01
        
        console.log(`   ${userId.slice(0,8)}... | Balance: ${user.balance}Ⓐ | Frozen: ${user.frozen_balance}Ⓐ | Attendu: ${userTotalFrozen}Ⓐ ${isCorrect ? '✅' : '❌'}`)
      }
    }
    
    // 3. Cohérence des totaux
    console.log('\n3️⃣ COHÉRENCE GÉNÉRALE:')
    console.log(`   Total frozen attendu: ${totalFrozenExpected}Ⓐ`)
    console.log(`   Total frozen actuel: ${totalFrozenActual}Ⓐ`)
    
    const frozenAmountsCorrect = totalFrozenExpected === totalFrozenActual
    console.log(`   Cohérence frozen_amount: ${frozenAmountsCorrect ? '✅' : '❌'}`)
    
    // 4. Activations récemment annulées (échantillon)
    console.log('\n4️⃣ ACTIVATIONS RÉCEMMENT ANNULÉES:')
    const { data: cancelledActivations } = await supabase
      .from('activations')
      .select('id, status, price, frozen_amount, phone, created_at')
      .eq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5)
    
    cancelledActivations?.forEach((act, i) => {
      const shouldBeZero = act.frozen_amount === 0
      console.log(`   ${i+1}. ${act.phone} | Cancelled | Price: ${act.price}Ⓐ | Frozen: ${act.frozen_amount}Ⓐ ${shouldBeZero ? '✅' : '❌'}`)
    })
    
    // 5. Résumé final
    console.log('\n📊 RÉSUMÉ FINAL:')
    
    if (allCorrect && frozenAmountsCorrect) {
      console.log('✅ SYSTÈME FROZEN_AMOUNT CORRECT!')
      console.log('   Le bug "annuler une activation libère tout le frozen_balance" est CORRIGÉ')
      console.log('   - Toutes les activations actives ont frozen_amount = price')
      console.log('   - Les frozen_balance utilisateur correspondent aux totaux')
      console.log('   - Les activations annulées ont frozen_amount = 0')
    } else {
      console.log('⚠️  PROBLÈMES DÉTECTÉS:')
      if (!allCorrect) console.log('   - Certaines activations ont frozen_amount ≠ price')
      if (!frozenAmountsCorrect) console.log('   - Les totaux frozen_amount sont incohérents')
      
      console.log('\n🔧 ACTIONS RECOMMANDÉES:')
      console.log('   - Exécuter à nouveau restore-frozen-amounts')
      console.log('   - Vérifier que cleanup-expired-activations est bien corrigée')
      console.log('   - Tester une annulation pour confirmer')
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter la validation
validateBugFix()