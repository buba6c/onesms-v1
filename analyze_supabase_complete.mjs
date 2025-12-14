#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 ANALYSE COMPLÈTE DU PROJET SUPABASE CLOUD')
console.log('=' .repeat(80))
console.log('')

// ==================== 1. EDGE FUNCTIONS ====================
console.log('⚡ 1. EDGE FUNCTIONS - ANALYSE DÉTAILLÉE')
console.log('-' .repeat(80))

const functionsDir = 'supabase/functions'
const functions = fs.readdirSync(functionsDir)
  .filter(f => !f.startsWith('.') && !f.startsWith('_') && fs.statSync(path.join(functionsDir, f)).isDirectory())

// Analyser chaque fonction
const functionAnalysis = {}

for (const funcName of functions) {
  const funcPath = path.join(functionsDir, funcName)
  const indexPath = path.join(funcPath, 'index.ts')
  
  if (!fs.existsSync(indexPath)) continue
  
  const code = fs.readFileSync(indexPath, 'utf8')
  
  // Analyser les dépendances
  const analysis = {
    name: funcName,
    hasAuth: code.includes('auth.getUser') || code.includes('jwt') || code.includes('Authorization'),
    usesCors: code.includes('cors') || code.includes('Access-Control'),
    usesDatabase: code.includes('supabase.from') || code.includes('.select') || code.includes('.insert'),
    isWebhook: funcName.includes('webhook') || funcName.includes('ipn'),
    isCron: funcName.startsWith('cron-'),
    externalAPIs: [],
    secrets: [],
    complexity: 'low'
  }
  
  // Détecter les APIs externes
  if (code.includes('sms-activate') || code.includes('SMS_ACTIVATE')) {
    analysis.externalAPIs.push('SMS Activate')
    analysis.secrets.push('SMS_ACTIVATE_API_KEY')
  }
  if (code.includes('5sim') || code.includes('5SIM')) {
    analysis.externalAPIs.push('5SIM')
    analysis.secrets.push('FIVESIM_API_KEY')
  }
  if (code.includes('moneyfusion') || code.includes('MONEYFUSION')) {
    analysis.externalAPIs.push('MoneyFusion')
    analysis.secrets.push('MONEYFUSION_API_URL', 'MONEYFUSION_MERCHANT_ID')
  }
  if (code.includes('paydunya') || code.includes('PAYDUNYA')) {
    analysis.externalAPIs.push('PayDunya')
    analysis.secrets.push('PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY', 'PAYDUNYA_TOKEN')
  }
  if (code.includes('moneroo') || code.includes('MONEROO')) {
    analysis.externalAPIs.push('Moneroo')
    analysis.secrets.push('MONEROO_PUBLIC_KEY', 'MONEROO_WEBHOOK_SECRET')
  }
  if (code.includes('paytech') || code.includes('PAYTECH')) {
    analysis.externalAPIs.push('PayTech')
    analysis.secrets.push('PAYTECH_API_KEY', 'PAYTECH_API_SECRET')
  }
  
  // Estimer la complexité
  const lines = code.split('\n').length
  if (lines > 300) analysis.complexity = 'high'
  else if (lines > 150) analysis.complexity = 'medium'
  
  functionAnalysis[funcName] = analysis
}

// Regrouper par catégorie
const categories = {
  'Paiements (Critique)': [],
  'SMS/Activations (Critique)': [],
  'Webhooks': [],
  'Cron Jobs': [],
  'Services/Sync': [],
  'Utilitaires': []
}

for (const [name, info] of Object.entries(functionAnalysis)) {
  if (info.isWebhook) {
    categories['Webhooks'].push({ name, ...info })
  } else if (info.isCron) {
    categories['Cron Jobs'].push({ name, ...info })
  } else if (info.externalAPIs.some(api => ['MoneyFusion', 'PayDunya', 'Moneroo', 'PayTech'].includes(api))) {
    categories['Paiements (Critique)'].push({ name, ...info })
  } else if (info.externalAPIs.includes('SMS Activate') || info.externalAPIs.includes('5SIM')) {
    categories['SMS/Activations (Critique)'].push({ name, ...info })
  } else if (name.includes('sync') || name.includes('service') || name.includes('country')) {
    categories['Services/Sync'].push({ name, ...info })
  } else {
    categories['Utilitaires'].push({ name, ...info })
  }
}

// Afficher par catégorie avec priorité
for (const [category, funcs] of Object.entries(categories)) {
  if (funcs.length === 0) continue
  
  const isCritical = category.includes('Critique')
  const emoji = isCritical ? '🔴' : (category === 'Webhooks' ? '📨' : category === 'Cron Jobs' ? '⏰' : '📦')
  
  console.log(`\n${emoji} ${category}: ${funcs.length} fonction(s)`)
  
  for (const func of funcs) {
    console.log(`   ${isCritical ? '⚠️' : '•'} ${func.name}`)
    if (func.externalAPIs.length > 0) {
      console.log(`      APIs: ${func.externalAPIs.join(', ')}`)
    }
    if (func.secrets.length > 0) {
      console.log(`      Secrets: ${func.secrets.join(', ')}`)
    }
    console.log(`      Complexité: ${func.complexity} | Auth: ${func.hasAuth ? 'Oui' : 'Non'} | DB: ${func.usesDatabase ? 'Oui' : 'Non'}`)
  }
}

