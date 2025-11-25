/**
 * Script pour générer un mapping complet service_code → sms_activate_code
 * depuis la DB services table
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('📊 Génération du mapping complet depuis la DB...\n')

// Récupérer tous les services actifs
const { data: services, error } = await supabase
  .from('services')
  .select('code, name, category')
  .eq('active', true)
  .order('name')

if (error) {
  console.error('❌ Erreur:', error)
  process.exit(1)
}

console.log(`✅ ${services.length} services trouvés\n`)

// Créer le mapping TypeScript
const mapping = {}
services.forEach(service => {
  mapping[service.name.toLowerCase()] = service.code
})

// Générer le code TypeScript
console.log('📝 Code à copier dans DashboardPage.tsx (ligne 263):\n')
console.log('```typescript')
console.log('const serviceCodeMapping: Record<string, string> = {')

// Trier par ordre alphabétique
const sortedEntries = Object.entries(mapping).sort((a, b) => a[0].localeCompare(b[0]))

sortedEntries.forEach(([name, code], index) => {
  const comma = index < sortedEntries.length - 1 ? ',' : ''
  console.log(`  '${name}': '${code}'${comma}`)
})

console.log('};')
console.log('```')

// Vérifier les services manquants critiques
console.log('\n\n🔍 Vérification des services critiques:')
const critical = ['tinder', 'badoo', 'whatsapp', 'telegram', 'google', 'instagram']
critical.forEach(name => {
  if (mapping[name]) {
    console.log(`✅ ${name}: '${mapping[name]}'`)
  } else {
    console.log(`❌ ${name}: MANQUANT`)
  }
})

// Stats par catégorie
console.log('\n\n📊 Services par catégorie:')
const byCategory = {}
services.forEach(s => {
  byCategory[s.category] = (byCategory[s.category] || 0) + 1
})
Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`)
})
