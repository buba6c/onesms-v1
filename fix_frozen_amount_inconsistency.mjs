// CORRECTION URGENTE - Synchroniser frozen_amount avec frozen_balance
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixFrozenAmountInconsistency() {
  console.log('🔧 CORRECTION - Synchroniser frozen_amount avec frozen_balance')
  console.log('=' .repeat(60))

  try {
    // 1. IDENTIFIER les utilisateurs avec frozen_balance = 0 mais frozen_amount > 0
    console.log('🔍 Identification des incohérences...')
    
    // Utilisateurs avec frozen_balance = 0
    const { data: usersZeroFrozen, error: usersError } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .eq('frozen_balance', 0)

    if (usersError) throw usersError

    let totalFixed = 0
    let totalAmount = 0

    for (const user of usersZeroFrozen) {
      console.log(`\n👤 Vérification user: ${user.email}`)
      
      // Vérifier ses activations avec frozen_amount > 0
      const { data: userActivations, error: actError } = await supabase
        .from('activations')
        .select('id, status, frozen_amount, price')
        .eq('user_id', user.id)
        .gt('frozen_amount', 0)

      if (actError) {
        console.error(`❌ Erreur activations user ${user.email}:`, actError)
        continue
      }

      // Vérifier ses rentals avec frozen_amount > 0
      const { data: userRentals, error: rentError } = await supabase
        .from('rentals')
        .select('id, status, frozen_amount, price')
        .eq('user_id', user.id)
        .gt('frozen_amount', 0)

      if (rentError) {
        console.error(`❌ Erreur rentals user ${user.email}:`, rentError)
        continue
      }

      const orphanedActivations = userActivations || []
      const orphanedRentals = userRentals || []
      const totalOrphaned = orphanedActivations.length + orphanedRentals.length

      if (totalOrphaned > 0) {
        console.log(`⚠️  INCOHÉRENCE DÉTECTÉE:`)
        console.log(`   User frozen_balance: ${user.frozen_balance}Ⓐ`)
        console.log(`   Activations orphelines: ${orphanedActivations.length}`)
        console.log(`   Rentals orphelines: ${orphanedRentals.length}`)

        // CORRECTION: Reset frozen_amount sur les activations orphelines
        if (orphanedActivations.length > 0) {
          console.log(`🔧 Correction ${orphanedActivations.length} activations orphelines...`)
          
          const activationIds = orphanedActivations.map(a => a.id)
          const { error: fixActError } = await supabase
            .from('activations')
            .update({ 
              frozen_amount: 0,
              updated_at: new Date().toISOString()
            })
            .in('id', activationIds)

          if (fixActError) {
            console.error(`❌ Erreur correction activations:`, fixActError)
          } else {
            console.log(`✅ ${orphanedActivations.length} activations corrigées`)
            totalFixed += orphanedActivations.length
            totalAmount += orphanedActivations.reduce((sum, a) => sum + (a.frozen_amount || 0), 0)
          }
        }

        // CORRECTION: Reset frozen_amount sur les rentals orphelins
        if (orphanedRentals.length > 0) {
          console.log(`🔧 Correction ${orphanedRentals.length} rentals orphelins...`)
          
          const rentalIds = orphanedRentals.map(r => r.id)
          const { error: fixRentError } = await supabase
            .from('rentals')
            .update({ 
              frozen_amount: 0,
              updated_at: new Date().toISOString()
            })
            .in('id', rentalIds)

          if (fixRentError) {
            console.error(`❌ Erreur correction rentals:`, fixRentError)
          } else {
            console.log(`✅ ${orphanedRentals.length} rentals corrigés`)
            totalFixed += orphanedRentals.length
            totalAmount += orphanedRentals.reduce((sum, r) => sum + (r.frozen_amount || 0), 0)
          }
        }
      } else {
        console.log(`✅ Aucune incohérence détectée`)
      }
    }

    // 2. VÉRIFICATION finale
    console.log(`\n📊 RÉSUMÉ CORRECTION:`)
    console.log(`✅ Total items corrigés: ${totalFixed}`)
    console.log(`💰 Total montant libéré: ${totalAmount}Ⓐ`)

    // Vérifier que tout est cohérent maintenant
    console.log('\n🔍 VÉRIFICATION POST-CORRECTION...')
    
    const { data: postUsers, error: postUsersError } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .gt('frozen_balance', 0)

    const { data: postActivations, error: postActError } = await supabase
      .from('activations')
      .select('frozen_amount')
      .gt('frozen_amount', 0)

    const { data: postRentals, error: postRentError } = await supabase
      .from('rentals')
      .select('frozen_amount')
      .gt('frozen_amount', 0)

    const totalUsersFrozenAfter = postUsers?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0
    const totalActivationsFrozenAfter = postActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0
    const totalRentalsFrozenAfter = postRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0
    const totalItemsFrozenAfter = totalActivationsFrozenAfter + totalRentalsFrozenAfter

    console.log(`💰 Total frozen_balance utilisateurs: ${totalUsersFrozenAfter}Ⓐ`)
    console.log(`📱 Total frozen_amount activations: ${totalActivationsFrozenAfter}Ⓐ`)
    console.log(`🏠 Total frozen_amount rentals: ${totalRentalsFrozenAfter}Ⓐ`)
    console.log(`📊 Total frozen_amount items: ${totalItemsFrozenAfter}Ⓐ`)
    console.log(`🔍 Différence: ${totalUsersFrozenAfter - totalItemsFrozenAfter}Ⓐ`)

    if (Math.abs(totalUsersFrozenAfter - totalItemsFrozenAfter) < 0.01) {
      console.log('🎉 COHÉRENCE RESTAURÉE - frozen_balance = sum(frozen_amount)')
    } else {
      console.log('⚠️  Incohérence persiste - Investigation supplémentaire requise')
    }

    console.log('\n🎯 CORRECTION TERMINÉE')

  } catch (error) {
    console.error('❌ Erreur correction:', error)
  }
}

fixFrozenAmountInconsistency()