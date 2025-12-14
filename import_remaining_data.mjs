import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const coolifyUrl = 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io'
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
const supabase = createClient(coolifyUrl, coolifyKey)

console.log('🚀 IMPORT INTELLIGENT DES DONNÉES MANQUANTES\n')

// Lire les données exportées
const data = JSON.parse(fs.readFileSync('export_data_2025-12-08.json', 'utf8'))

// Tables à importer (grandes tables uniquement)
const tables = [
  { name: 'balance_operations', batchSize: 50 },
  { name: 'rental_logs', batchSize: 1000 },
  { name: 'pricing_rules_archive', batchSize: 1000 }
]

let totalImported = 0
let totalErrors = 0

for (const { name, batchSize } of tables) {
  const tableData = data[name]
  
  if (!tableData || !tableData.data || tableData.data.length === 0) {
    console.log(`⏭️  ${name}: Aucune donnée`)
    continue
  }

  console.log(`\n📥 ${name} (${tableData.count} lignes, batch: ${batchSize})`)
  
  // Vérifier combien sont déjà importés
  const { count: existing } = await supabase
    .from(name)
    .select('*', { count: 'exact', head: true })
  
  if (existing >= tableData.count) {
    console.log(`   ✅ Déjà complet (${existing} lignes)`)
    continue
  }
  
  console.log(`   📊 ${existing} déjà importés, reste ${tableData.count - existing}`)
  
  // Importer les données manquantes
  const batches = Math.ceil(tableData.data.length / batchSize)
  let imported = 0
  let errors = 0
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize
    const end = Math.min(start + batchSize, tableData.data.length)
    const batch = tableData.data.slice(start, end)
    
    try {
      const { error } = await supabase.from(name).insert(batch)
      
      if (error) {
        // Si erreur de duplication, ignorer
        if (error.code === '23505') {
          // Duplicate key - normal, on skip
        } else {
          errors++
          if (errors < 3) {
            console.log(`   ⚠️  Batch ${i + 1}/${batches}: ${error.message.substring(0, 60)}`)
          }
        }
      } else {
        imported += batch.length
        totalImported += batch.length
      }
      
      // Afficher progression tous les 10 batches
      if ((i + 1) % 10 === 0 || i === batches - 1) {
        const percent = ((i + 1) / batches * 100).toFixed(1)
        console.log(`   📈 ${percent}% (${i + 1}/${batches} batches, ${imported} importés)`)
      }
    } catch (err) {
      errors++
    }
  }
  
  totalErrors += errors
  console.log(`   ✅ ${imported} nouvelles lignes importées${errors > 0 ? `, ${errors} erreurs` : ''}`)
}

// Vérification finale
console.log('\n📊 VÉRIFICATION FINALE\n')

const verification = [
  'users',
  'services', 
  'activations',
  'balance_operations',
  'rental_logs',
  'pricing_rules_archive',
  'countries',
  'payment_providers'
]

for (const table of verification) {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  
  console.log(`   ${table.padEnd(25)} ${String(count || 0).padStart(8)} lignes`)
}

console.log(`\n🎉 Import terminé ! ${totalImported} lignes importées (${totalErrors} erreurs ignorées)`)
