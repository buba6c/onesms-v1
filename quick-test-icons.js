import { config } from 'dotenv'
config({ path: '.env.icons' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('🧪 TEST RAPIDE - Récupération de 10 services...\n')

const { data: services, error } = await supabase
  .from('services')
  .select('id, code, name, display_name')
  .limit(10)

if (error) {
  console.log('❌ Erreur:', error.message)
  process.exit(1)
}

console.log(`✅ ${services.length} services récupérés:\n`)
services.forEach((s, i) => {
  console.log(`${i + 1}. ${s.display_name || s.name} (${s.code})`)
})

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🚀 Pour générer les icônes de ces 10 services:')
console.log('   node import-icons.js --limit 10')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
