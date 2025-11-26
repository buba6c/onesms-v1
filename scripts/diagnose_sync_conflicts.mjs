#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC - Détection des conflits de synchronisation
 * 
 * Ce script vérifie:
 * 1. Les différences entre services.total_available et SUM(pricing_rules.available_count)
 * 2. Les derniers syncs et leur timing
 * 3. Les conflits potentiels
 * 4. L'historique des changements
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('\n' + '='.repeat(70))
console.log('🔍 DIAGNOSTIC - CONFLITS DE SYNCHRONISATION')
console.log('='.repeat(70))

// 1️⃣ VÉRIFIER LES TOTAUX SERVICES
console.log('\n📊 1. VÉRIFICATION SERVICES.TOTAL_AVAILABLE vs PRICING_RULES\n')

const { data: services } = await supabase
  .from('services')
  .select('code, name, total_available')
  .eq('active', true)
  .order('total_available', { ascending: false })
  .limit(10)

console.log('Top 10 services par total_available:\n')

const conflicts = []

for (const service of services || []) {
  // Calculer le total réel depuis pricing_rules
  const { data: pricingRules } = await supabase
    .from('pricing_rules')
    .select('available_count')
    .eq('service_code', service.code)
    .eq('active', true)
  
  const realTotal = pricingRules?.reduce((sum, pr) => sum + (pr.available_count || 0), 0) || 0
  const dbTotal = service.total_available || 0
  const diff = realTotal - dbTotal
  const diffPercent = dbTotal > 0 ? ((diff / dbTotal) * 100).toFixed(1) : 0
  
  const icon = Math.abs(diff) < 1000 ? '✅' : '⚠️'
  
  console.log(`${icon} ${service.name} (${service.code}):`)
  console.log(`   DB total_available:      ${dbTotal.toLocaleString()}`)
  console.log(`   Sum pricing_rules:       ${realTotal.toLocaleString()}`)
  console.log(`   Différence:              ${diff.toLocaleString()} (${diffPercent}%)`)
  
  if (Math.abs(diff) > 1000) {
    conflicts.push({
      service: service.name,
      code: service.code,
      dbTotal,
      realTotal,
      diff,
      diffPercent
    })
  }
  
  console.log()
}

// 2️⃣ ANALYSER LES DERNIERS SYNCS
console.log('='.repeat(70))
console.log('📝 2. HISTORIQUE DES SYNCS (dernières 24h)\n')

const { data: logs } = await supabase
  .from('sync_logs')
  .select('*')
  .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .order('started_at', { ascending: false })
  .limit(20)

const logsByType = {}

for (const log of logs || []) {
  if (!logsByType[log.sync_type]) {
    logsByType[log.sync_type] = []
  }
  logsByType[log.sync_type].push(log)
}

for (const [type, typeLogs] of Object.entries(logsByType)) {
  console.log(`\n🔄 ${type.toUpperCase()} (${typeLogs.length} syncs)\n`)
  
  typeLogs.slice(0, 5).forEach((log, i) => {
    const time = new Date(log.started_at).toLocaleTimeString('fr-FR')
    const status = log.status === 'success' ? '✅' : '❌'
    
    console.log(`${status} ${time}`)
    if (log.services_synced) console.log(`   Services: ${log.services_synced}`)
    if (log.countries_synced) console.log(`   Pays: ${log.countries_synced}`)
    if (log.prices_synced) console.log(`   Prix: ${log.prices_synced}`)
    if (log.error_message) console.log(`   ❌ Erreur: ${log.error_message}`)
  })
}

// 3️⃣ TIMELINE DES SYNCS
console.log('\n' + '='.repeat(70))
console.log('⏱️  3. TIMELINE DES DERNIERS SYNCS\n')

const timeline = logs?.slice(0, 10).map(log => ({
  time: new Date(log.started_at).toLocaleTimeString('fr-FR'),
  type: log.sync_type,
  status: log.status
})) || []

