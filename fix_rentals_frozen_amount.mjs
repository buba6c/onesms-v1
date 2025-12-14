import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function fixRentalsFrozenAmount() {
  console.log('🔧 CORRECTION DES FROZEN_AMOUNT DES RENTALS ACTIFS\n')
  console.log('='.repeat(70))
  
  try {
    // 1. Trouver tous les rentals actifs avec frozen_amount = 0
    const { data: brokenRentals, error: fetchError } = await supabase
      .from('rentals')
      .select('id, user_id, phone, total_cost, frozen_amount, status, created_at')
      .eq('status', 'active')
      .eq('frozen_amount', 0)
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération:', fetchError)
      return
    }
    
    console.log(`\n📊 RENTALS ACTIFS AVEC frozen_amount = 0: ${brokenRentals?.length || 0}\n`)
    
    if (!brokenRentals || brokenRentals.length === 0) {
      console.log('✅ Aucune correction nécessaire!')
      return
    }
    
    console.log('ID\t\tPhone\t\tTotal Cost\tFrozen Amount')
    console.log('─'.repeat(70))
    
    brokenRentals.forEach(rent => {
      console.log(`${rent.id.slice(0,8)}\t${rent.phone}\t${rent.total_cost}\t\t${rent.frozen_amount}`)
    })
    
    console.log('\n' + '='.repeat(70))
    console.log('\n🔧 CORRECTIONS EN COURS...\n')
    
    let correctedCount = 0
    let totalFrozenAdded = 0
    const errors = []
    
    for (const rental of brokenRentals) {
      try {
        // Corriger: frozen_amount = total_cost pour les rentals actifs
        const { data: updated, error: updateError } = await supabase
          .from('rentals')
          .update({ frozen_amount: rental.total_cost })
          .eq('id', rental.id)
          .eq('frozen_amount', 0)  // Sécurité
          .eq('status', 'active')  // Double sécurité
          .select()
          .single()
        
        if (updateError) {
          errors.push(`${rental.id}: ${updateError.message}`)
          console.log(`❌ ${rental.id.slice(0,8)}\t${rental.phone}\tÉCHEC: ${updateError.message}`)
        } else {
          correctedCount++
          totalFrozenAdded += rental.total_cost
          console.log(`✅ ${rental.id.slice(0,8)}\t${rental.phone}\t${rental.total_cost}Ⓐ → ${updated.frozen_amount}Ⓐ`)
        }
      } catch (error) {
        errors.push(`${rental.id}: ${error.message}`)
        console.error(`❌ Erreur processing ${rental.id}:`, error)
      }
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n📊 RÉSUMÉ:\n')
    console.log(`   Rentals corrigés: ${correctedCount}`)
    console.log(`   Total frozen_amount ajouté: ${totalFrozenAdded.toFixed(2)}Ⓐ`)
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Erreurs (${errors.length}):`)
      errors.forEach(err => console.log(`   - ${err}`))
    }
    
    // 2. Recalculer le frozen_balance total pour chaque utilisateur affecté
    console.log('\n' + '='.repeat(70))
    console.log('\n💰 RECALCUL DES FROZEN_BALANCE UTILISATEURS\n')
    
    const userIds = new Set(brokenRentals.map(r => r.user_id))
    
    for (const userId of userIds) {
      // Calculer le total des frozen_amount pour cet utilisateur
      const { data: userActivations } = await supabase
        .from('activations')
        .select('frozen_amount')
        .eq('user_id', userId)
        .in('status', ['pending', 'waiting'])
      
      const { data: userRentals } = await supabase
        .from('rentals')
        .select('frozen_amount')
        .eq('user_id', userId)
        .eq('status', 'active')
      
      const totalActivationsFrozen = userActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0
      const totalRentalsFrozen = userRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0
      const totalFrozen = totalActivationsFrozen + totalRentalsFrozen
      
      // Mettre à jour le frozen_balance de l'utilisateur
      const { data: currentUser } = await supabase
        .from('users')
        .select('frozen_balance')
        .eq('id', userId)
        .single()
      
      console.log(`\n👤 Utilisateur ${userId.slice(0,8)}...`)
      console.log(`   Activations frozen: ${totalActivationsFrozen}Ⓐ`)
      console.log(`   Rentals frozen: ${totalRentalsFrozen}Ⓐ`)
      console.log(`   Total calculé: ${totalFrozen}Ⓐ`)
      console.log(`   frozen_balance actuel: ${currentUser?.frozen_balance}Ⓐ`)
      
      if (Math.abs(totalFrozen - (currentUser?.frozen_balance || 0)) >= 0.01) {
        console.log(`   ⚠️  INCOHÉRENCE: Mise à jour nécessaire`)
        
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ frozen_balance: totalFrozen })
          .eq('id', userId)
        
        if (updateUserError) {
          console.log(`   ❌ Erreur mise à jour: ${updateUserError.message}`)
        } else {
          console.log(`   ✅ frozen_balance mis à jour: ${currentUser?.frozen_balance} → ${totalFrozen}Ⓐ`)
        }
      } else {
        console.log(`   ✅ frozen_balance déjà cohérent`)
      }
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('\n✅ CORRECTION TERMINÉE!\n')
    
    // 3. Vérification finale
    const { data: stillBroken } = await supabase
      .from('rentals')
      .select('id')
      .eq('status', 'active')
      .eq('frozen_amount', 0)
    
    if (stillBroken && stillBroken.length > 0) {
      console.log(`⚠️  ${stillBroken.length} rentals ont encore frozen_amount = 0`)
    } else {
      console.log('🎉 Tous les rentals actifs ont maintenant frozen_amount = total_cost')
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter la correction
fixRentalsFrozenAmount()
