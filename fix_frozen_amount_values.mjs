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

async function fixFrozenAmountValues() {
  console.log('🔧 FIXING FROZEN AMOUNT VALUES...\n')
  
  try {
    // 1. Vérifier toutes les activations avec frozen_amount = 0
    const { data: brokenActivations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('id, status, price, frozen_amount, created_at')
      .eq('frozen_amount', 0)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération:', fetchError)
      return
    }
    
    console.log('📊 ACTIVATIONS AVEC frozen_amount = 0:')
    console.log('ID\t\tStatus\t\tPrice\tFrozen\tDate')
    console.log('─'.repeat(80))
    
    brokenActivations?.forEach(act => {
      const date = new Date(act.created_at).toLocaleString()
      console.log(`${act.id.slice(0,8)}\t${act.status}\t\t${act.price}Ⓐ\t${act.frozen_amount}Ⓐ\t${date}`)
    })
    
    // 2. Identifier les activations qui DEVRAIENT avoir frozen_amount = price
    const activationsThatShouldBeFrozen = brokenActivations?.filter(act => 
      act.status === 'pending' || act.status === 'waiting'
    )
    
    console.log(`\n🎯 ACTIVATIONS À CORRIGER: ${activationsThatShouldBeFrozen?.length || 0}`)
    
    if (activationsThatShouldBeFrozen && activationsThatShouldBeFrozen.length > 0) {
      console.log('\n⚠️  CORRECTIONS NÉCESSAIRES:')
      
      for (const activation of activationsThatShouldBeFrozen) {
        console.log(`   ${activation.id.slice(0,8)} (${activation.status}): frozen_amount 0 → ${activation.price}Ⓐ`)
        
        // Appliquer la correction
        const { data: updated, error: updateError } = await supabaseClient
          .from('activations')
          .update({ frozen_amount: activation.price })
          .eq('id', activation.id)
          .eq('frozen_amount', 0) // Condition de sécurité
          .select()
          .single()
        
        if (updateError) {
          console.error(`❌ Erreur correction ${activation.id}:`, updateError)
        } else {
          console.log(`✅ Corrigé ${activation.id}: frozen_amount = ${updated.frozen_amount}Ⓐ`)
        }
      }
    }
    
    // 3. Vérification finale - recalculer les totaux
    console.log('\n📊 VÉRIFICATION POST-CORRECTION:')
    
    const { data: pendingActivations } = await supabaseClient
      .from('activations')
      .select('frozen_amount, price')
      .in('status', ['pending', 'waiting'])
    
    const totalShouldBeFrozen = pendingActivations?.reduce((sum, act) => sum + (act.price || 0), 0) || 0
    const totalCurrentlyFrozen = pendingActivations?.reduce((sum, act) => sum + (act.frozen_amount || 0), 0) || 0
    
    console.log(`   Total qui devrait être gelé: ${totalShouldBeFrozen}Ⓐ`)
    console.log(`   Total actuellement gelé: ${totalCurrentlyFrozen}Ⓐ`)
    console.log(`   Différence: ${totalShouldBeFrozen - totalCurrentlyFrozen}Ⓐ`)
    
    if (totalShouldBeFrozen === totalCurrentlyFrozen) {
      console.log('\n✅ PARFAIT! Tous les frozen_amount sont corrects')
    } else {
      console.log('\n⚠️  Il reste des écarts à corriger')
    }
    
    // 4. Vérifier un utilisateur spécifique
    const { data: userActivations } = await supabaseClient
      .from('activations')
      .select('id, status, price, frozen_amount')
      .eq('user_id', '55c8e843-d1dc-48e7-8dfa-b73e74c16b75')
      .in('status', ['pending', 'waiting'])
    
    if (userActivations && userActivations.length > 0) {
      console.log('\n👤 ACTIVATIONS ACTIVES UTILISATEUR:')
      userActivations.forEach(act => {
        const status = act.frozen_amount === act.price ? '✅' : '❌'
        console.log(`   ${act.id.slice(0,8)} (${act.status}): price=${act.price}Ⓐ, frozen=${act.frozen_amount}Ⓐ ${status}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter
fixFrozenAmountValues()