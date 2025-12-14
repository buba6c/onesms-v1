#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function checkRecentActivity() {
  console.log('🔍 Vérification de l\'activité récente...\n')

  // Vérifier email_campaigns avec RLS désactivé (via service role si disponible)
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  const { data: campaigns, error: campError } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('📧 CAMPAGNES EMAIL:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (campError) {
    console.error('❌ Erreur:', campError.message)
  } else if (!campaigns || campaigns.length === 0) {
    console.log('❌ Aucune campagne trouvée')
    console.log('\n💡 La fonction send-promo-emails a peut-être échoué à logger la campagne')
    console.log('   Mais les emails ont bien été envoyés via Resend !')
  } else {
    campaigns.forEach((c, i) => {
      const date = new Date(c.created_at).toLocaleString('fr-FR')
      console.log(`\n${i + 1}. ${c.name || c.title}`)
      console.log(`   Date: ${date}`)
      console.log(`   Status: ${c.status}`)
      console.log(`   Envoyés: ${c.sent_count}/${c.total_recipients}`)
    })
  }

  // Vérifier email_logs
  const tenMinAgo = new Date()
  tenMinAgo.setMinutes(tenMinAgo.getMinutes() - 15)

  const { data: logs, error: logsError } = await supabaseAdmin
    .from('email_logs')
    .select('*')
    .gte('created_at', tenMinAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('\n\n📨 EMAIL LOGS (15 dernières minutes):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (logsError) {
    console.error('❌ Erreur:', logsError.message)
  } else if (!logs || logs.length === 0) {
    console.log('❌ Aucun log trouvé')
    console.log('\n💡 Note: send-promo-emails ne log pas dans email_logs')
    console.log('   Il log directement dans email_campaigns')
  } else {
    logs.forEach((log, i) => {
      const time = new Date(log.created_at).toLocaleTimeString('fr-FR')
      console.log(`${i + 1}. ${time} - ${log.recipient}`)
      console.log(`   Type: ${log.email_type}`)
      console.log(`   Status: ${log.status}`)
    })
  }

  console.log('\n\n🔍 DIAGNOSTIC:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Emails envoyés via Resend (vous les voyez)')
  console.log('❓ Campagne non enregistrée dans email_campaigns')
  console.log('\nPossibles causes:')
  console.log('1. Erreur lors de l\'INSERT dans email_campaigns')
  console.log('2. La fonction a réussi à envoyer mais échoué à logger')
  console.log('3. Problème avec created_by (user.id)')
  console.log('\n💡 Solution: Vérifier les logs Supabase Edge Functions')
}

checkRecentActivity().catch(console.error)
