#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function countUsers() {
  console.log('📊 Analyse des utilisateurs pour envoi d\'emails...\n')

  // Tous les utilisateurs avec email
  const { count: totalWithEmail, error: e1 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)

  // Tous les utilisateurs
  const { count: totalUsers, error: e2 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Utilisateurs avec balance > 0
  const { count: withBalance, error: e3 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)
    .gt('balance', 0)

  // Utilisateurs actifs (dernière activité < 30 jours)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count: activeUsers, error: e4 } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)
    .gte('updated_at', thirtyDaysAgo.toISOString())

  console.log('📧 STATISTIQUES D\'ENVOI D\'EMAILS\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total utilisateurs (base):        ${totalUsers}`)
  console.log(`Utilisateurs avec email:          ${totalWithEmail} ✅`)
  console.log(`  └─ Avec balance > 0:            ${withBalance}`)
  console.log(`  └─ Actifs (< 30 jours):         ${activeUsers}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📬 Par défaut, la fonction send-promo-emails envoie à:')
  console.log(`   👉 ${totalWithEmail} utilisateurs\n`)

  console.log('⚙️  Vous pouvez filtrer avec les options:')
  console.log('   • filter.minBalance - Balance minimum')
  console.log('   • filter.maxBalance - Balance maximum')
  console.log('   • filter.inactiveDays - Utilisateurs inactifs depuis X jours')
  console.log('   • filter.limit - Limite le nombre d\'emails\n')

  console.log('💡 Exemples de filtres:')
  console.log('   • Tous avec balance > 0: minBalance: 0.01')
  console.log('   • Inactifs 30+ jours: inactiveDays: 30')
  console.log('   • Test sur 10 users: limit: 10')
}

countUsers().catch(console.error)
