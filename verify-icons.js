import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 Vérification des icônes dans la base de données...\n')

// Compter les services avec/sans icônes
const { data: allServices, error: errorAll } = await supabase
  .from('services')
  .select('id', { count: 'exact', head: true })

const { data: withIcons, error: errorWith } = await supabase
  .from('services')
  .select('id', { count: 'exact', head: true })
  .not('icon_url', 'is', null)

const { data: withoutIcons, error: errorWithout } = await supabase
  .from('services')
  .select('id', { count: 'exact', head: true })
  .is('icon_url', null)

console.log('📊 Statistiques:')
console.log(`   Total services: ${allServices?.length || 0}`)
console.log(`   ✅ Avec icônes: ${withIcons?.length || 0}`)
console.log(`   ❌ Sans icônes: ${withoutIcons?.length || 0}`)
console.log('')

// Afficher quelques exemples
const { data: examples } = await supabase
  .from('services')
  .select('code, name, icon_url')
  .not('icon_url', 'is', null)
  .limit(10)

console.log('📸 Exemples d\'icônes:')
examples?.forEach((s, i) => {
  console.log(`   ${i + 1}. ${s.name}`)
  console.log(`      ${s.icon_url}`)
})

process.exit(0)
