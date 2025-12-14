// CORRECTION MANUELLE DU PHANTOM FROZEN
// En utilisant le système existant et en ajustant pour le système sécurisé

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🛠️ CORRECTION MANUELLE PHANTOM FROZEN')
console.log('=' .repeat(45))

async function manualCorrection() {
  try {
    console.log('\n📊 1. ÉTAT ACTUEL')
    console.log('-'.repeat(20))
    
    // État actuel
    const { data: buba } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    console.log(`👤 Buba6c:`)
    console.log(`  • Balance: ${buba.balance}Ⓐ`)
    console.log(`  • Frozen: ${buba.frozen_balance}Ⓐ`)
    
    // Calculer ce que frozen_balance DEVRAIT être
    const { data: activeActivations } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', buba.id)
      .in('status', ['pending', 'waiting'])
    
    const { data: activeRentals } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .eq('user_id', buba.id)
      .eq('status', 'active')
    
    const activationFrozen = (activeActivations || []).reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
    const rentalFrozen = (activeRentals || []).reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
    const expectedFrozen = activationFrozen + rentalFrozen
    
    console.log(`\n📊 CALCUL CORRECT:`)
    console.log(`  • Frozen activations: ${activationFrozen}Ⓐ`)
    console.log(`  • Frozen rentals: ${rentalFrozen}Ⓐ`)
    console.log(`  • Total attendu: ${expectedFrozen}Ⓐ`)
    console.log(`  • Phantom à corriger: ${buba.frozen_balance - expectedFrozen}Ⓐ`)
    
    if (Math.abs(buba.frozen_balance - expectedFrozen) > 0.01) {
      console.log('\n🔧 2. CORRECTION DIRECTE')
      console.log('-'.repeat(25))
      
      // Correction directe de la balance
      const { error: updateError } = await supabase
        .from('users')
        .update({ frozen_balance: expectedFrozen })
        .eq('id', buba.id)
      
      if (updateError) {
        console.error('❌ Erreur correction:', updateError.message)
        return
      }
      
      console.log('✅ frozen_balance corrigé!')
      console.log(`  • Ancien: ${buba.frozen_balance}Ⓐ`)
      console.log(`  • Nouveau: ${expectedFrozen}Ⓐ`)
      
      // Essayer de logger avec les types acceptés
      console.log('\n📝 3. TENTATIVE LOGGING')
      console.log('-'.repeat(25))
      
      try {
        const { error: logError } = await supabase
          .from('balance_operations')
          .insert({
            user_id: buba.id,
            operation_type: 'refund', // Type existant connu
            amount: buba.frozen_balance - expectedFrozen,
            balance_before: buba.balance,
            balance_after: buba.balance,
            frozen_before: buba.frozen_balance,
            frozen_after: expectedFrozen,
            reason: 'Manual phantom frozen correction - secure system alignment',
            metadata: {
              correction_type: 'phantom_cleanup',
              system: 'secure_frozen_balance_migration',
              old_frozen: buba.frozen_balance,
              new_frozen: expectedFrozen,
              activation_frozen: activationFrozen,
              rental_frozen: rentalFrozen
            }
          })
        
        if (logError) {
          console.log(`⚠️ Logging échoué: ${logError.message}`)
        } else {
          console.log('✅ Opération loggée avec succès')
        }
      } catch (logException) {
        console.log(`⚠️ Exception logging: ${logException.message}`)
      }
      
      // Vérifier le résultat
      console.log('\n✅ 4. VÉRIFICATION POST-CORRECTION')
      console.log('-'.repeat(35))
      
      const { data: bubaAfter } = await supabase
        .from('users')
        .select('frozen_balance')
        .eq('id', buba.id)
        .single()
      
      console.log(`📊 Nouveau frozen_balance: ${bubaAfter.frozen_balance}Ⓐ`)
      
      // Test vue health
      try {
        const { data: health } = await supabase
          .from('v_frozen_balance_health')
          .select('*')
          .eq('user_id', buba.id)
          .single()
        
        if (health) {
          console.log(`📊 Health status: ${health.health_status}`)
          console.log(`📊 Discrepancy: ${health.discrepancy}Ⓐ`)
          
          if (health.health_status === 'OK') {
            console.log('🎉 SUCCÈS: Système maintenant cohérent!')
          }
        } else {
          console.log('ℹ️ Plus de frozen balance - parfaitement normal')
        }
      } catch (healthError) {
        console.log(`⚠️ Vue health: ${healthError.message}`)
      }
      
    } else {
      console.log('✅ Aucune correction nécessaire - système déjà cohérent')
    }
    
    console.log('\n🎯 5. RECOMMANDATIONS')
    console.log('-'.repeat(22))
    console.log('✅ Migration vers système sécurisé recommandée')
    console.log('✅ Utiliser secure_freeze_balance() pour nouveaux achats')
    console.log('✅ Utiliser secure_unfreeze_balance() pour refunds')
    console.log('✅ Monitorer avec v_frozen_balance_health régulièrement')
    
  } catch (error) {
    console.error('💥 Erreur correction manuelle:', error.message)
  }
}

manualCorrection()