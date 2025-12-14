import { createClient } from '@supabase/supabase-js'

// Configuration Supabase avec la clé service_role pour les tests
const supabaseUrl = 'https://ulsqkrdyplxzsjgmzwka.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsc3FrcmR5cGx4enNqZ216d2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTE2MjIzMSwiZXhwIjoyMDQ2NzM4MjMxfQ.B9N5_WwOLvnzCvhb1Y9HTaKCYT5FUF5pbcFCfrxm3yU'

async function testActivationCreation() {
  console.log('🧪 TEST: Vérification de la création d\'activation avec frozen_amount\n')
  
  // Simuler un appel à la fonction buy-sms-activate-number
  const testData = {
    country: 'TG',
    service: 'telegram',
    operator: 'any'
  }
  
  const userId = '55c8e843-d1dc-48e7-8dfa-b73e74c16b75'
  
  try {
    console.log('📞 Appel de la fonction buy-sms-activate-number...')
    
    const response = await fetch('https://ulsqkrdyplxzsjgmzwka.supabase.co/functions/v1/buy-sms-activate-number', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        ...testData,
        user_id: userId
      })
    })
    
    const result = await response.json()
    console.log('📊 Réponse de la fonction:', JSON.stringify(result, null, 2))
    
    if (result.success && result.data.activation) {
      const activationId = result.data.activation.id
      console.log(`\n🎯 Activation créée: ${activationId}`)
      
      // Vérifier immédiatement les valeurs dans la base
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: activation, error } = await supabaseClient
        .from('activations')
        .select('id, price, frozen_amount, status, created_at')
        .eq('id', activationId)
        .single()
      
      if (error) {
        console.error('❌ Erreur lors de la récupération:', error)
      } else {
        console.log('\n📋 DONNÉES DANS LA BASE:')
        console.log(`   ID: ${activation.id}`)
        console.log(`   Price: ${activation.price}Ⓐ`)
        console.log(`   Frozen Amount: ${activation.frozen_amount}Ⓐ`)
        console.log(`   Status: ${activation.status}`)
        console.log(`   Created: ${activation.created_at}`)
        
        if (activation.frozen_amount === activation.price) {
          console.log('\n✅ SUCCÈS: frozen_amount = price !')
        } else {
          console.log('\n❌ PROBLÈME: frozen_amount ≠ price')
          console.log(`   Attendu: ${activation.price}`)
          console.log(`   Trouvé: ${activation.frozen_amount}`)
        }
      }
    } else {
      console.log('\n❌ Échec de la création d\'activation')
      if (result.error) {
        console.log(`   Erreur: ${result.error}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    
    // Si erreur réseau, testons directement la base
    console.log('\n🔄 Test direct de la base de données...')
    
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      })
      
      // Regarder les dernières activations créées
      const { data: recentActivations, error: dbError } = await supabaseClient
        .from('activations')
        .select('id, price, frozen_amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (dbError) {
        console.error('❌ Erreur DB:', dbError)
      } else {
        console.log('📊 3 DERNIÈRES ACTIVATIONS:')
        recentActivations?.forEach((act, i) => {
          const match = act.frozen_amount === act.price ? '✅' : '❌'
          console.log(`   ${i+1}. ${act.id.slice(0,8)} | ${act.status} | ${act.price}Ⓐ → ${act.frozen_amount}Ⓐ ${match}`)
        })
      }
    } catch (dbError) {
      console.error('❌ Erreur test DB:', dbError.message)
    }
  }
}

// Exécuter le test
testActivationCreation()