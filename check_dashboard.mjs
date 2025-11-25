#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 VÉRIFICATION DU DASHBOARD')
console.log('='.repeat(50))

try {
  // Authentifier avec l'utilisateur de test
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  if (authError) {
    console.error('❌ Erreur d\'authentification:', authError.message)
    process.exit(1)
  }

  const user = authData.user
  console.log('✅ Authentifié')
  console.log('👤 User ID:', user.id)
  console.log('📧 Email:', user.email)
  console.log('')

  // Récupérer TOUTES les activations de cet utilisateur
  console.log('📊 Récupération des activations de l\'utilisateur...')
  const { data: activations, error: activationsError } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (activationsError) {
    console.error('❌ Erreur:', activationsError.message)
  } else {
    console.log(`📈 Trouvé ${activations.length} activations pour cet utilisateur`)
    console.log('')

    if (activations.length === 0) {
      console.log('⚠️  AUCUNE ACTIVATION TROUVÉE!')
      console.log('Le dashboard sera vide.')
    } else {
      activations.forEach((act, i) => {
        console.log(`${i + 1}. 📞 ${act.phone} (${act.order_id})`)
        console.log(`   Status: ${act.status}`)
        console.log(`   SMS Code: ${act.sms_code || 'Aucun'}`)
        console.log(`   Service: ${act.service_code}`)
        console.log(`   Created: ${act.created_at}`)
        console.log('')
      })
    }
  }

  // Vérifier spécifiquement l'activation 4450751126
  console.log('🔍 Vérification spécifique de l\'activation 4450751126...')
  const { data: specific, error: specificError } = await supabase
    .from('activations')
    .select('*')
    .eq('order_id', '4450751126')
    .single()

  if (specificError) {
    console.error('❌ Non trouvée avec cet utilisateur:', specificError.message)
    
    // Vérifier avec le service role key
    console.log('')
    console.log('🔑 Vérification avec admin access...')
    console.log('   (pour voir si l\'activation existe mais appartient à un autre user)')
  } else if (specific) {
    console.log('✅ Activation trouvée!')
    console.log('   User ID:', specific.user_id)
    console.log('   Phone:', specific.phone)
    console.log('   SMS Code:', specific.sms_code)
    console.log('   Status:', specific.status)
    
    if (specific.user_id !== user.id) {
      console.log('')
      console.log('⚠️  PROBLÈME: Cette activation appartient à un autre utilisateur!')
      console.log('   Activation User ID:', specific.user_id)
      console.log('   Votre User ID:', user.id)
    }
  }

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}