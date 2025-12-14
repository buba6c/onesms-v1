import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const cloudUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const cloudSupabase = createClient(cloudUrl, cloudKey)

const coolifyUrl = 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io'
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
const coolifySupabase = createClient(coolifyUrl, coolifyKey)

console.log('🚀 IMPORT INTELLIGENT DES DONNÉES MANQUANTES\n')

// Tables avec beaucoup de données - import optimisé
const largeTables = [
  { name: 'rental_logs', missing: 62450 },
  { name: 'pricing_rules_archive', missing: 109353 },
  { name: 'balance_operations', missing: 264 }
]

async function importLargeTable(tableName, totalExpected) {
  console.log(`\n📥 Import de ${tableName} (${totalExpected} lignes attendues)...`)
  
  let offset = 0
  const batchSize = 1000
  let totalImported = 0
  let retries = 0
  const maxRetries = 3
  
  // Vérifier combien sont déjà importées
  const { count: alreadyImported } = await coolifySupabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
  
  console.log(`   ℹ️  Déjà importé: ${alreadyImported} lignes`)
  
  // Si déjà complet, skip
  if (alreadyImported >= totalExpected) {
    console.log(`   ✅ Déjà complet!`)
    return alreadyImported
  }
  
  // Calculer l'offset de départ
  offset = alreadyImported || 0
  
  while (true) {
    try {
      // Récupérer depuis Cloud
      const { data, error: fetchError } = await cloudSupabase
        .from(tableName)
        .select('*')
        .range(offset, offset + batchSize - 1)
      
      if (fetchError) {
        console.log(`   ⚠️  Erreur lecture: ${fetchError.message}`)
        retries++
        if (retries >= maxRetries) break
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      
      if (!data || data.length === 0) {
        console.log(`   ✅ Fin de l'import`)
        break
      }
      
      // Insérer dans Coolify
      const { error: insertError } = await coolifySupabase
        .from(tableName)
        .insert(data)
      
      if (insertError) {
        // Essayer ligne par ligne si batch échoue
        console.log(`   ⚠️  Batch échoué, import ligne par ligne...`)
        let successCount = 0
        for (const row of data) {
          const { error } = await coolifySupabase
            .from(tableName)
            .insert([row])
          if (!error) successCount++
        }
        totalImported += successCount
        console.log(`   ✅ ${successCount}/${data.length} lignes importées`)
      } else {
        totalImported += data.length
        console.log(`   ✅ Batch ${Math.floor(offset / batchSize) + 1}: ${data.length} lignes (Total: ${offset + data.length})`)
      }
      
      offset += data.length
      retries = 0
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 500))
      
    } catch (err) {
      console.log(`   ❌ Erreur: ${err.message}`)
      retries++
      if (retries >= maxRetries) break
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  
  return totalImported
}

// Exécuter l'import
let grandTotal = 0
for (const table of largeTables) {
  const imported = await importLargeTable(table.name, table.missing)
  grandTotal += imported
}

console.log(`\n🎉 IMPORT TERMINÉ! ${grandTotal} lignes importées`)

// Vérification finale
console.log('\n📊 VÉRIFICATION FINALE:')
for (const table of largeTables) {
  const { count } = await coolifySupabase
    .from(table.name)
    .select('*', { count: 'exact', head: true })
  
  const status = count >= table.missing ? '✅' : '⚠️'
  console.log(`${status} ${table.name}: ${count}/${table.missing}`)
}
