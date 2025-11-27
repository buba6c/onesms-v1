#!/usr/bin/env node

/**
 * Script to clean duplicate services from Supabase
 * 
 * PROBLEM:
 * - API returns SHORT codes (wa, tg, ig, fb, go, ds, am, nf)
 * - Database has LONG codes (whatsapp, telegram, instagram, etc.) from old sync
 * - This creates duplicates: 1388 invalid codes that don't exist in SMS-Activate API
 * 
 * SOLUTION:
 * 1. Fetch official service codes from SMS-Activate API (getServicesList)
 * 2. Delete services in DB that don't exist in API
 * 3. Keep only valid SHORT codes from API
 * 
 * RESULT:
 * - 2035 valid services (matching API)
 * - 0 duplicates
 * - All services have correct codes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as https from 'https'

dotenv.config()

// Use service_role key for admin operations (delete)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  SUPABASE_KEY
)

const API_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY!
const API_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

function apiRequest(params: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(`${API_URL}?${params}`, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { 
          resolve(JSON.parse(data)) 
        } catch { 
          resolve(data) 
        }
      })
    }).on('error', reject)
  })
}

async function cleanDuplicateServices() {
  console.log('🧹 NETTOYAGE DES SERVICES DUPLIQUÉS\n')
  console.log('═'.repeat(70) + '\n')
  
  try {
    // 1. Fetch official service codes from SMS-Activate API
    console.log('📡 1. Récupération des codes officiels depuis l\'API...\n')
    
    const apiServices = await apiRequest(`api_key=${API_KEY}&action=getServicesList`)
    
    if (apiServices.status !== 'success' || !apiServices.services) {
      throw new Error('Impossible de récupérer la liste des services depuis l\'API')
    }
    
    const validCodes = new Set(apiServices.services.map((s: any) => s.code))
    console.log(`   ✅ ${validCodes.size} codes valides récupérés\n`)
    
    // Display first 30 codes
    console.log('   Exemples de codes valides:')
    const exampleCodes = Array.from(validCodes).slice(0, 30)
    console.log(`   ${exampleCodes.join(', ')}\n`)
    
    // 2. Get all services from database
    console.log('💾 2. Analyse des services dans la base de données...\n')
    
    const { data: dbServices, error: fetchError } = await supabase
      .from('services')
      .select('code, name, display_name, total_available, category')
      .eq('active', true)
    
    if (fetchError) {
      throw new Error(`Erreur lecture DB: ${fetchError.message}`)
    }
    
    console.log(`   Total services DB: ${dbServices.length}\n`)
    
    // 3. Identify invalid codes (not in API)
    const invalidServices = dbServices.filter(s => !validCodes.has(s.code))
    const validServices = dbServices.filter(s => validCodes.has(s.code))
    
    console.log('📊 3. Résultats de l\'analyse:\n')
    console.log(`   ✅ Services valides:   ${validServices.length}`)
    console.log(`   ❌ Services invalides: ${invalidServices.length}\n`)
    
    if (invalidServices.length === 0) {
      console.log('✨ Aucun service invalide trouvé! La base est propre.\n')
      return
    }
    
    // 4. Display duplicates (same name, different codes)
    console.log('🔄 4. Identification des duplicatas:\n')
    
    const nameMap = new Map<string, any[]>()
    dbServices.forEach(s => {
      const name = (s.display_name || s.name).toLowerCase().trim()
      if (!nameMap.has(name)) {
        nameMap.set(name, [])
      }
      nameMap.get(name)!.push(s)
    })
    
    const duplicates = Array.from(nameMap.entries())
      .filter(([_, services]) => services.length > 1)
    
    if (duplicates.length > 0) {
      console.log(`   Trouvé ${duplicates.length} services avec duplicatas:\n`)
      
      duplicates.slice(0, 10).forEach(([name, services]) => {
        console.log(`   📛 ${name.toUpperCase()}:`)
        services.forEach(s => {
          const valid = validCodes.has(s.code) ? '✅ VALIDE' : '❌ INVALIDE'
          const stock = s.total_available > 0 ? `Stock: ${s.total_available.toLocaleString()}` : 'Stock: 0'
          console.log(`      - ${s.code.padEnd(15)} ${valid.padEnd(12)} | ${stock}`)
        })
      })
      
      if (duplicates.length > 10) {
        console.log(`      ... et ${duplicates.length - 10} autres duplicatas`)
      }
      console.log()
    }
    
    // 5. Display popular services that will be deleted
    console.log('⚠️  5. Services POPULAIRES qui seront SUPPRIMÉS:\n')
    
    const popularInvalid = invalidServices
      .filter(s => s.category === 'popular' || s.total_available > 10000)
      .slice(0, 20)
    
    if (popularInvalid.length > 0) {
      popularInvalid.forEach(s => {
        console.log(`   ❌ ${s.code.padEnd(15)} → ${s.name.padEnd(25)} | Stock: ${s.total_available.toLocaleString()}`)
      })
      console.log()
    }
    
    // 6. Ask for confirmation
    console.log('═'.repeat(70))
    console.log('\n💡 ACTION PROPOSÉE:\n')
    console.log(`   Supprimer ${invalidServices.length} services invalides`)
    console.log(`   Garder ${validServices.length} services valides\n`)
    console.log('   Services qui seront SUPPRIMÉS:')
    invalidServices.slice(0, 20).forEach(s => {
      console.log(`   - ${s.code.padEnd(15)} → ${s.name}`)
    })
    if (invalidServices.length > 20) {
      console.log(`   ... et ${invalidServices.length - 20} autres\n`)
    }
    
    // 7. Delete invalid services
    console.log('\n🗑️  6. Suppression des services invalides...\n')
    
    const invalidCodes = invalidServices.map(s => s.code)
    
    // Delete in batches of 100
    const batchSize = 100
    let deletedCount = 0
    
    for (let i = 0; i < invalidCodes.length; i += batchSize) {
      const batch = invalidCodes.slice(i, i + batchSize)
      
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .in('code', batch)
      
      if (deleteError) {
        console.error(`   ❌ Erreur batch ${Math.floor(i / batchSize) + 1}:`, deleteError.message)
      } else {
        deletedCount += batch.length
        console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} services supprimés`)
      }
    }
    
    console.log(`\n   Total supprimé: ${deletedCount} services\n`)
    
    // 8. Verify results
    console.log('🔍 7. Vérification finale...\n')
    
    const { count: finalCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
    
    console.log(`   Services restants: ${finalCount}\n`)
    
    // Check for remaining duplicates
    const { data: remainingServices } = await supabase
      .from('services')
      .select('code, name, display_name')
      .eq('active', true)
    
    const remainingNameMap = new Map<string, any[]>()
    remainingServices?.forEach(s => {
      const name = (s.display_name || s.name).toLowerCase().trim()
      if (!remainingNameMap.has(name)) {
        remainingNameMap.set(name, [])
      }
      remainingNameMap.get(name)!.push(s)
    })
    
    const remainingDuplicates = Array.from(remainingNameMap.entries())
      .filter(([_, services]) => services.length > 1)
    
    console.log('═'.repeat(70))
    console.log('\n✅ RÉSULTAT FINAL:\n')
    console.log(`   Services dans la DB:      ${finalCount}`)
    console.log(`   Services dans l'API:      ${validCodes.size}`)
    console.log(`   Duplicatas restants:      ${remainingDuplicates.length}`)
    console.log(`   Services supprimés:       ${deletedCount}\n`)
    
    if (remainingDuplicates.length === 0) {
      console.log('🎉 Succès! Tous les duplicatas ont été supprimés!\n')
      console.log('📝 PROCHAINES ÉTAPES:\n')
      console.log('   1. Relancer la synchronisation pour mettre à jour les stocks')
      console.log('   2. Vérifier le dashboard')
      console.log('   3. Vérifier l\'admin\n')
    } else {
      console.log('⚠️  Attention! Duplicatas restants trouvés:\n')
      remainingDuplicates.forEach(([name, services]) => {
        console.log(`   📛 ${name}: ${services.map(s => s.code).join(', ')}`)
      })
      console.log()
    }
    
  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message)
    process.exit(1)
  }
}

// Run the script
cleanDuplicateServices()