// ==================== 2. CRON JOBS ====================
console.log('\n\n⏰ 2. CRON JOBS - CONFIGURATION')
console.log('-' .repeat(80))

const cronFunctions = Object.entries(functionAnalysis).filter(([name]) => name.startsWith('cron-'))

for (const [name, info] of cronFunctions) {
  console.log(`\n📅 ${name}`)
  
  // Lire le code pour trouver la fréquence suggérée
  const funcPath = path.join(functionsDir, name, 'index.ts')
  const code = fs.readFileSync(funcPath, 'utf8')
  
  // Détecter la fréquence dans les commentaires ou le code
  const frequencyMatch = code.match(/\/\/.*?(\d+)\s*(minute|hour|day)/i) || 
                         code.match(/every\s+(\d+)\s*(minute|hour|day)/i)
  
  const frequency = frequencyMatch ? `Toutes les ${frequencyMatch[1]} ${frequencyMatch[2]}(s)` : 'Non spécifiée'
  
  console.log(`   Fréquence suggérée: ${frequency}`)
  console.log(`   Description: ${info.externalAPIs.length > 0 ? `Utilise ${info.externalAPIs.join(', ')}` : 'Maintenance système'}`)
  
  // Configuration pg_cron suggérée
  let cronSchedule = '*/5 * * * *' // Défaut: toutes les 5 minutes
  if (name.includes('wallet') || name.includes('health')) cronSchedule = '*/15 * * * *'
  if (name.includes('cleanup') || name.includes('timeout')) cronSchedule = '*/10 * * * *'
  
  console.log(`   Cron expression: ${cronSchedule}`)
  console.log(`   Commande SQL:`)
  console.log(`      SELECT cron.schedule('${name}', '${cronSchedule}', $$`)
  console.log(`        SELECT net.http_post(`)
  console.log(`          url := 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/${name}',`)
  console.log(`          headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb`)
  console.log(`        )`)
  console.log(`      $$);`)
}

// ==================== 3. SECRETS NÉCESSAIRES ====================
console.log('\n\n🔑 3. SECRETS & VARIABLES D\'ENVIRONNEMENT')
console.log('-' .repeat(80))

// Collecter tous les secrets uniques
const allSecrets = new Set()
for (const info of Object.values(functionAnalysis)) {
  info.secrets.forEach(s => allSecrets.add(s))
}

