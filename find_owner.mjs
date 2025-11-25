#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 RECHERCHE DU PROPRIÉTAIRE DE L\'ACTIVATION')
console.log('='.repeat(50))

try {
  // Appeler la fonction Edge pour obtenir les détails avec service role key
  const { data, error } = await supabase.functions.invoke('update-activation-sms', {
    body: { orderId: '4450751126', onlyCheck: true }
  })

  if (error) {
    console.error('❌ Erreur:', error)
  }

  // Alternative: créer une Edge Function pour lister tous les users
  console.log('📊 Appel de fonction pour récupérer les infos...')
  
  // Pour l'instant, vérifions tous les utilisateurs possibles
  const testUsers = [
    { email: 'test@example.com', password: 'testpassword123' },
    { email: 'admin@example.com', password: 'admin123' },
  ]

  for (const testUser of testUsers) {
    console.log(`\n🔑 Test avec ${testUser.email}...`)
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(testUser)
    
    if (!authError && authData.user) {
      console.log(`✅ Connecté: ${authData.user.id}`)
      
      const { data: activation } = await supabase
        .from('activations')
        .select('*')
        .eq('order_id', '4450751126')
        .single()
      
      if (activation) {
        console.log(`🎯 TROUVÉ! Cette activation appartient à ${testUser.email}`)
        console.log(`   User ID: ${authData.user.id}`)
        console.log(`   Phone: ${activation.phone}`)
        console.log(`   SMS Code: ${activation.sms_code}`)
        break
      }
    }
  }

  console.log('\n💡 SOLUTION:')
  console.log('Connectez-vous sur le dashboard avec le bon compte,')
  console.log('OU transférez l\'activation au bon utilisateur.')

} catch (error) {
  console.error('❌ Erreur:', error.message)
}