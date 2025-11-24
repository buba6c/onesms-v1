#!/usr/bin/env node
/**
 * Test rapide pour vérifier que les icon_url fonctionnent
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Charger les variables d'environnement
config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🔍 Test icon_url depuis la base de données...\n')

// Test 1: Vérifier qu'on a des services avec icon_url
const { data: servicesWithIcons, error: error1 } = await supabase
  .from('services')
  .select('code, name, icon_url')
  .not('icon_url', 'is', null)
  .limit(10)

if (error1) {
  console.error('❌ Erreur:', error1)
  process.exit(1)
}

console.log(`✅ Nombre de services avec icon_url: ${servicesWithIcons.length}`)
console.log('\n📋 Exemples d\'icon_url:\n')

servicesWithIcons.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name} (${s.code})`)
  console.log(`   📸 ${s.icon_url}`)
})

// Test 2: Vérifier que les URLs S3 sont correctes
console.log('\n🔗 Vérification des URLs S3...')
const allValid = servicesWithIcons.every(s => 
  s.icon_url && s.icon_url.startsWith('https://onesms.s3.eu-north-1.amazonaws.com/icons/')
)

if (allValid) {
  console.log('✅ Toutes les URLs S3 sont valides!')
} else {
  console.log('⚠️  Certaines URLs ne sont pas au format S3 attendu')
}

// Test 3: Compter les services sans icon_url
const { count: totalServices } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })

const { count: servicesWithIconUrl } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })
  .not('icon_url', 'is', null)

console.log(`\n📊 Statistiques:`)
console.log(`   Total services: ${totalServices}`)
console.log(`   Avec icon_url: ${servicesWithIconUrl}`)
console.log(`   Sans icon_url: ${totalServices - servicesWithIconUrl}`)
console.log(`   Couverture: ${((servicesWithIconUrl / totalServices) * 100).toFixed(1)}%`)

console.log('\n✅ Test terminé!')
