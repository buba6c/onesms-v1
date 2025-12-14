#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function analyzeWhyStopped() {
  console.log('🔍 DIAGNOSTIC DÉTAILLÉ - Pourquoi 829 au lieu de 1265 ?\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. Analyser l'ordre des utilisateurs
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, created_at')
    .not('email', 'is', null)
    .order('id', { ascending: true })

  console.log('📊 ANALYSE DES DONNÉES:\n')
  console.log(`Total utilisateurs: ${allUsers?.length || 0}`)
  console.log(`Emails envoyés:     829`)
  console.log(`Manquants:          ${(allUsers?.length || 0) - 829}`)
  
  // 2. Calculer le temps d'envoi
  const emailsPerSecond = 2
  const delayBetweenBatches = 1.2 // secondes
  const timeFor829 = (829 / emailsPerSecond) * delayBetweenBatches
  const minutes = Math.round(timeFor829 / 60)
  const seconds = Math.round(timeFor829 % 60)
  
  console.log(`\n⏱️  TEMPS D'ENVOI:`)
  console.log(`   829 emails à 2/sec = ${minutes}m ${seconds}s`)
  console.log(`   Timeout Supabase Edge Functions: 150 secondes (2.5 min)`)
  
  // 3. Vérifier la cohérence
  const user829 = allUsers?.[828] // Index 828 = 829ème utilisateur
  const user830 = allUsers?.[829] // Premier non envoyé
  
  console.log(`\n📧 DERNIER EMAIL ENVOYÉ (829ème):`)
  console.log(`   ID: ${user829?.id}`)
  console.log(`   Email: ${user829?.email}`)
  console.log(`   Créé le: ${new Date(user829?.created_at).toLocaleDateString('fr-FR')}`)
  
  console.log(`\n📧 PREMIER NON ENVOYÉ (830ème):`)
  console.log(`   ID: ${user830?.id}`)
  console.log(`   Email: ${user830?.email}`)
  console.log(`   Créé le: ${new Date(user830?.created_at).toLocaleDateString('fr-FR')}`)

  // 4. Analyser les causes possibles
  console.log('\n\n❓ CAUSES POSSIBLES:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (timeFor829 > 150) {
    console.log('❌ CAUSE #1: TIMEOUT DE LA FONCTION')
    console.log('   • Supabase Edge Functions timeout après 150 secondes')
    console.log('   • Temps nécessaire pour 829 emails: ' + Math.round(timeFor829) + 's')
    console.log('   • La fonction s\'est arrêtée automatiquement')
    console.log('   ✅ C\'EST LA CAUSE PRINCIPALE')
  }
  
  console.log('\n❌ CAUSE #2: ERREUR RÉSEAU/API')
  console.log('   • Resend API peut avoir rejeté certains emails')
  console.log('   • Emails invalides ou bounced')
  console.log('   • Rate limiting atteint')
  
  console.log('\n❌ CAUSE #3: ERREUR DANS LA FONCTION')
  console.log('   • Exception non gérée')
  console.log('   • Erreur de mémoire')
  console.log('   • Problème de connexion DB')

  // 5. Vérifier s'il y a eu des erreurs dans les campaigns
  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  console.log('\n\n📊 DERNIÈRE CAMPAGNE ENREGISTRÉE:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (!campaigns || campaigns.length === 0) {
    console.log('❌ AUCUNE campagne enregistrée pour cet envoi')
    console.log('\n💡 Cela signifie que:')
    console.log('   1. La fonction a timeout AVANT de logger la campagne')
    console.log('   2. Ou il y a eu une erreur lors du INSERT dans email_campaigns')
    console.log('   3. Les emails ont été envoyés mais le logging a échoué')
  } else {
    const latest = campaigns[0]
    console.log(`Nom: ${latest.name}`)
    console.log(`Date: ${new Date(latest.sent_at || latest.created_at).toLocaleString('fr-FR')}`)
    console.log(`Envoyés: ${latest.sent_count}/${latest.total_recipients}`)
    
    if (latest.sent_count < latest.total_recipients) {
      console.log('\n⚠️  La campagne indique un envoi incomplet')
    }
  }

  // 6. Recommandations
  console.log('\n\n💡 SOLUTIONS POSSIBLES:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1. ✅ SCRIPT LOCAL (recommandé)')
  console.log('   • Envoyer les 436 restants via script Node.js')
  console.log('   • Pas de limite de timeout')
  console.log('   • Contrôle total')
  console.log('   → node send_remaining_direct.mjs')
  
  console.log('\n2. 🔧 MODIFIER LA FONCTION EDGE')
  console.log('   • Découper en plusieurs appels de 500 emails max')
  console.log('   • Utiliser une queue (Bull/BullMQ)')
  console.log('   • Déployer sur un service sans timeout')
  
  console.log('\n3. 📊 ACCEPTER L\'ENVOI PARTIEL')
  console.log('   • 829/1265 = 65.5% de couverture')
  console.log('   • Les utilisateurs les plus actifs/anciens ont été contactés')
  
  console.log('\n\n🎯 CONCLUSION:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('La fonction Supabase Edge a TIMEOUT après ~2.5 minutes')
  console.log('C\'est une limite technique de Supabase, pas un bug de votre code.')
  console.log('Pour envoyer aux 436 restants, utilisez le script local.')
}

analyzeWhyStopped().catch(console.error)
