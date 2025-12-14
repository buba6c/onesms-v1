import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('📊 Vérification structure email_campaigns...\n')

// Récupérer toutes les campagnes (même vides)
const { data, error } = await supabase
  .from('email_campaigns')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5)

if (error) {
  console.error('❌ Erreur:', error)
} else {
  console.log(`✅ Campagnes trouvées: ${data.length}`)
  console.log(JSON.stringify(data, null, 2))
}

// Vérifier les logs de la fonction
console.log('\n📜 Vérifier les logs de la fonction sur:')
console.log('https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/logs/edge-functions')
