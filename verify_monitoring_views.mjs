import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('📊 VÉRIFICATION VUES MONITORING\n')
console.log('='.repeat(70))

// 1. v_dashboard_stats
console.log('\n📈 DASHBOARD GLOBAL (24h)\n')
const { data: dashboard, error: dashError } = await supabase
  .from('v_dashboard_stats')
  .select('*')
  .single()

if (dashError) {
  console.log('❌ Erreur:', dashError.message)
} else if (dashboard) {
  console.log('Total activations:', dashboard.total_activations_24h)
  console.log('Successful:', dashboard.successful_24h)
  console.log('Cancelled:', dashboard.cancelled_24h)
  console.log('Timeout:', dashboard.timeout_24h)
  console.log('Success rate:', dashboard.global_success_rate_pct + '%')
  const statusEmoji = dashboard.global_health_status === 'CRITICAL' ? '🔴' : 
                      dashboard.global_health_status === 'WARNING' ? '⚠️' : '✅'
  console.log('Status:', statusEmoji, dashboard.global_health_status)
}

// 2. v_service_health
console.log('\n\n📱 TOP 10 SERVICES (24h)\n')
const { data: services, error: servError } = await supabase
  .from('v_service_health')
  .select('*')
  .limit(10)

if (servError) {
  console.log('❌ Erreur:', servError.message)
} else if (services && services.length > 0) {
  console.log('Service'.padEnd(12), '| Total | Success | Rate | Status')
  console.log('-'.repeat(70))
  services.forEach(s => {
    const emoji = s.health_status === 'HEALTHY' ? '✅' : 
                  s.health_status === 'WARNING' ? '⚠️' : 
                  s.health_status === 'CRITICAL' ? '🔴' : 'ℹ️'
    console.log(
      `${s.service_code.padEnd(12)} | ${s.total_activations_24h.toString().padStart(5)} | ${s.successful_activations.toString().padStart(7)} | ${(s.success_rate_pct + '%').padStart(4)} | ${emoji} ${s.health_status}`
    )
  })
} else {
  console.log('ℹ️  Aucune donnée (normal si pas d\'activations dans les 24h)')
}

// 3. v_country_health
console.log('\n\n🌍 TOP 5 PAYS (24h)\n')
const { data: countries, error: countryError } = await supabase
  .from('v_country_health')
  .select('*')
  .limit(5)

if (countryError) {
  console.log('❌ Erreur:', countryError.message)
} else if (countries && countries.length > 0) {
  console.log('Country'.padEnd(15), '| Total | Success | Rate | Status')
  console.log('-'.repeat(70))
  countries.forEach(c => {
    const emoji = c.health_status === 'HEALTHY' ? '✅' : 
                  c.health_status === 'WARNING' ? '⚠️' : 
                  c.health_status === 'CRITICAL' ? '🔴' : 'ℹ️'
    console.log(
      `${c.country_code.padEnd(15)} | ${c.total_activations_24h.toString().padStart(5)} | ${c.successful_activations.toString().padStart(7)} | ${(c.success_rate_pct + '%').padStart(4)} | ${emoji} ${c.health_status}`
    )
  })
}

// 4. v_service_response_time
console.log('\n\n⏱️  TEMPS DE RÉPONSE (7 jours)\n')
const { data: responseTimes, error: timeError } = await supabase
  .from('v_service_response_time')
  .select('*')
  .limit(5)

if (timeError) {
  console.log('❌ Erreur:', timeError.message)
} else if (responseTimes && responseTimes.length > 0) {
  console.log('Service'.padEnd(12), '| Count | Avg | Min | Max')
  console.log('-'.repeat(70))
  responseTimes.forEach(r => {
    console.log(
      `${r.service_code.padEnd(12)} | ${r.successful_count.toString().padStart(5)} | ${(r.avg_wait_minutes + 'min').padStart(6)} | ${(r.min_wait_minutes + 'min').padStart(6)} | ${(r.max_wait_minutes + 'min').padStart(6)}`
    )
  })
}

console.log('\n' + '='.repeat(70))
console.log('✅ VÉRIFICATION TERMINÉE')
