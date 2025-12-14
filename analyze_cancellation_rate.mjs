#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('ANON_KEY:', SUPABASE_KEY ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('📊 ANALYSE TAUX D\'ANNULATION (72%)\n')
console.log('='.repeat(70))

// Analyse des 30 derniers jours
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

// 1. Statistiques globales par status
console.log('\n📈 1. STATISTIQUES PAR STATUS (30 derniers jours)\n')

const { data: activations, error: fetchError } = await supabase
  .from('activations')
  .select('status, service_code, country_code, price, created_at, expires_at, sms_code, sms_text')
  .gte('created_at', thirtyDaysAgo)
  .order('created_at', { ascending: false })

if (fetchError) {
  console.error('❌ Erreur fetch:', fetchError)
  process.exit(1)
}

console.log(`📦 Total activations récupérées: ${activations?.length || 0}\n`)

const stats = {}
activations?.forEach(a => {
  stats[a.status] = (stats[a.status] || 0) + 1
})

const total = activations?.length || 0
Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
  const percent = ((count / total) * 100).toFixed(1)
  const bar = '█'.repeat(Math.round(count / total * 50))
  console.log(`   ${status.padEnd(12)} : ${count.toString().padStart(4)} (${percent.padStart(5)}%) ${bar}`)
})

console.log(`\n   TOTAL: ${total} activations`)

// 2. Analyse par service (top cancellations)
console.log('\n📱 2. TOP 10 SERVICES PAR TAUX D\'ANNULATION\n')

const serviceStats = {}
activations?.forEach(a => {
  if (!serviceStats[a.service_code]) {
    serviceStats[a.service_code] = { total: 0, cancelled: 0, received: 0, timeout: 0 }
  }
  serviceStats[a.service_code].total++
  serviceStats[a.service_code][a.status]++
})

const serviceRates = Object.entries(serviceStats)
  .map(([service, data]) => ({
    service,
    total: data.total,
    cancelled: data.cancelled || 0,
    received: data.received || 0,
    timeout: data.timeout || 0,
    cancelRate: ((data.cancelled || 0) / data.total * 100).toFixed(1)
  }))
  .sort((a, b) => b.cancelRate - a.cancelRate)
  .slice(0, 10)

serviceRates.forEach((s, i) => {
  console.log(`   ${(i + 1).toString().padStart(2)}. ${s.service.padEnd(15)} | Total: ${s.total.toString().padStart(3)} | Cancel: ${s.cancelled.toString().padStart(3)} (${s.cancelRate}%) | Received: ${s.received.toString().padStart(3)}`)
})

// 3. Analyse par pays (top cancellations)
console.log('\n🌍 3. TOP 10 PAYS PAR TAUX D\'ANNULATION\n')

const countryStats = {}
activations?.forEach(a => {
  const country = a.country_code || 'unknown'
  if (!countryStats[country]) {
    countryStats[country] = { total: 0, cancelled: 0, received: 0, timeout: 0 }
  }
  countryStats[country].total++
  countryStats[country][a.status]++
})

const countryRates = Object.entries(countryStats)
  .map(([country, data]) => ({
    country,
    total: data.total,
    cancelled: data.cancelled || 0,
    received: data.received || 0,
    timeout: data.timeout || 0,
    cancelRate: ((data.cancelled || 0) / data.total * 100).toFixed(1)
  }))
  .filter(c => c.total >= 3) // Minimum 3 activations
  .sort((a, b) => b.cancelRate - a.cancelRate)
  .slice(0, 10)

countryRates.forEach((c, i) => {
  console.log(`   ${(i + 1).toString().padStart(2)}. ${c.country.padEnd(12)} | Total: ${c.total.toString().padStart(3)} | Cancel: ${c.cancelled.toString().padStart(3)} (${c.cancelRate}%) | Received: ${c.received.toString().padStart(3)}`)
})

// 4. Analyse temporelle (durée avant annulation)
console.log('\n⏱️  4. TEMPS AVANT ANNULATION\n')

const cancelledActivations = activations?.filter(a => a.status === 'cancelled') || []
const cancelTimes = []

for (const act of cancelledActivations.slice(0, 100)) { // Limiter à 100 pour performance
  const created = new Date(act.created_at)
  const expires = new Date(act.expires_at)
  const lifetime = (expires - created) / 60000 // en minutes
  cancelTimes.push(lifetime)
}

