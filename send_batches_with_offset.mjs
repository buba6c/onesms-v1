#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Configuration de l'email
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

async function sendInBatches() {
  console.log('🚀 ENVOI PAR BATCHES AVEC OFFSET\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Authentification admin
  console.log('🔐 Authentification...')
  
  const adminEmail = process.env.ADMIN_EMAIL || 'adminbuba6c@gmail.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'VotreMotDePasse'
  
  console.log(`Tentative avec: ${adminEmail}`)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  })

  if (authError) {
    console.error('❌ Erreur auth:', authError.message)
    console.log('\n💡 Solutions:')
    console.log('   1. Ajoutez ADMIN_EMAIL et ADMIN_PASSWORD dans votre .env')
    console.log('   2. Ou connectez-vous via l\'admin panel et utilisez l\'interface web')
    return
  }

  console.log('✅ Authentifié\n')

  const session = authData.session
  
  // Compter le nombre total d'utilisateurs
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)

  console.log(`📊 Total utilisateurs: ${totalUsers}`)
  console.log(`📧 Déjà envoyés: 829`)
  console.log(`📬 Restants: ${totalUsers - 829}`)
  console.log(`\n⚙️  Configuration:`)
  console.log(`   • Batch size: 500 emails`)
  console.log(`   • Offset de départ: 829 (skip les déjà envoyés)`)
  console.log(`   • Nombre de batches: ${Math.ceil((totalUsers - 829) / 500)}`)
  console.log('\n')

  const BATCH_SIZE = 500
  const START_OFFSET = 829 // Commencer après les 829 déjà envoyés
  
  let offset = START_OFFSET
  let totalSent = 0
  let totalFailed = 0
  let batchNumber = 1

  while (offset < totalUsers) {
    const remaining = totalUsers - offset
    const batchLimit = Math.min(BATCH_SIZE, remaining)
    
    console.log(`\n📦 BATCH #${batchNumber}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`Offset: ${offset} | Limit: ${batchLimit}`)
    console.log(`Envoi en cours...`)

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
              offset: offset,
              limit: batchLimit
            },
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error(`❌ ERREUR: ${result.error || JSON.stringify(result)}`)
        break
      }

      console.log(`✅ Envoyés: ${result.sent}`)
      console.log(`❌ Échoués: ${result.failed}`)
      
      totalSent += result.sent
      totalFailed += result.failed

      if (result.errors && result.errors.length > 0) {
        console.log(`⚠️  Erreurs (3 premières):`)
        result.errors.slice(0, 3).forEach(err => console.log(`   ${err}`))
      }

      offset += batchLimit
      batchNumber++

      // Pause entre batches pour éviter de surcharger
      if (offset < totalUsers) {
        console.log('\n⏳ Pause de 5 secondes avant le prochain batch...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }

    } catch (error) {
      console.error('\n❌ ERREUR RÉSEAU:', error.message)
      console.log('Arrêt de l\'envoi')
      break
    }
  }

  console.log('\n\n✅ ENVOI TERMINÉ!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total envoyés dans cette session: ${totalSent}`)
  console.log(`Total échoués: ${totalFailed}`)
  console.log(`Total global (829 + ${totalSent}): ${829 + totalSent}`)
  console.log(`Couverture: ${Math.round(((829 + totalSent) / totalUsers) * 100)}%`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

console.log('\n⚠️  PRÊT À DÉMARRER')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Ce script va envoyer les emails restants par batches de 500')
console.log('Temps estimé: ~3-5 minutes par batch')
console.log('\nLancement dans 3 secondes...\n')

setTimeout(() => {
  sendInBatches().catch(console.error)
}, 3000)
