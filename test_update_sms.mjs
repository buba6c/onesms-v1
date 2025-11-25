#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const orderId = '4450751126'

console.log('🔄 MISE À JOUR DU SMS VIA EDGE FUNCTION')
console.log('='.repeat(50))

try {
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  console.log('✅ Authentifié')
  console.log('📞 Appel de update-activation-sms pour ordre:', orderId)
  console.log('')

  const { data, error } = await supabase.functions.invoke('update-activation-sms', {
    body: { orderId }
  })

  if (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }

  console.log('✅ SUCCÈS!')
  console.log(JSON.stringify(data, null, 2))
  console.log('')
  console.log('🎉 Le SMS devrait maintenant être visible sur la plateforme!')

} catch (error) {
  console.error('❌ Erreur:', error.message)
}