if (cancelTimes.length > 0) {
  const avg = cancelTimes.reduce((a, b) => a + b, 0) / cancelTimes.length
  const max = Math.max(...cancelTimes)
  const min = Math.min(...cancelTimes)
  
  console.log(`   Moyenne: ${avg.toFixed(1)} min`)
  console.log(`   Maximum: ${max.toFixed(1)} min`)
  console.log(`   Minimum: ${min.toFixed(1)} min`)
  
  // Distribution par tranches
  const ranges = {
    '0-5min': 0,
    '5-10min': 0,
    '10-15min': 0,
    '15-20min': 0,
    '>20min': 0
  }
  
  cancelTimes.forEach(t => {
    if (t < 5) ranges['0-5min']++
    else if (t < 10) ranges['5-10min']++
    else if (t < 15) ranges['10-15min']++
    else if (t < 20) ranges['15-20min']++
    else ranges['>20min']++
  })
  
  console.log('\n   Distribution:')
  Object.entries(ranges).forEach(([range, count]) => {
    const percent = ((count / cancelTimes.length) * 100).toFixed(1)
    const bar = '▓'.repeat(Math.round(count / cancelTimes.length * 30))
    console.log(`   ${range.padEnd(10)} : ${count.toString().padStart(3)} (${percent.padStart(5)}%) ${bar}`)
  })
}

// 5. Analyse des SMS reçus (combien ont reçu SMS mais annulé quand même?)
console.log('\n📨 5. ANALYSE SMS REÇUS\n')

const receivedCount = activations?.filter(a => a.status === 'received' && a.sms_code).length || 0
const receivedWithSms = activations?.filter(a => a.status === 'received' && a.sms_text).length || 0
const cancelledWithSms = activations?.filter(a => a.status === 'cancelled' && a.sms_text).length || 0

console.log(`   Received avec code: ${receivedCount}`)
console.log(`   Received avec SMS: ${receivedWithSms}`)
console.log(`   Cancelled avec SMS: ${cancelledWithSms} ⚠️ (SMS reçu mais annulé manuellement)`)

// 6. Comparaison avec/sans SMS
console.log('\n🔍 6. TAUX DE SUCCESS PAR SERVICE (Top 5)\n')

const serviceSuccess = Object.entries(serviceStats)
  .map(([service, data]) => ({
    service,
    total: data.total,
    received: data.received || 0,
    successRate: ((data.received || 0) / data.total * 100).toFixed(1)
  }))
  .filter(s => s.total >= 5) // Minimum 5 activations
  .sort((a, b) => b.successRate - a.successRate)
  .slice(0, 5)

console.log('   🏆 BEST SERVICES:')
serviceSuccess.forEach((s, i) => {
  console.log(`   ${(i + 1)}. ${s.service.padEnd(15)} | Success: ${s.successRate}% (${s.received}/${s.total})`)
})

const serviceWorst = Object.entries(serviceStats)
  .map(([service, data]) => ({
    service,
    total: data.total,
    received: data.received || 0,
    successRate: ((data.received || 0) / data.total * 100).toFixed(1)
  }))
  .filter(s => s.total >= 5) // Minimum 5 activations
  .sort((a, b) => a.successRate - b.successRate)
  .slice(0, 5)

console.log('\n   ⚠️  WORST SERVICES:')
serviceWorst.forEach((s, i) => {
  console.log(`   ${(i + 1)}. ${s.service.padEnd(15)} | Success: ${s.successRate}% (${s.received}/${s.total})`)
})

// 7. Recommandations
console.log('\n💡 7. RECOMMANDATIONS\n')

const cancelRate = ((stats.cancelled || 0) / total * 100).toFixed(1)
const recommendations = []

if (parseFloat(cancelRate) > 60) {
  recommendations.push('🚨 CRITIQUE: Taux d\'annulation >60% - Problème majeur de disponibilité')
}

if (cancelledWithSms > 0) {
  recommendations.push(`⚠️  ${cancelledWithSms} SMS reçus mais annulés - Vérifier UX du modal history`)
}

const avgCancelTime = cancelTimes.reduce((a, b) => a + b, 0) / cancelTimes.length
if (avgCancelTime < 10) {
  recommendations.push('⚡ Annulations rapides (<10min) - Utilisateurs ne veulent pas attendre')
}

// Services avec 0% success
const zeroSuccess = Object.entries(serviceStats)
  .filter(([_, data]) => data.total >= 5 && (data.received || 0) === 0)
  .map(([service]) => service)

if (zeroSuccess.length > 0) {
  recommendations.push(`🔴 ${zeroSuccess.length} services avec 0% success: ${zeroSuccess.join(', ')}`)
}

// Top services à problème
const topProblems = serviceWorst.slice(0, 3).map(s => s.service)
if (topProblems.length > 0) {
  recommendations.push(`🎯 Focus sur: ${topProblems.join(', ')} (taux success <20%)`)
}

if (recommendations.length === 0) {
  console.log('   ✅ Aucun problème majeur détecté')
} else {
  recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('✅ ANALYSE TERMINÉE\n')
