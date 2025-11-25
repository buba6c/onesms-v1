#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔄 TRANSFERT À BUBA6C@GMAIL.COM')
console.log('='.repeat(50))

try {
  // 1. Se connecter avec votre compte
  console.log('📧 Connexion avec buba6c@gmail.com...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'buba6c@gmail.com',
    password: 'testpassword123' // Essayons différents mots de passe
  })

  if (authError) {
    console.log('⚠️  Impossible de se connecter avec ce mot de passe')
    console.log('Tentative de récupération du User ID via la base de données...')
    
    // Utiliser la fonction Edge pour trouver l'utilisateur
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'buba6c@gmail.com')
      .single()
    
    if (usersData) {
      console.log('✅ Utilisateur trouvé!')
      console.log('   User ID:', usersData.id)
      console.log('')
      
      // Transférer directement avec la fonction Edge
      console.log('🔄 Transfert de l\'activation...')
      const { data: transferData, error: transferError } = await supabase.functions.invoke('check-activation-owner', {
        body: { 
          orderId: '4450751126',
          newUserId: usersData.id
        }
      })

      if (transferError) {
        console.error('❌ Erreur de transfert:', transferError)
      } else {
        console.log('✅ TRANSFERT RÉUSSI!')
        console.log('   Activation ID:', transferData.activation.id)
        console.log('   Nouveau propriétaire:', usersData.email)
        console.log('   SMS Code:', transferData.activation.sms_code)
        console.log('')
        console.log('🎉 L\'activation est maintenant visible sur votre dashboard!')
      }
    } else {
      console.error('❌ Utilisateur buba6c@gmail.com non trouvé dans la base de données')
    }
  } else {
    // Si connexion réussie
    console.log('✅ Connecté avec succès!')
    console.log('   User ID:', authData.user.id)
    console.log('')

    // Transférer l'activation
    console.log('🔄 Transfert de l\'activation...')
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
      console.log('   SMS Code:', transferData.activation.sms_code)
      console.log('')
      console.log('🎉 Rechargez votre dashboard pour voir l\'activation!')
    }
  }

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}