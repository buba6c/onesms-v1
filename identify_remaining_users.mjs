#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

async function identifyRemainingUsers() {
  console.log('🔍 Identification des utilisateurs restants...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Récupérer TOUS les utilisateurs dans le même ordre que la fonction
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, email, name, balance, updated_at, created_at')
    .not('email', 'is', null)
    .order('id', { ascending: true }) // Ordre par défaut de la requête

  if (error) {
    console.error('❌ Erreur:', error.message)
    return
  }

  console.log('📊 ANALYSE:\n')
  console.log(`Total utilisateurs:    ${allUsers.length}`)
  console.log(`Déjà envoyés (Resend): 829`)
  console.log(`Restants à envoyer:    ${allUsers.length - 829}`)

  // Les 829 premiers ont reçu l'email (ordre de la requête)
  const alreadySent = allUsers.slice(0, 829)
  const remaining = allUsers.slice(829)

  console.log('\n\n✅ UTILISATEURS DÉJÀ CONTACTÉS (premiers 829):\n')
  console.log(`   ${alreadySent[0]?.email} (ID: ${alreadySent[0]?.id})`)
  console.log(`   ...`)
  console.log(`   ${alreadySent[828]?.email} (ID: ${alreadySent[828]?.id})`)

  console.log('\n\n📬 UTILISATEURS À CONTACTER (restants):\n')
  console.log(`   Total: ${remaining.length}`)
  console.log(`   Premier: ${remaining[0]?.email} (ID: ${remaining[0]?.id})`)
  console.log(`   Dernier: ${remaining[remaining.length - 1]?.email} (ID: ${remaining[remaining.length - 1]?.id})`)

  // Sauvegarder la liste dans un fichier
  const fs = await import('fs')
  const remainingEmails = remaining.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    balance: u.balance
  }))

  fs.writeFileSync(
    'remaining_users_to_email.json',
    JSON.stringify(remainingEmails, null, 2)
  )

  console.log('\n\n💾 Fichier créé: remaining_users_to_email.json')
  console.log(`   ${remaining.length} utilisateurs à contacter`)

  console.log('\n\n🚀 PROCHAINE ÉTAPE:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1. Vérifier la liste dans remaining_users_to_email.json')
  console.log('2. Lancer le script d\'envoi pour ces utilisateurs')
  console.log('\n💡 Voulez-vous que je crée le script d\'envoi maintenant ?')
}

identifyRemainingUsers().catch(console.error)
