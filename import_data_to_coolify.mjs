import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io'
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🚀 Import des données vers Supabase Coolify...\n')

// Lire le fichier JSON
const data = JSON.parse(fs.readFileSync('export_data_2025-12-08.json', 'utf8'))

// Ordre d'import (tables avec dépendances en dernier)
const importOrder = [
  'countries',
  'users',
  'services',
  'service_icons',
  'popular_services',
  'favorite_services',
  'system_settings',
  'payment_providers',
  'promo_codes',
  'promo_code_uses',
  'referrals',
  'activation_packages',
  'activations',
  'virtual_numbers',
  'rentals',
  'rental_logs',
  'rental_messages',
  'transactions',
  'balance_operations',
  'notifications',
  'activity_logs',
  'system_logs',
  'sms_messages',
  'pricing_rules_archive',
  'contact_settings',
  'email_campaigns',
  'email_logs',
  'logs_provider',
  'payment_provider_logs',
  'webhook_logs'
]

let totalImported = 0

for (const table of importOrder) {
  const tableData = data[table]
  
  if (!tableData || !tableData.data || tableData.data.length === 0) {
    console.log(`⏭️  ${table}: Aucune donnée à importer`)
    continue
  }
  
  console.log(`📥 Import de ${table} (${tableData.count} lignes)...`)
  
  try {
    // Importer par batch de 100 lignes
    const batchSize = 100
    const batches = Math.ceil(tableData.data.length / batchSize)
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, tableData.data.length)
      const batch = tableData.data.slice(start, end)
      
      const { error } = await supabase
        .from(table)
        .insert(batch)
      
      if (error) {
        console.log(`   ⚠️  Batch ${i + 1}/${batches} erreur: ${error.message}`)
      } else {
        totalImported += batch.length
        if (batches > 1) {
          console.log(`   ✅ Batch ${i + 1}/${batches} (${batch.length} lignes)`)
        }
      }
    }
    
    if (batches === 1) {
      console.log(`   ✅ ${tableData.count} lignes importées`)
    }
  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`)
  }
}

console.log(`\n🎉 Import terminé ! ${totalImported} lignes importées au total`)

// Vérification
console.log('\n📊 Vérification...')
const { data: verifyUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
const { data: verifyServices } = await supabase.from('services').select('*', { count: 'exact', head: true })
const { data: verifyActivations } = await supabase.from('activations').select('*', { count: 'exact', head: true })

console.log('✅ Données importées avec succès !')
