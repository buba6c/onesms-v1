import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import fs from 'fs'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 ANALYSE COMPLÈTE DU PROJET SUPABASE CLOUD\n')
console.log('=' .repeat(80))

// 1. TABLES ET DONNÉES
console.log('\n📊 1. TABLES ET DONNÉES')
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

let totalRows = 0
const dataStatus = {}

for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (!error && count > 0) {
      console.log(`✅ ${table.padEnd(30)} ${String(count).padStart(8)} lignes`)
      totalRows += count
      dataStatus[table] = count
    }
  } catch (err) {}
}

console.log(`\n📈 Total: ${totalRows} lignes de données`)

// 2. EDGE FUNCTIONS
console.log('\n\n⚡ 2. EDGE FUNCTIONS')
console.log('-' .repeat(80))

let functions = []
try {
  const functionsDir = 'supabase/functions'
  functions = fs.readdirSync(functionsDir)
    .filter(f => !f.startsWith('.') && !f.startsWith('_'))
  
  console.log(`✅ ${functions.length} Edge Functions trouvées:\n`)
  
  // Grouper par catégorie
  const categories = {
    'Paiements': [],
    'SMS/Activations': [],
    'Services': [],
    'Cron/Maintenance': [],
    'Webhooks': [],
    'Autres': []
  }
  
  for (const fn of functions) {
    if (fn.includes('payment') || fn.includes('moneroo') || fn.includes('moneyfusion') || fn.includes('paydunya') || fn.includes('paytech')) {
      categories['Paiements'].push(fn)
    } else if (fn.includes('sms') || fn.includes('activate') || fn.includes('rent')) {
      categories['SMS/Activations'].push(fn)
    } else if (fn.includes('sync') || fn.includes('service') || fn.includes('country')) {
      categories['Services'].push(fn)
    } else if (fn.includes('cron') || fn.includes('cleanup') || fn.includes('timeout')) {
      categories['Cron/Maintenance'].push(fn)
    } else if (fn.includes('webhook') || fn.includes('ipn')) {
      categories['Webhooks'].push(fn)
    } else {
      categories['Autres'].push(fn)
    }
  }
  
  for (const [cat, fns] of Object.entries(categories)) {
    if (fns.length > 0) {
      console.log(`\n   ${cat}: (${fns.length})`)
      for (const fn of fns) {
        console.log(`      - ${fn}`)
      }
    }
  }
} catch (err) {
  console.log('⚠️  Impossible de lire les Edge Functions')
}

// 3. MIGRATIONS
console.log('\n\n🔄 3. MIGRATIONS SQL')
console.log('-' .repeat(80))

try {
  const migrations = fs.readdirSync('supabase/migrations')
    .filter(f => f.endsWith('.sql'))
    .sort()
  
  console.log(`✅ ${migrations.length} migrations trouvées:\n`)
  
  const recent = migrations.slice(-10)
  console.log('   Dernières migrations:')
  for (const mig of recent) {
    const size = fs.statSync(`supabase/migrations/${mig}`).size
    console.log(`      - ${mig} (${(size / 1024).toFixed(1)} KB)`)
  }
} catch (err) {
  console.log('⚠️  Impossible de lire les migrations')
}

// 4. STORAGE/BUCKETS
console.log('\n\n💾 4. STORAGE (Buckets)')
console.log('-' .repeat(80))

try {
  const { data: buckets } = await supabase.storage.listBuckets()
  
  if (buckets && buckets.length > 0) {
    console.log(`✅ ${buckets.length} buckets trouvés:\n`)
    
    for (const bucket of buckets) {
      // Compter les fichiers dans chaque bucket
      const { data: files } = await supabase.storage
        .from(bucket.name)
        .list()
      
      const fileCount = files ? files.length : 0
      console.log(`   - ${bucket.name.padEnd(30)} ${bucket.public ? '(public)' : '(privé)'} ${fileCount} fichiers`)
    }
  } else {
    console.log('ℹ️  Aucun bucket de storage trouvé')
  }
} catch (err) {
  console.log('⚠️  Impossible d\'accéder au storage:', err.message)
}

// 5. AUTHENTICATION
console.log('\n\n🔐 5. AUTHENTICATION')
console.log('-' .repeat(80))

