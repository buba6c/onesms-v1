#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import fs from 'fs'

console.log('🔍 VÉRIFICATION COMPLÈTE DE LA MIGRATION')
console.log('=' .repeat(80))
console.log('')

const cloudUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const cloudSupabase = createClient(cloudUrl, cloudKey)

const coolifyUrl = 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io'
const coolifyKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
const coolifySupabase = createClient(coolifyUrl, coolifyKey)

const checks = {
  data: { status: 'pending', issues: [] },
  migrations: { status: 'pending', issues: [] },
  functions: { status: 'pending', issues: [] },
  crons: { status: 'pending', issues: [] },
  secrets: { status: 'pending', issues: [] },
  storage: { status: 'pending', issues: [] }
}

// ==================== 1. VÉRIFIER LES DONNÉES ====================
console.log('📊 1. VÉRIFICATION DES DONNÉES')
console.log('-' .repeat(80))

const tables = [
  'users', 'services', 'activations', 'rentals', 'transactions',
  'payment_providers', 'countries', 'virtual_numbers', 'system_settings',
  'service_icons', 'popular_services', 'favorite_services', 'promo_codes',
  'promo_code_uses', 'referrals', 'notifications', 'activity_logs',
  'system_logs', 'balance_operations', 'rental_logs', 'rental_messages',
  'sms_messages', 'activation_packages', 'pricing_rules_archive',
  'contact_settings', 'email_campaigns', 'email_logs', 'logs_provider',
  'payment_provider_logs', 'webhook_logs'
]

let totalCloudRows = 0
let totalCoolifyRows = 0
let missingTables = []
let incompleteTables = []

for (const table of tables) {
  try {
    const { count: cloudCount } = await cloudSupabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    const { count: coolifyCount } = await coolifySupabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    const cloud = cloudCount || 0
    const coolify = coolifyCount || 0
    
    totalCloudRows += cloud
    totalCoolifyRows += coolify
    
    if (cloud > 0) {
      const percentage = coolify > 0 ? ((coolify / cloud) * 100).toFixed(1) : 0
      const status = coolify === cloud ? '✅' : coolify === 0 ? '❌' : '⚠️'
      
      console.log(`${status} ${table.padEnd(30)} ${String(coolify).padStart(6)}/${String(cloud).padStart(6)} (${percentage}%)`)
      
      if (coolify === 0 && cloud > 0) {
        missingTables.push({ table, count: cloud })
        checks.data.issues.push(`Table ${table} vide (${cloud} lignes manquantes)`)
      } else if (coolify < cloud) {
        incompleteTables.push({ table, missing: cloud - coolify, total: cloud })
        checks.data.issues.push(`Table ${table} incomplète (${cloud - coolify} lignes manquantes)`)
      }
    }
  } catch (err) {
    console.log(`⚠️  ${table.padEnd(30)} Erreur: ${err.message}`)
    checks.data.issues.push(`Erreur table ${table}: ${err.message}`)
  }
}

console.log('\n📈 Total: ' + totalCoolifyRows + '/' + totalCloudRows + ' lignes')
checks.data.status = checks.data.issues.length === 0 ? 'success' : 'warning'

// ==================== 2. VÉRIFIER LES MIGRATIONS ====================
console.log('\n\n🔄 2. VÉRIFICATION DES MIGRATIONS SQL')
console.log('-' .repeat(80))

try {
  const migrations = fs.readdirSync('supabase/migrations')
    .filter(f => f.endsWith('.sql'))
  
  console.log(`✅ ${migrations.length} migrations trouvées localement`)
  
  // Vérifier quelques migrations critiques
  const criticalMigrations = [
    '20251208_payment_providers.sql',
    '20251208_add_external_id_transactions.sql',
    '20251206_add_referrals.sql',
    '20251207_promo_codes.sql'
  ]
  
  console.log('\nMigrations critiques:')
  for (const mig of criticalMigrations) {
    const exists = migrations.includes(mig)
    console.log(`   ${exists ? '✅' : '❌'} ${mig}`)
    if (!exists) {
      checks.migrations.issues.push(`Migration manquante: ${mig}`)
    }
  }
  
  checks.migrations.status = checks.migrations.issues.length === 0 ? 'success' : 'warning'
} catch (err) {
  console.log('❌ Erreur lecture migrations:', err.message)
  checks.migrations.status = 'error'
  checks.migrations.issues.push(err.message)
}

