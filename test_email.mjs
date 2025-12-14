// Test d'envoi d'email via Supabase Edge Function
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmail() {
  try {
    console.log('📧 Test d\'envoi d\'email...')
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'recharge_success',
        email: 'support@onesms-sn.com', // Change par ton email
        data: {
          name: 'Test User',
          amount: 1000,
          balance: 5000,
          date: new Date().toLocaleString('fr-FR')
        }
      }
    })

    if (error) {
      console.error('❌ Erreur:', error)
    } else {
      console.log('✅ Email envoyé avec succès!')
      console.log('📨 Résultat:', data)
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message)
  }
}

testEmail()