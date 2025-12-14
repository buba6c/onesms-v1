#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function checkSentEmails() {
  console.log('📊 Vérification des emails envoyés récemment...\n')

  // Emails des dernières 24 heures
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const { data: recentEmails, error: e1 } = await supabase
    .from('email_logs')
    .select('*')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })

  if (e1) {
    console.error('❌ Erreur:', e1.message)
    return
  }

  // Emails des 10 dernières minutes (envoi le plus récent)
  const tenMinAgo = new Date()
  tenMinAgo.setMinutes(tenMinAgo.getMinutes() - 10)

  const { data: veryRecent, error: e2 } = await supabase
    .from('email_logs')
    .select('*')
    .gte('created_at', tenMinAgo.toISOString())
    .order('created_at', { ascending: false })

  // Compter par statut
  const statusCount = {
    sent: recentEmails?.filter(e => e.status === 'sent').length || 0,
    failed: recentEmails?.filter(e => e.status === 'failed').length || 0,
    pending: recentEmails?.filter(e => e.status === 'pending').length || 0,
  }

  console.log('📧 RAPPORT D\'ENVOI\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n📬 Dernières 10 minutes:`)
  console.log(`   ${veryRecent?.length || 0} emails envoyés ✅\n`)
  
  console.log(`📊 Dernières 24 heures:`)
  console.log(`   Total:   ${recentEmails?.length || 0} emails`)
  console.log(`   ✅ Envoyés:  ${statusCount.sent}`)
  console.log(`   ❌ Échoués:  ${statusCount.failed}`)
  console.log(`   ⏳ En cours: ${statusCount.pending}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (veryRecent && veryRecent.length > 0) {
    console.log('🕐 Derniers envois:\n')
    veryRecent.slice(0, 5).forEach((email, i) => {
      const time = new Date(email.created_at).toLocaleTimeString('fr-FR')
      console.log(`${i + 1}. ${time} - ${email.email_type || 'N/A'} → ${email.recipient}`)
      console.log(`   Statut: ${email.status === 'sent' ? '✅ Envoyé' : email.status === 'failed' ? '❌ Échoué' : '⏳ En cours'}`)
      if (email.error_message) {
        console.log(`   Erreur: ${email.error_message}`)
      }
      console.log('')
    })
  }

  // Statistiques par type d'email
  const byType = {}
  recentEmails?.forEach(email => {
    const type = email.email_type || 'unknown'
    byType[type] = (byType[type] || 0) + 1
  })

  if (Object.keys(byType).length > 0) {
    console.log('📋 Par type d\'email (24h):')
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`)
    })
    console.log('')
  }
}

checkSentEmails().catch(console.error)
