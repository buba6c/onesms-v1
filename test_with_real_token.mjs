import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔑 Test avec un vrai token de session admin\n')

// D'abord on se connecte comme admin
const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'admin@onesms.com', // Email admin
  password: 'Admin123!' // Password admin
})

if (signInError) {
  console.error('❌ Erreur de connexion:', signInError.message)
  process.exit(1)
}

console.log('✅ Connecté comme:', authData.user.email)
console.log('🎟️ Token:', authData.session.access_token.substring(0, 30) + '...\n')

// Maintenant tester l'envoi d'email avec ce token
console.log('📧 Test envoi email...\n')

const response = await fetch(`${supabaseUrl}/functions/v1/send-promo-emails`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authData.session.access_token}`,
    'apikey': supabaseAnonKey
  },
  body: JSON.stringify({
    subject: 'Test Email',
    title: 'Test',
    message: 'Ceci est un test',
    type: 'operational',
    recipientType: 'specific',
    specificEmails: ['admin@onesms.com']
  })
})

const result = await response.json()

console.log('Status:', response.status)
console.log('Result:', JSON.stringify(result, null, 2))

// Se déconnecter
await supabase.auth.signOut()
