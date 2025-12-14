import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Supabase Cloud (source)
const cloudUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const cloudSupabase = createClient(cloudUrl, cloudKey)

// Supabase Coolify (destination)
const coolifyUrl = 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io'
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoiYW5vbiJ9.sQx2T_ELM-QNRFx2tpDH7XWLyjYlFt1HORE_qjjwrNM'
const coolifySupabase = createClient(coolifyUrl, coolifyKey)

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

console.log('🔍 COMPARAISON SUPABASE CLOUD vs COOLIFY\n')
console.log('=' .repeat(80))

let totalCloud = 0
let totalCoolify = 0
let missingData = []

for (const table of tables) {
  try {
    // Compter dans Cloud
    const { count: cloudCount, error: cloudError } = await cloudSupabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    // Compter dans Coolify
    const { count: coolifyCount, error: coolifyError } = await coolifySupabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    const cloud = cloudError ? 0 : (cloudCount || 0)
    const coolify = coolifyError ? 0 : (coolifyCount || 0)
    
    totalCloud += cloud
    totalCoolify += coolify
    
    const status = cloud === coolify ? '✅' : (coolify === 0 && cloud > 0 ? '❌' : '⚠️')
    const diff = cloud - coolify
    
    if (cloud > 0 || coolify > 0) {
      console.log(`${status} ${table.padEnd(25)} Cloud: ${String(cloud).padStart(6)} | Coolify: ${String(coolify).padStart(6)} | Diff: ${diff > 0 ? '+' : ''}${diff}`)
      
      if (diff > 0) {
        missingData.push({ table, missing: diff, total: cloud })
      }
    }
  } catch (err) {
    console.log(`⚠️  ${table.padEnd(25)} Erreur: ${err.message}`)
  }
}

console.log('=' .repeat(80))
console.log(`\n📊 TOTAL: Cloud: ${totalCloud} | Coolify: ${totalCoolify} | Manquant: ${totalCloud - totalCoolify}`)

if (missingData.length > 0) {
  console.log('\n⚠️  DONNÉES MANQUANTES:')
  for (const { table, missing, total } of missingData) {
    const percent = ((total - missing) / total * 100).toFixed(1)
    console.log(`   - ${table}: ${missing}/${total} manquantes (${percent}% importées)`)
  }
} else {
  console.log('\n🎉 Toutes les données ont été importées avec succès !')
}
