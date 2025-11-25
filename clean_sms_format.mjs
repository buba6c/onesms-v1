#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🧹 NETTOYAGE DES SMS FORMAT STATUS_OK:')
console.log('='.repeat(60))

try {
  console.log('🔄 Re-récupération du SMS pour l\'activation 4450751126...')
  
  const { data, error } = await supabase.functions.invoke('update-activation-sms', {
    body: { orderId: '4450751126' }
  })

  if (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }

  console.log('✅ SMS nettoyé!')
  console.log('   Phone:', data.activation.phone)
  console.log('   SMS Code (propre):', data.activation.sms_code)
  console.log('   Status:', data.activation.status)
  console.log('')
  console.log('🎉 Le SMS s\'affiche maintenant correctement:')
  console.log(`   "Votre code de validation whatsapp est ${data.activation.sms_code}"`)
  console.log('')
  console.log('✅ Rechargez le dashboard pour voir le changement!')

} catch (error) {
  console.error('❌ Erreur:', error.message)
}