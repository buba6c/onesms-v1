#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔄 CORRECTION DU STATUS')
console.log('='.repeat(60))

try {
  console.log('📞 Mise à jour du status de "completed" vers "received"...')
  
  const { data, error } = await supabase.functions.invoke('update-activation-sms', {
    body: { orderId: '4450751126' }
  })

  if (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }

  console.log('✅ Activation mise à jour:')
  console.log('   Phone:', data.activation.phone)
  console.log('   SMS Code:', data.activation.sms_code)
  console.log('   Status:', data.activation.status)
  console.log('')
  console.log('🎉 L\'activation devrait maintenant être visible sur le dashboard!')

} catch (error) {
  console.error('❌ Erreur:', error.message)
}