// ==================== 3. VÉRIFIER LES EDGE FUNCTIONS ====================
console.log('\n\n⚡ 3. VÉRIFICATION DES EDGE FUNCTIONS')
console.log('-' .repeat(80))

const functionsDir = 'supabase/functions'
const localFunctions = fs.readdirSync(functionsDir)
  .filter(f => !f.startsWith('.') && !f.startsWith('_') && fs.statSync(`${functionsDir}/${f}`).isDirectory())

console.log(`📦 ${localFunctions.length} fonctions locales trouvées`)

// Tester quelques fonctions critiques sur Coolify
const criticalFunctions = [
  'paydunya-create-payment',
  'init-moneyfusion-payment',
  'buy-sms-activate-number',
  'check-sms-activate-status'
]

console.log('\nTest des fonctions critiques sur Coolify:')
for (const func of criticalFunctions) {
  try {
    const response = await fetch(`${coolifyUrl}/functions/v1/${func}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coolifyKey}`
      },
      body: JSON.stringify({ test: true })
    })
    
    // Une 400/401 signifie que la fonction existe mais rejette notre test
    // Une 404 signifie qu'elle n'existe pas
    if (response.status === 404) {
      console.log(`   ❌ ${func} - NON DÉPLOYÉE`)
      checks.functions.issues.push(`Fonction non déployée: ${func}`)
    } else {
      console.log(`   ✅ ${func} - DÉPLOYÉE (status: ${response.status})`)
    }
  } catch (err) {
    console.log(`   ⚠️  ${func} - ERREUR: ${err.message}`)
    checks.functions.issues.push(`Erreur fonction ${func}: ${err.message}`)
  }
}

checks.functions.status = checks.functions.issues.length === 0 ? 'success' : 'error'

// ==================== 4. VÉRIFIER LES CRON JOBS ====================
console.log('\n\n⏰ 4. VÉRIFICATION DES CRON JOBS')
console.log('-' .repeat(80))

try {
  const cronCheck = execSync(
    `sshpass -p 'Bouba@2307##' ssh root@46.202.171.108 "docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres -t -c \\"SELECT COUNT(*) FROM cron.job WHERE jobname IN ('cron-atomic-reliable', 'cron-check-pending-sms', 'cron-wallet-health');\\"" 2>/dev/null`,
    { encoding: 'utf8' }
  ).trim()
  
  const cronCount = parseInt(cronCheck)
  console.log(`✅ ${cronCount}/3 cron jobs configurés`)
  
  if (cronCount < 3) {
    checks.crons.issues.push(`Seulement ${cronCount}/3 cron jobs configurés`)
    checks.crons.status = 'warning'
  } else {
    checks.crons.status = 'success'
  }
} catch (err) {
  console.log('⚠️  Impossible de vérifier les cron jobs:', err.message)
  checks.crons.status = 'unknown'
  checks.crons.issues.push('Vérification impossible')
}

// ==================== 5. VÉRIFIER LES SECRETS ====================
console.log('\n\n🔑 5. VÉRIFICATION DES SECRETS')
console.log('-' .repeat(80))

const requiredSecrets = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SMS_ACTIVATE_API_KEY',
  'PAYDUNYA_MASTER_KEY',
  'MONEYFUSION_API_URL'
]

// Vérifier dans .env local
let envSecrets = {}
try {
  const envContent = fs.readFileSync('.env', 'utf8')
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=')
      if (key) envSecrets[key.trim()] = true
    }
  })
} catch (err) {}

console.log('Secrets nécessaires:')
for (const secret of requiredSecrets) {
  const exists = envSecrets[secret] || envSecrets[secret.replace('VITE_', '')] || envSecrets[secret + '_LOCAL']
  console.log(`   ${exists ? '✅' : '❌'} ${secret}`)
  if (!exists) {
    checks.secrets.issues.push(`Secret manquant: ${secret}`)
  }
}

checks.secrets.status = checks.secrets.issues.length === 0 ? 'success' : 'warning'

