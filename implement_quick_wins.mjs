#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🚀 QUICK WINS - IMPLÉMENTATION\n')
console.log('='.repeat(70))

// Services à désactiver (100% échec sur 30 jours)
const criticalServices = ['sn', 'ew', 'lf', 'gr', 'mb', 'oi', 'tg', 'ep']

// Services avec warning (success <30%)
const warningServices = ['wa', 'go']

console.log('\n📋 PLAN D\'ACTION\n')
console.log('1. ❌ Désactiver services critiques (100% échec)')
console.log(`   Services: ${criticalServices.join(', ')}`)
console.log('\n2. ⚠️  Ajouter warnings sur services problématiques')
console.log(`   Services: ${warningServices.join(', ')}`)
console.log('\n3. 📊 Vérifier vues de monitoring')
console.log('\n' + '='.repeat(70))

// Vérifier les services
console.log('\n🔍 VÉRIFICATION SERVICES ACTUELS\n')

const { data: services, error: servicesError } = await supabase
  .from('services')
  .select('code, name, available, warning')
  .in('code', [...criticalServices, ...warningServices])

if (servicesError) {
  console.error('❌ Erreur:', servicesError.message)
} else if (!services || services.length === 0) {
  console.log('ℹ️  Aucun service trouvé dans la table services')
  console.log('   → Les services doivent être configurés manuellement dans Supabase')
} else {
  console.log('Services trouvés:')
  services.forEach(s => {
    const status = criticalServices.includes(s.code) ? '🔴 CRITIQUE' : 
                   warningServices.includes(s.code) ? '⚠️  WARNING' : '✅'
    console.log(`   ${status} ${s.code.padEnd(5)} | ${s.name?.padEnd(20) || 'N/A'.padEnd(20)} | Available: ${s.available} | Warning: ${s.warning || 'none'}`)
  })
}

// Vérifier les vues
console.log('\n\n📊 VÉRIFICATION VUES MONITORING\n')

const viewsToCheck = [
  'v_service_health',
  'v_country_health',
  'v_service_response_time',
  'v_dashboard_stats'
]

for (const viewName of viewsToCheck) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ ${viewName}: ${error.message}`)
    } else {
      console.log(`✅ ${viewName}: OK`)
    }
  } catch (e) {
    console.log(`❌ ${viewName}: ${e.message}`)
  }
}

// Afficher exemple de données v_service_health
console.log('\n\n📈 EXEMPLE: v_service_health (Top 5)\n')

const { data: healthData, error: healthError } = await supabase
  .from('v_service_health')
  .select('*')
  .limit(5)

if (healthError) {
  console.log('❌ Vue non disponible:', healthError.message)
  console.log('\n💡 Pour créer les vues, exécuter:')
  console.log('   psql <connection_string> -f create_health_views.sql')
} else if (healthData && healthData.length > 0) {
  console.log('Service'.padEnd(12), '| Total 24h | Success | Rate  | Status')
  console.log('-'.repeat(70))
  healthData.forEach(row => {
    const statusEmoji = row.health_status === 'HEALTHY' ? '✅' :
                        row.health_status === 'WARNING' ? '⚠️' :
                        row.health_status === 'CRITICAL' ? '🔴' : 'ℹ️'
    console.log(
      `${row.service_code.padEnd(12)} | ${row.total_activations_24h.toString().padStart(9)} | ${row.successful_activations.toString().padStart(7)} | ${(row.success_rate_pct + '%').padStart(5)} | ${statusEmoji} ${row.health_status}`
    )
  })
} else {
  console.log('ℹ️  Aucune donnée dans les dernières 24h')
}

// Recommandations SQL
console.log('\n\n💡 ACTIONS SQL À EXÉCUTER DANS SUPABASE\n')
console.log('-- 1. Créer les vues de monitoring')
console.log('-- Exécuter: create_health_views.sql')
console.log('')
console.log('-- 2. Désactiver services critiques')
criticalServices.forEach(code => {
  console.log(`UPDATE services SET available = false, warning = 'Service temporairement indisponible - Faible taux de livraison' WHERE code = '${code}';`)
})
console.log('')
console.log('-- 3. Ajouter warnings sur services problématiques')
warningServices.forEach(code => {
  console.log(`UPDATE services SET warning = '⚠️ Taux de livraison réduit actuellement (20-30%)' WHERE code = '${code}';`)
})

console.log('\n\n' + '='.repeat(70))
console.log('✅ VÉRIFICATION TERMINÉE\n')
console.log('Next steps:')
console.log('1. Exécuter create_health_views.sql dans Supabase SQL Editor')
console.log('2. Appliquer les UPDATE services ci-dessus')
console.log('3. Vérifier mapping SERVICE_CODE_MAP et COUNTRY_CODE_MAP')
console.log('4. Créer dashboard admin avec v_service_health')
