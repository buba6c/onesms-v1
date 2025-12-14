#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('📊 GÉNÉRATION RAPPORT QUOTIDIEN\n')
console.log('='.repeat(70))

const reportDate = new Date().toLocaleDateString('fr-FR')

// Fetch all data
const { data: stats } = await supabase.from('v_dashboard_stats').select('*').single()
const { data: services } = await supabase.from('v_service_health').select('*')
const { data: countries } = await supabase.from('v_country_health').select('*')

// Generate report
let report = `# 📊 RAPPORT QUOTIDIEN ONE SMS\n\n`
report += `**Date**: ${reportDate}\n`
report += `**Période**: Dernières 24 heures\n\n`
report += `---\n\n`

// Global stats
if (stats) {
  const emoji = stats.global_health_status === 'CRITICAL' ? '🔴' :
                stats.global_health_status === 'WARNING' ? '🟠' :
                stats.global_health_status === 'GOOD' ? '🟡' : '🟢'
  
  report += `## 🎯 PERFORMANCE GLOBALE\n\n`
  report += `**Status**: ${emoji} ${stats.global_health_status}\n\n`
  report += `| Métrique | Valeur |\n`
  report += `|----------|--------|\n`
  report += `| Total activations | ${stats.total_activations_24h} |\n`
  report += `| ✅ Succès | ${stats.successful_24h} |\n`
  report += `| ❌ Annulés | ${stats.cancelled_24h} |\n`
  report += `| ⏱️ Timeouts | ${stats.timeout_24h} |\n`
  report += `| **Taux de succès** | **${stats.global_success_rate_pct}%** |\n\n`
  
  // Progress bar
  const successBar = '█'.repeat(Math.round(stats.global_success_rate_pct / 2))
  const emptyBar = '░'.repeat(50 - Math.round(stats.global_success_rate_pct / 2))
  report += `\`\`\`\n${successBar}${emptyBar} ${stats.global_success_rate_pct}%\n\`\`\`\n\n`
}

// Services
if (services && services.length > 0) {
  report += `## 📱 SERVICES\n\n`
  
  const healthy = services.filter(s => s.health_status === 'HEALTHY')
  const warning = services.filter(s => s.health_status === 'WARNING')
  const critical = services.filter(s => s.health_status === 'CRITICAL')
  
  report += `- ✅ Healthy: ${healthy.length}\n`
  report += `- ⚠️ Warning: ${warning.length}\n`
  report += `- 🔴 Critical: ${critical.length}\n\n`
  
  report += `### Top 10 Services\n\n`
  report += `| Service | Total | Succès | Taux | Status |\n`
  report += `|---------|-------|--------|------|--------|\n`
  
  services
    .sort((a, b) => b.total_activations_24h - a.total_activations_24h)
    .slice(0, 10)
    .forEach(s => {
      const emoji = s.health_status === 'HEALTHY' ? '✅' :
                    s.health_status === 'WARNING' ? '⚠️' :
                    s.health_status === 'CRITICAL' ? '🔴' : 'ℹ️'
      report += `| ${s.service_code} | ${s.total_activations_24h} | ${s.successful_activations} | ${s.success_rate_pct}% | ${emoji} ${s.health_status} |\n`
    })
  report += `\n`
  
  // Critical services
  if (critical.length > 0) {
    report += `### ⚠️ Services en difficulté\n\n`
    critical.forEach(s => {
      report += `- **${s.service_code}**: ${s.total_activations_24h} activations, ${s.success_rate_pct}% succès\n`
    })
    report += `\n`
  }
}

// Countries
if (countries && countries.length > 0) {
  report += `## 🌍 PAYS\n\n`
  
  report += `### Top 5 Pays\n\n`
  report += `| Pays | Total | Succès | Taux | Status |\n`
  report += `|------|-------|--------|------|--------|\n`
  
  countries
    .sort((a, b) => b.total_activations_24h - a.total_activations_24h)
    .slice(0, 5)
    .forEach(c => {
      const emoji = c.health_status === 'HEALTHY' ? '✅' :
                    c.health_status === 'WARNING' ? '⚠️' :
                    c.health_status === 'CRITICAL' ? '🔴' : 'ℹ️'
      report += `| ${c.country_code} | ${c.total_activations_24h} | ${c.successful_activations} | ${c.success_rate_pct}% | ${emoji} ${c.health_status} |\n`
    })
  report += `\n`
}

// Recommendations
report += `## 💡 RECOMMANDATIONS\n\n`

const recommendations = []

if (stats) {
  if (stats.global_success_rate_pct < 20) {
    recommendations.push('🔴 **URGENT**: Taux de succès <20% - Vérifier disponibilité API')
  }
  if (stats.global_success_rate_pct < 35) {
    recommendations.push('⚠️ Taux de succès <35% - Désactiver services non performants')
  }
  if (stats.timeout_24h > stats.successful_24h) {
    recommendations.push('⚠️ Timeouts > Succès - Problème API ou quota')
  }
}

if (services) {
  const criticalServices = services.filter(s => 
    s.health_status === 'CRITICAL' && s.total_activations_24h >= 3
  )
  if (criticalServices.length > 0) {
    recommendations.push(`🔴 Désactiver ${criticalServices.length} services critiques: ${criticalServices.map(s => s.service_code).join(', ')}`)
  }
}

if (recommendations.length > 0) {
  recommendations.forEach((rec, i) => {
    report += `${i + 1}. ${rec}\n`
  })
} else {
  report += `✅ Aucune action urgente requise\n`
}

report += `\n---\n\n`
report += `*Généré automatiquement le ${new Date().toLocaleString('fr-FR')}*\n`

// Save report
const filename = `daily_report_${new Date().toISOString().split('T')[0]}.md`
writeFileSync(filename, report)

console.log(`\n✅ Rapport généré: ${filename}`)
console.log(`\n📋 Aperçu:\n`)
console.log(report)
