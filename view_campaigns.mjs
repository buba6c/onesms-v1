import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('📊 Historique des campagnes email:\n')

const { data, error } = await supabase
  .from('email_campaigns')
  .select(`
    id,
    name,
    subject,
    status,
    total_recipients,
    sent_count,
    created_at,
    sent_at
  `)
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('❌ Erreur:', error.message)
} else if (data.length === 0) {
  console.log('⚠️  Aucune campagne trouvée')
  console.log('\n💡 Envoie un email depuis l\'interface admin pour le voir apparaître ici')
} else {
  console.log(`✅ ${data.length} campagne(s) trouvée(s):\n`)
  data.forEach((campaign, i) => {
    console.log(`${i + 1}. ${campaign.name}`)
    console.log(`   📧 ${campaign.sent_count}/${campaign.total_recipients} envoyés`)
    console.log(`   📅 ${new Date(campaign.sent_at || campaign.created_at).toLocaleString('fr-FR')}`)
    console.log(`   ✅ Statut: ${campaign.status}\n`)
  })
}
