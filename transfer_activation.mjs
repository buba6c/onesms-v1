#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 VÉRIFICATION DU PROPRIÉTAIRE')
console.log('='.repeat(50))

try {
  // 1. Vérifier qui possède l'activation
  console.log('📊 Étape 1: Vérifier le propriétaire actuel...')
  const { data: checkData, error: checkError } = await supabase.functions.invoke('check-activation-owner', {
    body: { orderId: '4450751126' }
  })

  if (checkError) {
    console.error('❌ Erreur:', checkError)
    process.exit(1)
  }

  console.log('✅ Activation trouvée!')
  console.log('   User ID actuel:', checkData.activation.user_id)
  console.log('   Phone:', checkData.activation.phone)
  console.log('   SMS Code:', checkData.activation.sms_code)
  console.log('   Status:', checkData.activation.status)
  console.log('')

  // 2. Se connecter avec le compte du dashboard
  console.log('📊 Étape 2: Connexion avec votre compte dashboard...')
  console.log('Quel email utilisez-vous sur http://localhost:3000/dashboard ?')
  console.log('')
  console.log('Options:')
  console.log('  1. test@example.com (ID: 8249f9ea-e1bb-410d-9cbe-1931e559d72d)')
  console.log('  2. Autre email (indiquez-le)')
  console.log('')

  // Pour l'instant, testons avec l'utilisateur test
  console.log('Test avec test@example.com...')
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  if (authData.user) {
    console.log('✅ Connecté: test@example.com')
    console.log('   User ID:', authData.user.id)
    console.log('')

    if (authData.user.id !== checkData.activation.user_id) {
      console.log('⚠️  L\'activation appartient à un autre utilisateur!')
      console.log('')
      console.log('💡 SOLUTION: Transférer l\'activation à votre compte...')
      console.log('')
      
      const { data: transferData, error: transferError } = await supabase.functions.invoke('check-activation-owner', {
        body: { 
          orderId: '4450751126',
          newUserId: authData.user.id
        }
      })

      if (transferError) {
        console.error('❌ Erreur de transfert:', transferError)
      } else {
        console.log('✅ TRANSFERT RÉUSSI!')
        console.log('L\'activation est maintenant visible sur votre dashboard!')
      }
    } else {
      console.log('✅ L\'activation vous appartient déjà.')
      console.log('Rechargez le dashboard pour la voir.')
    }
  }

} catch (error) {
  console.error('❌ Erreur:', error.message)
}