timeline.forEach(({ time, type, status }) => {
  const icon = status === 'success' ? '✅' : '❌'
  console.log(`${time} ${icon} ${type.padEnd(15)} ${status}`)
})

// 4️⃣ DÉTECTION DE PATTERNS
console.log('\n' + '='.repeat(70))
console.log('🔎 4. DÉTECTION DE PATTERNS PROBLÉMATIQUES\n')

// Détecter si sync-service-counts tourne encore
const serviceCounts = logsByType['services'] || []
const hasServiceCountsSync = serviceCounts.some(log => 
  log.countries_synced <= 5 && log.services_synced > 0
)

if (hasServiceCountsSync) {
  console.log('⚠️  PROBLÈME DÉTECTÉ: sync-service-counts actif!')
  console.log('   → Ce sync écrase les calculs de sync-sms-activate')
  console.log('   → Recommandation: Désactiver ce workflow')
  console.log()
}

// Détecter la fréquence des syncs
const last5Services = serviceCounts.slice(0, 5)
if (last5Services.length >= 2) {
  const intervals = []
  for (let i = 0; i < last5Services.length - 1; i++) {
    const diff = new Date(last5Services[i].started_at) - new Date(last5Services[i + 1].started_at)
    intervals.push(Math.floor(diff / 60000)) // en minutes
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  
  console.log(`📊 Fréquence moyenne des syncs services: ${avgInterval.toFixed(0)} minutes`)
  
  if (avgInterval < 20) {
    console.log('⚠️  Fréquence élevée détectée (< 20 min)')
    console.log('   → Risque de conflits entre syncs')
    console.log()
  }
}

// 5️⃣ RÉSUMÉ ET RECOMMANDATIONS
console.log('='.repeat(70))
console.log('💡 5. RÉSUMÉ ET RECOMMANDATIONS\n')

if (conflicts.length > 0) {
  console.log(`⚠️  ${conflicts.length} services avec incohérences détectées:\n`)
  conflicts.forEach(c => {
    console.log(`   • ${c.service} (${c.code}): ${c.diffPercent}% de différence`)
  })
  console.log()
}

console.log('📋 ACTIONS RECOMMANDÉES:\n')

if (hasServiceCountsSync) {
  console.log('1. 🔴 URGENT: Désactiver sync-service-counts')
  console.log('   → mv .github/workflows/sync-service-counts.yml \\')
  console.log('        .github/workflows/sync-service-counts.yml.disabled')
  console.log()
}

if (conflicts.length > 0) {
  console.log('2. 🔧 Recalculer les totaux:')
  console.log('   → Se connecter à Supabase SQL Editor')
  console.log('   → SELECT calculate_service_totals();')
  console.log()
}

console.log('3. 📊 Vérifier les syncs dans Admin Dashboard')
console.log('   → Cliquer sur "Synchroniser avec SMS-Activate"')
console.log('   → Attendre 5 min pour voir si les totaux restent stables')
console.log()

console.log('4. 📝 Corriger le mapping des pays dans sync-countries')
console.log('   → ID 12 = England (pas USA)')
console.log('   → ID 187 = USA')
console.log()

// 6️⃣ STATS FINALES
console.log('='.repeat(70))
console.log('📊 STATISTIQUES FINALES\n')

const { count: totalServices } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

const { count: totalPricingRules } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

const { count: totalCountries } = await supabase
  .from('countries')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

const { data: sumTotal } = await supabase
  .from('services')
  .select('total_available')
  .eq('active', true)

const totalAvailable = sumTotal?.reduce((sum, s) => sum + (s.total_available || 0), 0) || 0

console.log(`📱 Services actifs:        ${totalServices}`)
console.log(`💰 Pricing rules actives:  ${totalPricingRules?.toLocaleString()}`)
console.log(`🌍 Pays actifs:            ${totalCountries}`)
console.log(`📊 Total numéros:          ${totalAvailable.toLocaleString()}`)
console.log()

console.log('='.repeat(70))
console.log('✅ DIAGNOSTIC TERMINÉ')
console.log('='.repeat(70) + '\n')
