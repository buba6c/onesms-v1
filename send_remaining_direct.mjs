#!/usr/bin/env node
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config()

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
L'équipe ONE SMS`
}

// Template HTML
const generateEmailHTML = (userName, userEmail, title, message) => {
  const style = { color: '#ef4444', bgColor: '#ef444414' }
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f5f5f5">
<div style="max-width:600px;margin:0 auto;padding:20px">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden">
<tr>
<td style="background-color:#3B82F6;padding:24px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:normal">One SMS</h1>
<p style="margin:8px 0 0;color:#dbeafe;font-size:14px">Service de reception SMS temporaires</p>
</td>
</tr>
<tr>
<td style="padding:32px 24px">
<p style="margin:0 0 16px;color:#000000;font-size:16px">Bonjour ${userName},</p>
<p style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.6;white-space:pre-wrap">${message}</p>
<div style="background-color:${style.bgColor};border-left:4px solid ${style.color};padding:16px;margin:24px 0">
<p style="margin:0;color:${style.color};font-size:16px;font-weight:bold">${title}</p>
</div>
<div style="text-align:center;margin:32px 0">
<a href="https://onesms-sn.com/dashboard" style="display:inline-block;background-color:#3B82F6;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:4px;font-size:16px;font-weight:bold">Acceder a mon compte</a>
</div>
<p style="margin:24px 0 8px;color:#666666;font-size:13px">Merci de votre confiance.</p>
<p style="margin:0;color:#666666;font-size:13px">L'equipe One SMS</p>
</td>
</tr>
<tr>
<td style="background-color:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb">
<p style="margin:0;color:#666666;font-size:12px">One SMS - Service de reception SMS</p>
<p style="margin:8px 0;color:#666666;font-size:12px">support@onesms-sn.com - Dakar, Senegal</p>
<p style="margin:12px 0 0;color:#999999;font-size:11px">
<a href="https://onesms-sn.com/unsubscribe?email=${encodeURIComponent(userEmail)}" style="color:#999999;text-decoration:underline">Se desinscrire</a>
</p>
</td>
</tr>
</table>
</div>
</body>
</html>
`
}

async function sendDirectViaResend() {
  console.log('🚀 ENVOI DIRECT VIA RESEND API\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total à envoyer: ${remainingUsers.length}`)
  console.log(`Titre: ${EMAIL_CONFIG.title}`)
  console.log(`⏱️  Temps estimé: ~${Math.round((remainingUsers.length / 2) * 1.2 / 60)} minutes\n`)

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY manquante dans .env')
    return
  }

  const results = { sent: 0, failed: 0, errors: [] }
  const batchSize = 2 // 2 emails par seconde

  console.log('📧 Envoi en cours...\n')

  for (let i = 0; i < remainingUsers.length; i += batchSize) {
    const batch = remainingUsers.slice(i, i + batchSize)
    
    await Promise.all(batch.map(async (user) => {
      try {
        const userName = user.name || user.email?.split('@')[0] || 'Client'
        const htmlContent = generateEmailHTML(userName, user.email, EMAIL_CONFIG.title, EMAIL_CONFIG.message)
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'support@onesms-sn.com',
            to: user.email,
            subject: `${EMAIL_CONFIG.title} - One SMS`,
            html: htmlContent,
          }),
        })

        if (response.ok) {
          results.sent++
          process.stdout.write(`✅ ${results.sent}/${remainingUsers.length} `)
        } else {
          results.failed++
          const error = await response.text()
          results.errors.push(`${user.email}: ${error}`)
          process.stdout.write(`❌ `)
        }
      } catch (err) {
        results.failed++
        results.errors.push(`${user.email}: ${err.message}`)
        process.stdout.write(`❌ `)
      }
    }))

    // Délai entre batches (1.2s = 2 emails/sec max)
    if (i + batchSize < remainingUsers.length) {
      await new Promise(resolve => setTimeout(resolve, 1200))
    }
  }

  console.log('\n\n✅ TERMINÉ!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Envoyés: ${results.sent}`)
  console.log(`❌ Échoués: ${results.failed}`)
  console.log(`📊 Total Resend (829 + ${results.sent}): ${829 + results.sent}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (results.errors.length > 0) {
    console.log('⚠️  Erreurs (10 premières):')
    results.errors.slice(0, 10).forEach(err => console.log(`   ${err}`))
  }
}

console.log('\n⚠️  PRÊT À ENVOYER')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`${remainingUsers.length} emails seront envoyés aux utilisateurs restants`)
console.log('Lancement dans 3 secondes...\n')

setTimeout(() => {
  sendDirectViaResend().catch(console.error)
}, 3000)
