#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const cloudUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const cloudSupabase = createClient(cloudUrl, cloudKey)

const coolifyUrl = 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io'
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
const coolifySupabase = createClient(coolifyUrl, coolifyKey)

console.log('🔧 FINALISATION DE LA MIGRATION - DERNIERS AJUSTEMENTS\n')

// Importer les balance_operations manquantes
console.log('📥 Import des balance_operations manquantes...')

const { count: coolifyCount } = await coolifySupabase
  .from('balance_operations')
  .select('*', { count: 'exact', head: true })

console.log(`   Actuellement: ${coolifyCount} lignes`)

// Récupérer toutes les balance_operations depuis Cloud
const { data: allOps, error: fetchError } = await cloudSupabase
  .from('balance_operations')
  .select('*')
  .order('created_at', { ascending: true })

if (fetchError) {
  console.log(`   ❌ Erreur: ${fetchError.message}`)
} else {
  console.log(`   📊 ${allOps.length} lignes dans Cloud`)
  
  // Récupérer les IDs déjà présents dans Coolify
  const { data: existingOps } = await coolifySupabase
    .from('balance_operations')
    .select('id')
  
  const existingIds = new Set(existingOps?.map(op => op.id) || [])
  
  // Filtrer les opérations manquantes
  const missingOps = allOps.filter(op => !existingIds.has(op.id))
  
  console.log(`   ⚠️  ${missingOps.length} lignes manquantes`)
  
  if (missingOps.length > 0) {
    // Importer ligne par ligne pour éviter les erreurs de clés étrangères
    let imported = 0
    let skipped = 0
    
    for (const op of missingOps) {
      const { error: insertError } = await coolifySupabase
        .from('balance_operations')
        .insert([op])
      
      if (insertError) {
        skipped++
      } else {
        imported++
      }
    }
    
    console.log(`   ✅ Importé: ${imported} lignes`)
    if (skipped > 0) {
      console.log(`   ⚠️  Ignoré: ${skipped} lignes (contraintes FK)`)
    }
  } else {
    console.log(`   ✅ Aucune donnée manquante`)
  }
}

console.log('\n✅ Finalisation terminée!\n')