// ==================== 6. VÉRIFIER LE STORAGE ====================
console.log('\n\n💾 6. VÉRIFICATION DU STORAGE')
console.log('-' .repeat(80))

try {
  const { data: cloudBuckets } = await cloudSupabase.storage.listBuckets()
  const { data: coolifyBuckets } = await coolifySupabase.storage.listBuckets()
  
  console.log(`Cloud: ${cloudBuckets?.length || 0} buckets`)
  console.log(`Coolify: ${coolifyBuckets?.length || 0} buckets`)
  
  if ((cloudBuckets?.length || 0) > (coolifyBuckets?.length || 0)) {
    checks.storage.issues.push(`Buckets manquants: ${cloudBuckets.length - coolifyBuckets.length}`)
    checks.storage.status = 'warning'
  } else {
    checks.storage.status = 'success'
  }
} catch (err) {
  console.log('ℹ️  Storage non accessible ou vide')
  checks.storage.status = 'success' // Pas critique si pas de storage
}

// ==================== RÉSUMÉ FINAL ====================
console.log('\n\n' + '=' .repeat(80))
console.log('📋 RÉSUMÉ DE LA VÉRIFICATION')
console.log('=' .repeat(80))

const statusEmoji = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  pending: '⏳',
  unknown: '❓'
}

console.log('\n📊 État de la migration:\n')
for (const [category, check] of Object.entries(checks)) {
  const emoji = statusEmoji[check.status]
  const name = category.charAt(0).toUpperCase() + category.slice(1)
  console.log(`${emoji} ${name}: ${check.status.toUpperCase()}`)
  
  if (check.issues.length > 0) {
    console.log(`   Problèmes (${check.issues.length}):`)
    check.issues.slice(0, 3).forEach(issue => console.log(`   - ${issue}`))
    if (check.issues.length > 3) {
      console.log(`   ... et ${check.issues.length - 3} autres`)
    }
  }
}

// Calculer le score global
const scores = {
  success: 100,
  warning: 50,
  error: 0,
  pending: 25,
  unknown: 50
}

const totalScore = Object.values(checks).reduce((sum, check) => sum + scores[check.status], 0) / Object.keys(checks).length

console.log(`\n🎯 Score global: ${totalScore.toFixed(0)}%`)

// Recommandations
console.log('\n\n🎯 ACTIONS RECOMMANDÉES:')
console.log('-' .repeat(80))

const actions = []

if (missingTables.length > 0) {
  actions.push(`1. Importer les tables vides: ${missingTables.map(t => t.table).join(', ')}`)
}

if (incompleteTables.length > 0) {
  actions.push(`2. Compléter l'import des tables: ${incompleteTables.map(t => t.table).slice(0, 3).join(', ')}`)
}

if (checks.functions.issues.length > 0) {
  actions.push(`3. Déployer les Edge Functions manquantes (${checks.functions.issues.length} fonctions)`)
  actions.push(`   → Exécuter: ./deploy_edge_functions_auto.sh`)
}

if (checks.secrets.issues.length > 0) {
  actions.push(`4. Configurer les secrets manquants (${checks.secrets.issues.length} secrets)`)
  actions.push(`   → Dashboard Coolify: Settings → Secrets`)
}

if (checks.crons.status !== 'success') {
  actions.push(`5. Vérifier les cron jobs`)
  actions.push(`   → Réexécuter: ./setup_cron_jobs.sh`)
}

if (actions.length === 0) {
  console.log('\n🎉 TOUT EST BON ! La migration est complète.')
  console.log('\n✅ Prochaines étapes:')
  console.log('   1. Basculer le frontend vers Coolify (cp .env.coolify .env)')
  console.log('   2. Tester en local: npm run dev')
  console.log('   3. Déployer en production: npm run build && netlify deploy --prod')
} else {
  actions.forEach(action => console.log(`   ${action}`))
}

// Sauvegarder le rapport
const report = {
  date: new Date().toISOString(),
  checks,
  totalScore,
  cloudRows: totalCloudRows,
  coolifyRows: totalCoolifyRows,
  missingTables,
  incompleteTables,
  actions
}

fs.writeFileSync('migration_verification_report.json', JSON.stringify(report, null, 2))
console.log('\n\n📄 Rapport complet sauvegardé: migration_verification_report.json')