// Lire le .env actuel
let currentEnv = {}
try {
  const envContent = fs.readFileSync('.env', 'utf8')
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      if (key) currentEnv[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (err) {}

// Organiser par catégorie
const secretsByCategory = {
  'Supabase': ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  'SMS Activate': ['SMS_ACTIVATE_API_KEY', 'SMS_ACTIVATE_API_URL'],
  '5SIM': ['FIVESIM_API_KEY'],
  'PayDunya': ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY', 'PAYDUNYA_TOKEN', 'PAYDUNYA_MODE'],
  'MoneyFusion': ['MONEYFUSION_API_URL', 'MONEYFUSION_MERCHANT_ID', 'MONEYFUSION_SECRET_KEY'],
  'Moneroo': ['MONEROO_PUBLIC_KEY', 'MONEROO_WEBHOOK_SECRET'],
  'PayTech': ['PAYTECH_API_KEY', 'PAYTECH_API_SECRET'],
  'Email/SMTP': ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'],
  'Autres': []
}

console.log('\n📋 Variables à configurer sur Coolify:\n')

for (const [category, keys] of Object.entries(secretsByCategory)) {
  const relevantKeys = keys.filter(k => allSecrets.has(k) || currentEnv[k] || category === 'Supabase')
  if (relevantKeys.length === 0 && category !== 'Supabase') continue
  
  console.log(`   ${category}:`)
  for (const key of relevantKeys) {
    const hasValue = currentEnv[key] ? '✅' : '❌'
    const value = currentEnv[key] ? (currentEnv[key].length > 30 ? currentEnv[key].substring(0, 30) + '...' : currentEnv[key]) : 'NON CONFIGURÉ'
    console.log(`      ${hasValue} ${key}`)
    if (key === 'SUPABASE_URL' || key === 'SUPABASE_SERVICE_ROLE_KEY') {
      console.log(`         → Coolify: ${key === 'SUPABASE_URL' ? 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io' : 'eyJ0eXAi...(déjà récupéré)'}`)
    }
  }
}

// ==================== 4. DÉPENDANCES ====================
console.log('\n\n📦 4. DÉPENDANCES DÉTECTÉES')
console.log('-' .repeat(80))

// Analyser import.map.json ou deno.json dans _shared
const sharedPath = path.join(functionsDir, '_shared')
if (fs.existsSync(sharedPath)) {
  console.log('\n✅ Dossier _shared trouvé avec utilitaires communs')
  
  const sharedFiles = fs.readdirSync(sharedPath).filter(f => f.endsWith('.ts'))
  console.log(`   Fichiers partagés: ${sharedFiles.join(', ')}`)
}

// Chercher les imports dans les fonctions
const externalDeps = new Set()
for (const funcName of functions) {
  const indexPath = path.join(functionsDir, funcName, 'index.ts')
  if (!fs.existsSync(indexPath)) continue
  
  const code = fs.readFileSync(indexPath, 'utf8')
  const imports = code.match(/from ['"]([^'"]+)['"]/g) || []
  
  imports.forEach(imp => {
    const dep = imp.match(/from ['"]([^'"]+)['"]/)?.[1]
    if (dep && !dep.startsWith('.') && !dep.startsWith('std/')) {
      externalDeps.add(dep)
    }
  })
}

console.log('\n📚 Dépendances externes:')
if (externalDeps.size > 0) {
  externalDeps.forEach(dep => console.log(`   - ${dep}`))
} else {
  console.log('   ℹ️  Utilise uniquement Deno std et modules locaux')
}

// ==================== 5. WEBHOOKS EXTERNES ====================
console.log('\n\n📨 5. WEBHOOKS - URLs À METTRE À JOUR')
console.log('-' .repeat(80))

const webhooks = [
  { service: 'PayDunya', function: 'paydunya-webhook', dashboard: 'https://paydunya.com/dashboard/webhooks' },
  { service: 'MoneyFusion', function: 'moneyfusion-webhook', dashboard: 'https://moneyfusion.com/settings/webhooks' },
  { service: 'Moneroo', function: 'moneroo-webhook', dashboard: 'https://moneroo.com/dashboard/webhooks' },
  { service: 'PayTech', function: 'paytech-ipn', dashboard: 'https://paytech.sn/dashboard' },
  { service: 'SMS Activate', function: 'webhook-sms-activate', dashboard: 'https://sms-activate.org/en/api2' }
]

console.log('\n⚠️  URLs de webhook à mettre à jour dans les dashboards:\n')
for (const webhook of webhooks) {
  const newUrl = `http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/${webhook.function}`
  console.log(`   ${webhook.service}:`)
  console.log(`      Nouvelle URL: ${newUrl}`)
  console.log(`      Dashboard: ${webhook.dashboard}`)
  console.log('')
}

// ==================== RÉSUMÉ MIGRATION ====================
console.log('\n' + '=' .repeat(80))
console.log('📋 PLAN D\'ACTION POUR DÉPLOIEMENT SUR COOLIFY')
console.log('=' .repeat(80))

const criticalFunctions = [
  ...categories['Paiements (Critique)'].map(f => f.name),
  ...categories['SMS/Activations (Critique)'].map(f => f.name)
]

console.log(`
✅ ÉTAPES À SUIVRE:

1️⃣  CONFIGURER LES SECRETS SUR COOLIFY (${allSecrets.size} variables)
   → Via dashboard Coolify Supabase: Settings → Secrets
   → Ou via SSH: docker exec supabase-edge-functions-xxx env
   
2️⃣  DÉPLOYER LES EDGE FUNCTIONS (${functions.length} fonctions)
   
   🔴 PRIORITÉ 1 - Critiques (${criticalFunctions.length} fonctions):
${criticalFunctions.map(f => `      - ${f}`).join('\n')}
   
   📦 PRIORITÉ 2 - Services/Sync (${categories['Services/Sync'].length} fonctions)
   ⏰ PRIORITÉ 3 - Cron Jobs (${cronFunctions.length} fonctions)
   📨 PRIORITÉ 4 - Webhooks (${categories['Webhooks'].length} fonctions)
   
   Méthodes de déploiement:
   a) Via Supabase CLI (recommandé):
      supabase functions deploy --project-ref default
      
   b) Manuellement via SSH + Docker
   
3️⃣  CONFIGURER LES CRON JOBS (${cronFunctions.length} tâches)
   → Utiliser pg_cron extension
   → Voir les commandes SQL ci-dessus
   
4️⃣  METTRE À JOUR LES WEBHOOKS EXTERNES (${webhooks.length} services)
   → Voir les URLs ci-dessus
   
5️⃣  TESTER CHAQUE FONCTION CRITIQUE
   → Paiements: créer un paiement test
   → SMS: acheter une activation test
   → Webhooks: vérifier les logs

⏱️  TEMPS ESTIMÉ: 2-3 heures pour tout déployer et configurer
`)

// Sauvegarder l'analyse
const fullAnalysis = {
  date: new Date().toISOString(),
  functions: functionAnalysis,
  categories,
  cronJobs: cronFunctions.length,
  secrets: Array.from(allSecrets),
  webhooks,
  criticalFunctions
}

fs.writeFileSync('supabase_analysis_complete.json', JSON.stringify(fullAnalysis, null, 2))
console.log('📄 Analyse complète sauvegardée: supabase_analysis_complete.json\n')
