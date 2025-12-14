#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const REFRESH_INTERVAL = 30000 // 30 secondes

console.clear()
console.log('🎯 ONE SMS - LIVE MONITORING DASHBOARD')
console.log('Press Ctrl+C to exit\n')

async function fetchDashboard() {
  try {
    // Dashboard stats
    const { data: stats } = await supabase
      .from('v_dashboard_stats')
      .select('*')
      .single()

    // Service health
    const { data: services } = await supabase
      .from('v_service_health')
      .select('*')
      .order('total_activations_24h', { ascending: false })
      .limit(5)

    // Country health
    const { data: countries } = await supabase
      .from('v_country_health')
      .select('*')
      .order('total_activations_24h', { ascending: false })
      .limit(3)

    return { stats, services, countries }
  } catch (error) {
    console.error('❌ Error:', error.message)
    return null
  }
}

function getStatusEmoji(status) {
  const emojis = {
    'EXCELLENT': '🟢',
    'GOOD': '🟡',
    'WARNING': '🟠',
    'CRITICAL': '🔴',
    'HEALTHY': '✅',
    'INSUFFICIENT_DATA': 'ℹ️'
  }
  return emojis[status] || '❓'
}

function displayDashboard(data) {
  console.clear()
  
  const now = new Date().toLocaleString('fr-FR')
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║  🎯 ONE SMS - LIVE MONITORING DASHBOARD                       ║')
  console.log(`║  🕐 ${now.padEnd(56)} ║`)
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  if (!data) {
    console.log('⚠️  Unable to fetch data. Retrying...\n')
    return
  }

  const { stats, services, countries } = data

  // Global Stats
  if (stats) {
    const statusEmoji = getStatusEmoji(stats.global_health_status)
    const successBar = '█'.repeat(Math.round(stats.global_success_rate_pct / 2))
    
    console.log('┌─ 📊 GLOBAL STATS (24h) ────────────────────────────────────┐')
    console.log('│')
    console.log(`│  Status: ${statusEmoji} ${stats.global_health_status}`)
    console.log(`│  Success Rate: ${stats.global_success_rate_pct}% ${successBar}`)
    console.log('│')
    console.log(`│  Total: ${stats.total_activations_24h}  |  ✅ Success: ${stats.successful_24h}  |  ❌ Cancel: ${stats.cancelled_24h}  |  ⏱️  Timeout: ${stats.timeout_24h}`)
    console.log('└────────────────────────────────────────────────────────────┘\n')
  }

  // Services
  if (services && services.length > 0) {
    console.log('┌─ 📱 TOP 5 SERVICES (24h) ──────────────────────────────────┐')
    console.log('│')
    console.log('│  Service      Total   Success   Rate    Status')
    console.log('│  ───────────────────────────────────────────────────')
    
    services.forEach(s => {
      const emoji = getStatusEmoji(s.health_status)
      const line = `│  ${s.service_code.padEnd(12)} ${s.total_activations_24h.toString().padStart(4)}    ${s.successful_activations.toString().padStart(4)}     ${(s.success_rate_pct + '%').padStart(5)}   ${emoji} ${s.health_status}`
      console.log(line)
    })
    
    console.log('└────────────────────────────────────────────────────────────┘\n')
  }

  // Countries
  if (countries && countries.length > 0) {
    console.log('┌─ 🌍 TOP 3 COUNTRIES (24h) ─────────────────────────────────┐')
    console.log('│')
    console.log('│  Country        Total   Success   Rate    Status')
    console.log('│  ───────────────────────────────────────────────────')
    
    countries.forEach(c => {
      const emoji = getStatusEmoji(c.health_status)
      const line = `│  ${c.country_code.padEnd(14)} ${c.total_activations_24h.toString().padStart(4)}    ${c.successful_activations.toString().padStart(4)}     ${(c.success_rate_pct + '%').padStart(5)}   ${emoji} ${c.health_status}`
      console.log(line)
    })
    
    console.log('└────────────────────────────────────────────────────────────┘\n')
  }

  // Alerts
  if (stats) {
    const alerts = []
    
    if (stats.global_success_rate_pct < 20) {
      alerts.push('🔴 CRITICAL: Success rate <20%')
    } else if (stats.global_success_rate_pct < 35) {
      alerts.push('🟠 WARNING: Success rate <35%')
    }
    
    if (stats.timeout_24h > stats.successful_24h) {
      alerts.push('⚠️  Timeouts exceed successes!')
    }
    
    if (services) {
      const criticalServices = services.filter(s => s.health_status === 'CRITICAL')
      if (criticalServices.length > 0) {
        alerts.push(`🔴 ${criticalServices.length} services in CRITICAL state`)
      }
    }
    
    if (alerts.length > 0) {
      console.log('┌─ ⚠️  ALERTS ───────────────────────────────────────────────┐')
      console.log('│')
      alerts.forEach(alert => {
        console.log(`│  ${alert}`)
      })
      console.log('└────────────────────────────────────────────────────────────┘\n')
    } else {
      console.log('✅ No critical alerts\n')
    }
  }

  console.log(`\n🔄 Refreshing every ${REFRESH_INTERVAL / 1000}s... (Press Ctrl+C to exit)`)
}

// Initial display
const initialData = await fetchDashboard()
displayDashboard(initialData)

// Auto-refresh
setInterval(async () => {
  const data = await fetchDashboard()
  displayDashboard(data)
}, REFRESH_INTERVAL)
