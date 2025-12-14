import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
const supabaseUrl = 'https://ulsqkrdyplxzsjgmzwka.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsc3FrcmR5cGx4enNqZ216d2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTE2MjIzMSwiZXhwIjoyMDQ2NzM4MjMxfQ.B9N5_WwOLvnzCvhb1Y9HTaKCYT5FUF5pbcFCfrxm3yU'

const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function restoreCorrectFrozenAmounts() {
  console.log('🔧 RESTORATION DES FROZEN_AMOUNT CORRECTS...\n')
  
  try {
    // 1. Trouver toutes les activations actives avec frozen_amount = 0 mais qui devraient avoir frozen_amount = price
    const { data: brokenActivations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('id, user_id, price, frozen_amount, status, created_at, phone')
      .eq('frozen_amount', 0)
      .in('status', ['pending', 'waiting'])
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération:', fetchError)
      return
    }
    
    console.log(`🎯 TROUVÉ ${brokenActivations?.length || 0} activations à corriger\n`)
    
    if (!brokenActivations || brokenActivations.length === 0) {
      console.log('✅ Aucune correction nécessaire!')
      return
    }
    
    let correctedCount = 0
    let totalFrozenAdded = 0
    
    console.log('📋 CORRECTIONS EN COURS...')
    console.log('ID\t\tPhone\t\tStatus\t\tPrice → Frozen')
    console.log('─'.repeat(70))
    
    for (const activation of brokenActivations) {
      // Corriger: frozen_amount = price pour les activations actives
      const { data: updated, error: updateError } = await supabaseClient
        .from('activations')
        .update({ frozen_amount: activation.price })
        .eq('id', activation.id)
        .eq('frozen_amount', 0)  // Sécurité: seulement si toujours à 0
        .in('status', ['pending', 'waiting'])  // Sécurité: seulement si encore actif
        .select()
        .single()
      
      if (updateError) {
        console.log(`❌ ${activation.id.slice(0,8)}\t${activation.phone}\t${activation.status}\tÉCHEC: ${updateError.message}`)
      } else {
        console.log(`✅ ${activation.id.slice(0,8)}\t${activation.phone}\t${activation.status}\t${activation.price}Ⓐ → ${updated.frozen_amount}Ⓐ`)
        correctedCount++
        totalFrozenAdded += activation.price
      }
      
      // Petite pause pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📊 RÉSUMÉ:`)
    console.log(`   Activations corrigées: ${correctedCount}`)
    console.log(`   Total frozen_amount ajouté: ${totalFrozenAdded}Ⓐ`)
    
    // 2. Vérification post-correction
    console.log('\n🔍 VÉRIFICATION POST-CORRECTION...')
    
    const { data: stillBroken } = await supabaseClient
      .from('activations')
      .select('id, frozen_amount, price')
      .eq('frozen_amount', 0)
      .in('status', ['pending', 'waiting'])
    
    if (stillBroken && stillBroken.length > 0) {
      console.log(`⚠️  ${stillBroken.length} activations ont encore frozen_amount = 0`)
    } else {
      console.log('✅ Toutes les activations actives ont maintenant frozen_amount = price')
    }
    
    // 3. Calculer l'impact sur les balances utilisateur
    console.log('\n💰 IMPACT SUR LES BALANCES:')
    
    const userImpacts = new Map()
    brokenActivations.forEach(act => {
      if (!userImpacts.has(act.user_id)) {
        userImpacts.set(act.user_id, { count: 0, totalFrozen: 0 })
      }
      const impact = userImpacts.get(act.user_id)
      impact.count++
      impact.totalFrozen += act.price
    })
    
    console.log('User ID\t\t\t\t\tActivations\tTotal Frozen')
    console.log('─'.repeat(70))
    
    for (const [userId, impact] of userImpacts) {
      console.log(`${userId.slice(0,8)}...\t\t${impact.count}\t\t${impact.totalFrozen}Ⓐ`)
    }
    
    console.log(`\n✅ RESTAURATION TERMINÉE!`)
    console.log(`   Le bug "annuler une activation libère tout le frozen_balance" devrait maintenant être corrigé`)
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter
restoreCorrectFrozenAmounts()