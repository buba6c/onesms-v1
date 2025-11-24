import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

console.log('�� TEST COMPLET PLATEFORME - CÔTÉ ADMIN\n')
console.log('=' .repeat(60))

// 1. TEST GESTION UTILISATEURS
console.log('\n👥 1. GESTION UTILISATEURS')
console.log('-'.repeat(60))

const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, email, name, role, balance, created_at')
  .limit(5)

if (usersError) {
  console.error('❌ Erreur utilisateurs:', usersError)
} else {
  console.log(`✅ ${users.length} utilisateurs (sample)`)
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name || u.email}`)
    console.log(`     Role: ${u.role} | Balance: $${u.balance}`)
  })
  
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 Total utilisateurs: ${count}`)
}

// 2. TEST STATISTIQUES TRANSACTIONS
console.log('\n\n💳 2. STATISTIQUES TRANSACTIONS')
console.log('-'.repeat(60))

const { data: transactions, error: txError } = await supabase
  .from('transactions')
  .select('type, amount, status, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

if (txError) {
  console.error('❌ Erreur transactions:', txError)
} else {
  console.log(`✅ ${transactions.length} dernières transactions`)
  
  const { count: totalTx } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
  
  const { count: completedTx } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
  
  // Calculer revenus totaux
  const { data: revenues } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('status', 'completed')
  
  const totalRevenue = revenues?.reduce((sum, tx) => {
    if (tx.type === 'activation' || tx.type === 'rent') {
      return sum + tx.amount
    }
    return sum
  }, 0) || 0
  
  console.log(`📊 Total transactions: ${totalTx}`)
  console.log(`✅ Transactions complétées: ${completedTx}`)
  console.log(`💰 Revenus totaux: $${totalRevenue.toFixed(2)}`)
}

// 3. TEST ACTIVATIONS EN COURS
console.log('\n\n📞 3. ACTIVATIONS EN COURS')
console.log('-'.repeat(60))

const { data: activations, error: actError } = await supabase
  .from('activations')
  .select('id, phone, service_code, country_code, status, price, created_at')
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })
  .limit(5)

if (actError) {
  console.error('❌ Erreur activations:', actError)
} else {
  console.log(`✅ ${activations.length} activations actives`)
  activations.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.phone} - ${a.service_code}@${a.country_code}`)
    console.log(`     Status: ${a.status} | Prix: $${a.price}`)
  })
  
  const { count: totalAct } = await supabase
    .from('activations')
    .select('*', { count: 'exact', head: true })
  
  const { count: successAct } = await supabase
    .from('activations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
  
  const successRate = totalAct > 0 ? ((successAct / totalAct) * 100).toFixed(1) : 0
  
  console.log(`\n📊 Total activations: ${totalAct}`)
  console.log(`✅ Activations réussies: ${successAct}`)
  console.log(`📈 Taux de succès: ${successRate}%`)
}

// 4. TEST GESTION PRICING
console.log('\n\n💰 4. GESTION PRICING (règles actives)')
console.log('-'.repeat(60))

const { count: activePricing } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

const { count: totalPricing } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })

console.log(`✅ Règles actives: ${activePricing?.toLocaleString()}`)
console.log(`📊 Règles totales: ${totalPricing?.toLocaleString()}`)

// Sample de règles par pays populaires
const countriesToCheck = ['usa', 'philippines', 'indonesia', 'india', 'uk']
for (const country of countriesToCheck.slice(0, 3)) {
  const { count } = await supabase
    .from('pricing_rules')
    .select('*', { count: 'exact', head: true })
    .eq('country_code', country)
    .eq('active', true)
  
  console.log(`  ${country.toUpperCase()}: ${count} règles`)
}

// 5. TEST LOGS SYSTÈME
console.log('\n\n📝 5. LOGS SYNCHRONISATION')
console.log('-'.repeat(60))

const { data: syncLogs, error: logsError } = await supabase
  .from('sync_logs')
  .select('sync_type, status, services_synced, countries_synced, started_at')
  .order('started_at', { ascending: false })
  .limit(5)

if (logsError) {
  console.error('❌ Erreur logs:', logsError)
} else {
  console.log(`✅ ${syncLogs.length} derniers syncs`)
  syncLogs.forEach((log, i) => {
    const time = new Date(log.started_at).toLocaleString('fr-FR')
    console.log(`  ${i + 1}. ${log.sync_type} - ${log.status}`)
    console.log(`     ${time}`)
    if (log.services_synced) {
      console.log(`     Services: ${log.services_synced} | Pays: ${log.countries_synced}`)
    }
  })
}

// 6. TEST SERVICES MANAGEMENT
console.log('\n\n⚙️ 6. GESTION SERVICES')
console.log('-'.repeat(60))

const { data: topServices, error: topError } = await supabase
  .from('services')
  .select('code, name, total_available, category, active, updated_at')
  .eq('active', true)
  .order('total_available', { ascending: false })
  .limit(5)

if (topError) {
  console.error('❌ Erreur services:', topError)
} else {
  console.log('✅ Top 5 services par disponibilité:')
  topServices.forEach((s, i) => {
    const lastUpdate = new Date(s.updated_at).toLocaleString('fr-FR')
    console.log(`  ${i + 1}. ${s.name} (${s.code})`)
    console.log(`     📊 ${s.total_available?.toLocaleString()} numéros`)
    console.log(`     🕐 Mis à jour: ${lastUpdate}`)
  })
}

// 7. TEST PAYS MANAGEMENT
console.log('\n\n🌍 7. GESTION PAYS')
console.log('-'.repeat(60))

const { data: topCountries, error: countryError } = await supabase
  .from('countries')
  .select('code, name, success_rate, active')
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .limit(5)

if (countryError) {
  console.error('❌ Erreur pays:', countryError)
} else {
  console.log('✅ Top 5 pays par taux de succès:')
  topCountries.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (${c.code}): ${c.success_rate}% succès`)
  })
  
  const { count: activeCountries } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  
  console.log(`\n📊 Total pays actifs: ${activeCountries}`)
}

// 8. RÉSUMÉ ADMIN DASHBOARD
console.log('\n\n📊 RÉSUMÉ ADMIN DASHBOARD')
console.log('='.repeat(60))

const { count: totalUsers } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })

const { data: totalBalance } = await supabase
  .from('users')
  .select('balance')

const sumBalance = totalBalance?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0

console.log(`👥 Utilisateurs: ${totalUsers}`)
console.log(`💰 Balance totale: $${sumBalance.toFixed(2)}`)
console.log(`📱 Services actifs: ${activePricing?.toLocaleString()} règles de prix`)
console.log(`🌍 Pays actifs: À vérifier`)
console.log(`📞 Taux succès global: À calculer`)

console.log('\n✅ TEST ADMIN COMPLET TERMINÉ!')
console.log('='.repeat(60))
