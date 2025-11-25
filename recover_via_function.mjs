#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const orderId = '4450751126'
const phoneNumber = '6283187992499'

console.log('🔄 RÉCUPÉRATION DU SMS VIA EDGE FUNCTION')
console.log('='.repeat(50))

try {
  // Authentifier
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  console.log('✅ Authentifié')
  console.log('')
  console.log('📞 Appel de la fonction recover-sms-from-history...')
  console.log('   Order ID:', orderId)
  console.log('   Phone:', phoneNumber)
  console.log('')

  const { data, error } = await supabase.functions.invoke('recover-sms-from-history', {
    body: {
      orderId: orderId,
      phone: phoneNumber
    }
  })

  if (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }

  console.log('✅ Résultat:')
  console.log(JSON.stringify(data, null, 2))

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}