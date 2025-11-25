#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 VÉRIFICATION ADMIN - BYPASS RLS')
console.log('='.repeat(60))

try {
  // Appeler la fonction Edge pour vérifier (avec service role key)
  console.log('📊 Vérification de l\'activation 4450751126 avec admin access...')
  
  const { data, error } = await supabase.functions.invoke('check-activation-owner', {
    body: { orderId: '4450751126' }
  })

  if (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }

  console.log('✅ Activation trouvée!')
  console.log('')
  console.log('📊 DÉTAILS:')
  console.log('   ID:', data.activation.id)
  console.log('   User ID actuel:', data.activation.user_id)
  console.log('   Phone:', data.activation.phone)
  console.log('   Order ID:', data.activation.order_id)
  console.log('   SMS Code:', data.activation.sms_code)
  console.log('   Status:', data.activation.status)
  console.log('   Created:', data.activation.created_at)
  console.log('')

  const expectedUserId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  
  if (data.activation.user_id !== expectedUserId) {
    console.log('⚠️  Le transfert a échoué!')
    console.log('   User ID attendu:', expectedUserId)
    console.log('   User ID actuel:', data.activation.user_id)
    console.log('')
    console.log('🔄 Nouveau transfert...')
    
    const { data: transferData, error: transferError } = await supabase.functions.invoke('check-activation-owner', {
      body: { 
        orderId: '4450751126',
        newUserId: expectedUserId
      }
    })

    if (transferError) {
      console.error('❌ Erreur de transfert:', transferError)
    } else {
      console.log('✅ TRANSFERT RÉUSSI!')
      console.log('   Nouveau User ID:', transferData.activation.user_id)
    }
  } else {
    console.log('✅ L\'activation appartient au bon utilisateur')
    console.log('')
    console.log('🔍 Problème probable: RLS (Row Level Security)')
    console.log('   Les policies RLS empêchent peut-être l\'accès')
  }

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}