try {
  // Compter les utilisateurs auth
  const { count: authCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  
  console.log(`✅ ${authCount} utilisateurs enregistrés`)
  
  // Vérifier si email confirmation est activé
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['email_confirmation_enabled', 'smtp_configured'])
  
  if (settings && settings.length > 0) {
    console.log('\n   Paramètres email:')
    for (const s of settings) {
      console.log(`      - ${s.key}: ${s.value}`)
    }
  }
} catch (err) {
  console.log('⚠️  Impossible de vérifier l\'authentification')
}

// 6. SECRETS/ENVIRONMENT
console.log('\n\n🔑 6. SECRETS & VARIABLES D\'ENVIRONNEMENT')
console.log('-' .repeat(80))

try {
  const envFile = fs.readFileSync('.env', 'utf8')
  const secrets = envFile.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0])
  
  console.log(`✅ ${secrets.length} variables d'environnement configurées:\n`)
  
  const categories = {
    'Supabase': secrets.filter(s => s.includes('SUPABASE')),
    'APIs Externes': secrets.filter(s => s.includes('API') || s.includes('KEY') && !s.includes('SUPABASE')),
    'Database': secrets.filter(s => s.includes('DATABASE') || s.includes('POSTGRES')),
    'Email': secrets.filter(s => s.includes('SMTP') || s.includes('EMAIL')),
    'Paiements': secrets.filter(s => s.includes('MONEROO') || s.includes('MONEYFUSION') || s.includes('PAYDUNYA') || s.includes('PAYTECH')),
    'Autres': []
  }
  
  // Trouver les secrets non catégorisés
  const categorized = new Set([
    ...categories.Supabase,
    ...categories['APIs Externes'],
    ...categories.Database,
    ...categories.Email,
    ...categories.Paiements
  ])
  
  categories.Autres = secrets.filter(s => !categorized.has(s))
  
  for (const [cat, vars] of Object.entries(categories)) {
    if (vars.length > 0) {
      console.log(`   ${cat}:`)
      for (const v of vars) {
        console.log(`      - ${v}`)
      }
    }
  }
} catch (err) {
  console.log('⚠️  Impossible de lire le fichier .env')
}

// 7. CRON JOBS
console.log('\n\n⏰ 7. CRON JOBS')
console.log('-' .repeat(80))

const cronFunctions = functions.filter(f => f.startsWith('cron-'))
if (cronFunctions.length > 0) {
  console.log(`✅ ${cronFunctions.length} cron jobs configurés:\n`)
  for (const cron of cronFunctions) {
    console.log(`   - ${cron}`)
  }
} else {
  console.log('ℹ️  Aucun cron job trouvé')
}

// RÉSUMÉ
console.log('\n\n' + '=' .repeat(80))
console.log('📋 RÉSUMÉ DE LA MIGRATION')
console.log('=' .repeat(80))

console.log(`
✅ À MIGRER:

1. 📊 Données: ${totalRows.toLocaleString()} lignes dans ${Object.keys(dataStatus).length} tables
   - Données critiques: users, services, activations, transactions
   - Logs: rental_logs (${dataStatus.rental_logs || 0}), pricing_rules_archive (${dataStatus.pricing_rules_archive || 0})

2. ⚡ Edge Functions: ${functions.length} fonctions
   - Paiements (MoneyFusion, PayDunya, Moneroo, PayTech)
   - SMS/Activations (SMS Activate, 5SIM)
   - Services (sync, countries)
   - Webhooks & Cron jobs

3. 🔄 Migrations: Toutes les migrations SQL du dossier supabase/migrations/

4. 💾 Storage: Buckets à vérifier et transférer si nécessaire

5. 🔑 Secrets: Variables d'environnement à reconfigurer sur Coolify

6. 🔐 Auth: ${dataStatus.users || 0} utilisateurs avec leurs sessions

⚠️  IMPORTANT:
- Les Edge Functions doivent être redéployées sur Coolify
- Les secrets doivent être configurés dans Coolify
- Les cron jobs doivent être reconfigurés
- Les webhooks externes doivent pointer vers la nouvelle URL
`)

// Sauvegarder l'analyse
const report = {
  date: new Date().toISOString(),
  tables: dataStatus,
  totalRows,
  functions: functions.length,
  migrations: fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).length,
  users: dataStatus.users || 0
}

fs.writeFileSync('migration_report.json', JSON.stringify(report, null, 2))
console.log('📄 Rapport sauvegardé dans: migration_report.json\n')
