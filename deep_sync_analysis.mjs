import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

async function deepAnalysis() {
  console.log('🔍 DEEP ANALYSIS - Synchronisation SMS-Activate\n')
  
  // 1. Vérifier le nombre total de pricing_rules
  console.log('1️⃣ Pricing Rules Analysis:')
  const { count: totalPricingRules } = await supabase
    .from('pricing_rules')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   Total pricing_rules: ${totalPricingRules}`)
  
  const { data: pricingByProvider, error: providerError } = await supabase
    .from('pricing_rules')
    .select('provider, active')
    .limit(10000)
  
  if (!providerError) {
    const smsActivateCount = pricingByProvider.filter(p => p.provider === 'sms-activate').length
    const smsActivateActive = pricingByProvider.filter(p => p.provider === 'sms-activate' && p.active).length
    console.log(`   SMS-Activate rules: ${smsActivateCount} (active: ${smsActivateActive})`)
  }
  
  // 2. Vérifier le total_available calculé
  console.log('\n2️⃣ Total Available Analysis:')
  const { data: allPricing } = await supabase
    .from('pricing_rules')
    .select('available_count, provider, active')
    .limit(50000)
  
  if (allPricing) {
    const total = allPricing.reduce((sum, p) => sum + (p.available_count || 0), 0)
    const smsActivateTotal = allPricing
      .filter(p => p.provider === 'sms-activate')
      .reduce((sum, p) => sum + (p.available_count || 0), 0)
    
    console.log(`   Total (all providers): ${total.toLocaleString()}`)
    console.log(`   Total (SMS-Activate only): ${smsActivateTotal.toLocaleString()}`)
    console.log(`   Records retrieved: ${allPricing.length}`)
  }
  
  // 3. Vérifier l'ordre des services
  console.log('\n3️⃣ Services Order Analysis:')
  const { data: services } = await supabase
    .from('services')
    .select('code, name, display_name, popularity_score, total_available, active')
    .order('popularity_score', { ascending: false })
    .limit(20)
  
  if (services) {
    console.log('   Top 20 services by popularity_score:')
    services.forEach((s, i) => {
      console.log(`   ${i+1}. ${s.code.padEnd(15)} - ${s.name.padEnd(20)} - Score: ${s.popularity_score} - Available: ${s.total_available || 0} - Active: ${s.active}`)
    })
  }
  
  // 4. Comparer avec l'ordre SMS-Activate attendu
  console.log('\n4️⃣ Expected SMS-Activate Order (from their website):')
  const expectedOrder = [
    'ig', 'wa', 'tg', 'go', 'fb', 'vk', 'tw', 'ok', 'vi', 'ds',
    'ot', 'nf', 'tk', 'wb', 'lf', 'sn', 'ub', 'ma', 'mb', 'av'
  ]
  
  console.log('   Expected:', expectedOrder.slice(0, 10).join(', '))
  
  const ourOrder = services?.map(s => s.code).slice(0, 10) || []
  console.log('   Our order:', ourOrder.join(', '))
  
  const matches = ourOrder.filter(code => expectedOrder.slice(0, 10).includes(code)).length
  console.log(`   Match rate: ${matches}/10 (${(matches/10*100).toFixed(0)}%)`)
  
  // 5. Vérifier les données d'un service populaire
  console.log('\n5️⃣ Sample Service Data (WhatsApp):')
  const { data: waPricing } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('service_code', 'whatsapp')
    .eq('provider', 'sms-activate')
    .limit(5)
  
  if (waPricing && waPricing.length > 0) {
    console.log('   WhatsApp pricing rules:')
    waPricing.forEach(p => {
      console.log(`   - ${p.country_code}: cost=${p.activation_cost}, price=${p.activation_price}, count=${p.available_count}`)
    })
  }
  
  // 6. Vérifier la structure de la dernière sync
  console.log('\n6️⃣ Last Sync Log:')
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()
  
  if (lastSync) {
    console.log(`   Type: ${lastSync.sync_type}`)
    console.log(`   Status: ${lastSync.status}`)
    console.log(`   Services synced: ${lastSync.services_synced}`)
    console.log(`   Countries synced: ${lastSync.countries_synced}`)
    console.log(`   Prices synced: ${lastSync.prices_synced}`)
    console.log(`   Started: ${new Date(lastSync.started_at).toLocaleString()}`)
    if (lastSync.completed_at) {
      console.log(`   Completed: ${new Date(lastSync.completed_at).toLocaleString()}`)
    }
  }
}

deepAnalysis().catch(console.error)
