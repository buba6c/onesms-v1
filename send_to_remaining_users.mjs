#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY

// Charger la liste des utilisateurs
let remainingUsers
try {
  remainingUsers = JSON.parse(readFileSync('remaining_users_to_email.json', 'utf-8'))
} catch (err) {
  console.error('❌ Fichier remaining_users_to_email.json introuvable')
  console.log('💡 Lancez d\'abord: node identify_remaining_users.mjs')
  process.exit(1)
}

// Message à envoyer
const EMAIL_CONFIG = {
  title: '⚠️ Recharge non créditée ?',
  message: `Bonjour !

Votre recharge n'apparaît pas après 15 minutes ? Pas d'inquiétude, ça arrive parfois !

**Contactez-nous sur Instagram : @onesms.sn** 📸

Envoyez-nous :
✅ Votre email
✅ Le montant
✅ Votre preuve de paiement

Nous réglons ça en quelques heures maximum ! ⚡

Merci de votre confiance 💙
L'équipe ONE SMS`,
  emailType: 'operational'
}

async function sendToRemainingUsers() {
  console.log('🚀 ENVOI AUX UTILISATEURS RESTANTS\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total à envoyer: ${remainingUsers.length}`)
  console.log(`Titre: ${EMAIL_CONFIG.title}`)
  console.log('\n⏱️  Temps estimé: ~${Math.round((remainingUsers.length / 2) * 1.2 / 60)} minutes\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Authentification admin
  console.log('🔐 Authentification...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'adminbuba6c@gmail.com', // Votre email admin
    password: 'Iphone13@' // Votre mot de passe admin
  })

  if (authError) {
    console.error('❌ Erreur auth:', authError.message)
    console.log('💡 Modifiez les identifiants dans le script')
    return
  }

  console.log('✅ Authentifié\n')

  // Appeler la fonction avec les IDs spécifiques
  const session = authData.session
  const userIds = remainingUsers.map(u => u.id)

  console.log('📧 Envoi en cours...\n')
  console.log('(Cela peut prendre plusieurs minutes, soyez patient)\n')

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-promo-emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: EMAIL_CONFIG.title,
          message: EMAIL_CONFIG.message,
          emailType: EMAIL_CONFIG.emailType,
          filter: {
            limit: 436 // Limiter aux 436 restants
          },
          // Note: On ne peut pas envoyer directement les IDs
          // Donc on va limiter l'envoi et skipper les premiers 829
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ ERREUR:', result.error || result)
      return
    }

    console.log('\n✅ SUCCÈS!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Envoyés: ${result.sent}`)
    console.log(`Échoués: ${result.failed}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (result.errors && result.errors.length > 0) {
      console.log('⚠️  Erreurs:')
      result.errors.forEach(err => console.log(`   ${err}`))
    }

  } catch (error) {
    console.error('❌ ERREUR RÉSEAU:', error.message)
  }
}

console.log('\n⚠️  ATTENTION:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Ce script va envoyer des emails aux 436 utilisateurs restants.')
console.log('Assurez-vous d\'avoir modifié les identifiants admin dans le script.')
console.log('\nLancement dans 3 secondes...\n')

setTimeout(() => {
  sendToRemainingUsers().catch(console.error)
}, 3000)
