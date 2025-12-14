#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

async function deepAnalyse() {
  console.log('🔬 DEEP ANALYSE - Envoi email TOUFE\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. Vérifier les campagnes
  console.log('📊 1. ANALYSE DES CAMPAGNES\n')
  const { data: campaigns, error: campError } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (campError) {
    console.error('❌ Erreur campagnes:', campError.message)
  } else {
    console.log(`Total campagnes trouvées: ${campaigns?.length || 0}`)
    if (campaigns && campaigns.length > 0) {
      campaigns.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.name || c.title}`)
        console.log(`   Date: ${new Date(c.created_at).toLocaleString('fr-FR')}`)
        console.log(`   Status: ${c.status}`)
        console.log(`   Envoyés: ${c.sent_count}/${c.total_recipients}`)
        if (c.promo_code) console.log(`   Code promo: ${c.promo_code}`)
        if (c.discount) console.log(`   Réduction: ${c.discount}`)
      })
    } else {
      console.log('❌ Aucune campagne trouvée')
    }
  }

  // 2. Vérifier les email_logs (dernières 30 minutes)
  console.log('\n\n📧 2. ANALYSE DES EMAIL LOGS (30 dernières minutes)\n')
  const thirtyMinAgo = new Date()
  thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30)

  const { data: logs, error: logsError } = await supabase
    .from('email_logs')
    .select('*')
    .gte('created_at', thirtyMinAgo.toISOString())
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('❌ Erreur logs:', logsError.message)
  } else {
    console.log(`Emails loggés (30 min): ${logs?.length || 0}`)
    
    if (logs && logs.length > 0) {
      const byType = {}
      const byStatus = {}
      
      logs.forEach(log => {
        const type = log.email_type || 'unknown'
        const status = log.status || 'unknown'
        byType[type] = (byType[type] || 0) + 1
        byStatus[status] = (byStatus[status] || 0) + 1
      })

      console.log('\nPar type:')
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`)
      })

      console.log('\nPar statut:')
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })

      console.log('\nDerniers 3 emails:')
      logs.slice(0, 3).forEach((log, i) => {
        const time = new Date(log.created_at).toLocaleTimeString('fr-FR')
        console.log(`${i + 1}. ${time} - ${log.recipient}`)
        console.log(`   Type: ${log.email_type} | Status: ${log.status}`)
      })
    } else {
      console.log('⚠️  Note: send-promo-emails ne log pas dans email_logs')
    }
  }

  // 3. Vérifier l'activité admin récente
  console.log('\n\n👤 3. ACTIVITÉ ADMIN RÉCENTE\n')
  
  const { data: adminUser } = await supabase
    .from('users')
    .select('id, email, role, updated_at')
    .eq('role', 'admin')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (adminUser && adminUser.length > 0) {
    console.log(`Admin: ${adminUser[0].email}`)
    console.log(`Dernière activité: ${new Date(adminUser[0].updated_at).toLocaleString('fr-FR')}`)
  }

  // 4. Vérifier les utilisateurs
  console.log('\n\n📊 4. STATISTIQUES UTILISATEURS\n')
  
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)

  console.log(`Total utilisateurs avec email: ${totalUsers}`)

  // 5. Diagnostiquer le problème d'envoi
  console.log('\n\n🔍 5. DIAGNOSTIC\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const lastCampaign = campaigns?.[0]
  const now = new Date()
  const minutesSinceLastCampaign = lastCampaign 
    ? Math.round((now - new Date(lastCampaign.created_at)) / 60000) 
    : null

  console.log('\n📌 État actuel:')
  console.log(`   • Dernière campagne: ${lastCampaign?.name || 'N/A'}`)
  console.log(`   • Date: ${lastCampaign ? new Date(lastCampaign.created_at).toLocaleString('fr-FR') : 'N/A'}`)
  console.log(`   • Il y a: ${minutesSinceLastCampaign || 'N/A'} minutes`)
  
  console.log('\n❓ Questions à vérifier:')
  console.log('   1. Avez-vous vu un message de succès dans l\'admin panel ?')
  console.log('   2. Y a-t-il des erreurs dans la console navigateur (F12) ?')
  console.log('   3. Combien d\'emails voyez-vous sur Resend.com ?')

  console.log('\n💡 Scénarios possibles:')
  console.log('\nScénario A: Envoi en cours')
  console.log('   ✅ L\'envoi a commencé')
  console.log('   ⏳ Resend traite les emails (2/sec)')
  console.log('   ⏱️  Va prendre ~10-15 minutes pour 1265 emails')
  console.log('   ❌ Function va timeout après 2-3 minutes')
  console.log('   📧 ~800-900 emails seront envoyés avant timeout')

  console.log('\nScénario B: Erreur silencieuse')
  console.log('   ❌ L\'appel API a échoué')
  console.log('   🔍 Vérifier console navigateur pour l\'erreur')
  console.log('   🔑 Problème d\'authentification possible')
  console.log('   📊 Aucun email sur Resend')

  console.log('\nScénario C: Fonction non déployée')
  console.log('   ❌ La fonction modifiée n\'est pas en production')
  console.log('   🚀 Besoin de redéployer')
  console.log('   💻 Utiliser: npx supabase functions deploy send-promo-emails')

  // 6. Recommandations
  console.log('\n\n🎯 6. RECOMMANDATIONS\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log('\nSolution immédiate:')
  console.log('   1. Allez sur Resend.com Dashboard')
  console.log('   2. Vérifiez combien d\'emails sont partis')
  console.log('   3. Si ~800-900 emails: l\'envoi a fonctionné mais timeout')
  console.log('   4. Si 0 email: il y a une erreur à corriger')

  console.log('\nPour envoyer aux 436 restants:')
  console.log('   • Mettre à jour le script send_batches_with_offset.mjs')
  console.log('   • Avec le message TOUFE')
  console.log('   • Lancer: node send_batches_with_offset.mjs')
  
  console.log('\nPour envoyer à TOUT LE MONDE (1265):')
  console.log('   • Créer un nouveau script avec offset=0')
  console.log('   • Risque: doublons pour les ~829 premiers')
  console.log('   • Mieux: cibler uniquement les non-reçus')

  console.log('\n\n💾 Pour plus d\'infos:')
  console.log('   • Logs Supabase: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/logs/edge-functions')
  console.log('   • Resend Dashboard: https://resend.com/emails')
}

deepAnalyse().catch(console.error)
