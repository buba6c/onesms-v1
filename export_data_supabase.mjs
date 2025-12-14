import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

const tables = [
  'users',
  'services',
  'activations',
  'rentals',
  'transactions',
  'payment_providers',
  'countries',
  'virtual_numbers',
  'system_settings',
  'service_icons',
  'popular_services',
  'favorite_services',
  'promo_codes',
  'promo_code_uses',
  'referrals',
  'notifications',
  'activity_logs',
  'system_logs',
  'balance_operations',
  'rental_logs',
  'rental_messages',
  'sms_messages',
  'activation_packages',
  'pricing_rules_archive',
  'contact_settings',
  'email_campaigns',
  'email_logs',
  'logs_provider',
  'payment_provider_logs',
  'webhook_logs'
]

console.log('🚀 Export des données depuis Supabase Cloud...\n')

const allData = {}

for (const table of tables) {
  try {
    console.log(`📥 Export de ${table}...`)
    
    // Récupérer toutes les données de la table
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
    
    if (error) {
      console.log(`   ⚠️  Erreur: ${error.message}`)
      allData[table] = { count: 0, data: [] }
    } else {
      console.log(`   ✅ ${count || 0} lignes`)
      allData[table] = { count: count || 0, data: data || [] }
    }
  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`)
    allData[table] = { count: 0, data: [] }
  }
}

// Sauvegarder dans un fichier JSON
const filename = `export_data_${new Date().toISOString().split('T')[0]}.json`
fs.writeFileSync(filename, JSON.stringify(allData, null, 2))

console.log(`\n✅ Export terminé ! Fichier: ${filename}`)

// Statistiques
console.log('\n📊 Statistiques:')
for (const [table, info] of Object.entries(allData)) {
  if (info.count > 0) {
    console.log(`   ${table}: ${info.count} lignes`)
  }
}
