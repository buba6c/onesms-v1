#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function testPromoEmailFunction() {
  console.log('🧪 Test de la fonction send-promo-emails\n')
  
  // 1. Se connecter en tant qu'admin
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@onesms-sn.com', // Remplacer par votre email admin
    password: 'votre_mot_de_passe' // Remplacer par votre mot de passe
  })

  if (authError) {
    console.error('❌ Erreur d\'authentification:', authError.message)
    console.log('\n💡 Veuillez modifier le script avec vos identifiants admin')
    return
  }

  console.log('✅ Authentifié en tant que:', authData.user.email)
  
  const session = authData.session
  if (!session?.access_token) {
    console.error('❌ Pas de session/token')
    return
  }

  // 2. Tester l'appel à la fonction avec LIMIT 2 (test)
  console.log('\n📧 Envoi d\'un email de test à 2 utilisateurs...\n')

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
          title: '⚠️ Recharge non créditée ?',
          message: 'Bonjour !\n\nVotre recharge n\'apparaît pas après 15 minutes ? Pas d\'inquiétude, ça arrive parfois !\n\nContactez-nous sur Instagram : @onesms.sn 📸\n\nEnvoyez-nous :\n✅ Votre email\n✅ Le montant\n✅ Votre preuve de paiement\n\nNous réglons ça en quelques heures maximum ! ⚡',
          emailType: 'operational',
          filter: {
            limit: 2 // TEST avec seulement 2 emails
          },
        }),
      }
    )

    console.log('Status:', response.status, response.statusText)
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('\n❌ ERREUR:')
      console.error('Code:', response.status)
      console.error('Message:', result.error || result)
      console.error('Details:', JSON.stringify(result, null, 2))
      
      if (response.status === 401) {
        console.log('\n💡 Problème d\'authentification - vérifiez que:')
        console.log('   1. Vous êtes bien admin')
        console.log('   2. Le token est valide')
      }
      if (response.status === 403) {
        console.log('\n💡 Problème de permissions - vérifiez que:')
        console.log('   1. Votre compte a le role "admin"')
        console.log('   2. La fonction vérifie bien le role')
      }
      return
    }

    console.log('\n✅ SUCCÈS!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Total destinataires: ${result.total}`)
    console.log(`✅ Envoyés:         ${result.sent}`)
    console.log(`❌ Échoués:         ${result.failed}`)
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Erreurs:')
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`)
      })
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // 3. Vérifier que la campagne est loguée
    console.log('📊 Vérification des campagnes...')
    const { data: campaigns } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (campaigns && campaigns.length > 0) {
      const latest = campaigns[0]
      console.log(`✅ Dernière campagne: ${latest.name}`)
      console.log(`   ${latest.sent_count}/${latest.total_recipients} envoyés`)
    }

  } catch (error) {
    console.error('\n❌ ERREUR RÉSEAU:', error.message)
    console.log('\n💡 Vérifiez que:')
    console.log('   1. La fonction send-promo-emails est déployée')
    console.log('   2. VITE_SUPABASE_URL est correct dans .env')
    console.log('   3. Votre connexion internet fonctionne')
  }
}

console.log('⚠️  IMPORTANT: Modifiez l\'email et le mot de passe admin dans le script avant de lancer!\n')
testPromoEmailFunction().catch(console.error)
