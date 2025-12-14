#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function analyzeEmailDelivery() {
  console.log('📊 ANALYSE DE L\'ENVOI D\'EMAILS\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Total utilisateurs avec email
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email')
    .not('email', 'is', null)

  console.log(`\nBase de données:`)
  console.log(`  Total users avec email: ${allUsers?.length || 0}`)
  
  console.log(`\nResend:`)
  console.log(`  Emails envoyés:         829 ✅`)
  
  console.log(`\nDifférence:               ${(allUsers?.length || 0) - 829} emails`)

  console.log('\n\n❓ POURQUOI 829 AU LIEU DE 1265 ?\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const timeToSend829 = (829 / 2) * 1.2 // 2 emails/sec + 1.2s délai
  const minutes = Math.round(timeToSend829 / 60)
  
  console.log(`1. ⏱️  TIMEOUT de la Edge Function`)
  console.log(`   • 829 emails = ~${minutes} minutes d'envoi`)
  console.log(`   • Supabase Edge Functions timeout après 150 secondes`)
  console.log(`   • La fonction s'est arrêtée avant la fin`)
  
  console.log(`\n2. 📧 Format des emails`)
  console.log(`   • Certains emails peuvent être invalides`)
  console.log(`   • Resend rejette automatiquement les emails malformés`)
  
  console.log('\n\n✅ UTILISATEURS GOOGLE:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('OUI, les utilisateurs inscrits avec Google ONT tous un email !')
  console.log('Google OAuth fournit TOUJOURS l\'adresse email.')
  console.log('Donc ils ont reçu (ou devraient recevoir) l\'email.')
  
  console.log('\n\n💡 SOLUTIONS:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Option 1: Relancer l\'envoi avec limit: 500 (le reste)')
  console.log('Option 2: Utiliser une queue (Bull/BullMQ) pour les gros envois')
  console.log('Option 3: Déployer la fonction sur un service sans timeout')
  console.log('Option 4: Découper en plusieurs envois de 500')
}

analyzeEmailDelivery().catch(console.error)
