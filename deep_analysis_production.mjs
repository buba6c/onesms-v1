import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 DEEP ANALYSIS : FLUX COMPLET TRANSACTION\n')
console.log('='.repeat(80))

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

// 1. ANALYSE DE L'ÉTAT ACTUEL
console.log('\n📊 1. ÉTAT ACTUEL DU SYSTÈME\n')

const { data: user } = await supabase
  .from('users')
  .select('email, balance, frozen_balance, created_at')
  .eq('id', userId)
  .single()

console.log('User:', user.email)
console.log('Balance:', user.balance, 'Ⓐ')
console.log('Frozen:', user.frozen_balance, 'Ⓐ')
console.log('Disponible:', (user.balance - user.frozen_balance).toFixed(2), 'Ⓐ')
console.log('Compte créé:', new Date(user.created_at).toLocaleDateString())

// 2. ANALYSE DES ACTIVATIONS
console.log('\n📱 2. ANALYSE ACTIVATIONS (Dernières 24h)\n')

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

const { data: recentActivations } = await supabase
  .from('activations')
  .select('*')
  .eq('user_id', userId)
  .gte('created_at', yesterday)
  .order('created_at', { ascending: false })

if (recentActivations && recentActivations.length > 0) {
  console.log(`Total activations 24h: ${recentActivations.length}\n`)
  
  const byStatus = {}
  recentActivations.forEach(a => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1
  })
  
  console.log('Par status:')
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
  
  console.log('\nDétails:')
  recentActivations.slice(0, 5).forEach((a, i) => {
    const age = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 60000)
    console.log(`\n${i + 1}. ${a.service_code} | ${a.phone}`)
    console.log(`   Status: ${a.status}`)
    console.log(`   Prix: ${a.price} Ⓐ | Frozen: ${a.frozen_amount} Ⓐ`)
    console.log(`   Créé il y a: ${age} min`)
    if (a.order_id) console.log(`   Order ID: ${a.order_id}`)
  })
} else {
  console.log('Aucune activation dans les 24 dernières heures')
}

// 3. ANALYSE DES TRANSACTIONS
console.log('\n\n💰 3. ANALYSE TRANSACTIONS (Dernières 24h)\n')

const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .gte('created_at', yesterday)
  .order('created_at', { ascending: false })

if (transactions && transactions.length > 0) {
  console.log(`Total transactions 24h: ${transactions.length}\n`)
  
  // Agrégation par type et status
  const stats = {}
  let totalAmount = 0
  
  transactions.forEach(t => {
    const key = `${t.type}_${t.status}`
    if (!stats[key]) {
      stats[key] = { count: 0, amount: 0 }
    }
    stats[key].count++
    stats[key].amount += t.amount
    totalAmount += t.amount
  })
  
  console.log('Par type et status:')
  Object.entries(stats).forEach(([key, data]) => {
    console.log(`  ${key}: ${data.count} tx | Total: ${data.amount.toFixed(2)} Ⓐ`)
  })
  
  console.log(`\nMontant total: ${totalAmount.toFixed(2)} Ⓐ`)
  
  console.log('\nDernières transactions:')
  transactions.slice(0, 5).forEach((t, i) => {
    const age = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 60000)
    console.log(`\n${i + 1}. ${t.type} | ${t.amount} Ⓐ | ${t.status}`)
    console.log(`   ${t.description}`)
    console.log(`   Il y a: ${age} min`)
  })
} else {
  console.log('Aucune transaction dans les 24 dernières heures')
}

// 4. DÉTECTION DES RACE CONDITIONS POTENTIELLES
console.log('\n\n⚠️ 4. DÉTECTION RACE CONDITIONS\n')

// 4.1 Transactions concurrentes (< 1 seconde d'écart)
const concurrentTx = []
for (let i = 0; i < transactions?.length - 1; i++) {
  const t1 = new Date(transactions[i].created_at).getTime()
  const t2 = new Date(transactions[i + 1].created_at).getTime()
  const diff = Math.abs(t1 - t2)
  
  if (diff < 1000) { // < 1 seconde
    concurrentTx.push({
      tx1: transactions[i],
      tx2: transactions[i + 1],
      diffMs: diff
    })
  }
}

if (concurrentTx.length > 0) {
  console.log(`🚨 ${concurrentTx.length} paires de transactions concurrentes détectées:\n`)
  concurrentTx.forEach((pair, i) => {
    console.log(`${i + 1}. Écart: ${pair.diffMs}ms`)
    console.log(`   TX1: ${pair.tx1.type} ${pair.tx1.amount} Ⓐ (${pair.tx1.status})`)
    console.log(`   TX2: ${pair.tx2.type} ${pair.tx2.amount} Ⓐ (${pair.tx2.status})`)
  })
} else {
  console.log('✅ Aucune transaction concurrente détectée')
}

// 4.2 Activations sans transaction associée
console.log('\n\n🔍 Activations sans transaction:\n')

const { data: orphanActivations } = await supabase
  .from('activations')
  .select('id, service_code, price, status, created_at')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting', 'completed'])
  .gte('created_at', yesterday)

let orphans = []

if (orphanActivations) {
  for (const activation of orphanActivations) {
    const { data: relatedTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('related_activation_id', activation.id)
      .limit(1)
    
    if (!relatedTx || relatedTx.length === 0) {
      orphans.push(activation)
    }
  }
  
  if (orphans.length > 0) {
    console.log(`⚠️ ${orphans.length} activations sans transaction:\n`)
    orphans.forEach((a, i) => {
      console.log(`${i + 1}. ${a.service_code} | ${a.price} Ⓐ | ${a.status}`)
    })
  } else {
    console.log('✅ Toutes les activations ont une transaction associée')
  }
}

// 5. ANALYSE COHÉRENCE BALANCE
console.log('\n\n🔢 5. COHÉRENCE BALANCE\n')

// 5.1 Calculer frozen_balance théorique
const { data: activeItems } = await supabase
  .from('activations')
  .select('frozen_amount')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting'])

const activationsFrozen = activeItems?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0

const { data: activeRentals } = await supabase
  .from('rentals')
  .select('frozen_amount')
  .eq('user_id', userId)
  .eq('status', 'active')
  .gt('expires_at', new Date().toISOString())

const rentalsFrozen = activeRentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0

const calculatedFrozen = activationsFrozen + rentalsFrozen
const actualFrozen = user.frozen_balance

console.log('Frozen calculé:')
console.log(`  Activations: ${activationsFrozen} Ⓐ`)
console.log(`  Rentals: ${rentalsFrozen} Ⓐ`)
console.log(`  Total: ${calculatedFrozen} Ⓐ`)
console.log(`\nFrozen actuel (users table): ${actualFrozen} Ⓐ`)

const diff = Math.abs(calculatedFrozen - actualFrozen)

if (diff < 0.01) {
  console.log(`\n✅ COHÉRENT (diff: ${diff.toFixed(4)} Ⓐ)`)
} else {
  console.log(`\n❌ INCOHÉRENT (diff: ${diff.toFixed(2)} Ⓐ)`)
  console.log('   Action requise: Recalcul frozen_balance')
}

// 6. ANALYSE TEMPORELLE
console.log('\n\n⏱️ 6. ANALYSE TEMPORELLE\n')

// Activations qui devraient être expirées
const { data: shouldBeExpired } = await supabase
  .from('activations')
  .select('id, service_code, phone, status, expires_at, created_at')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting'])
  .lt('expires_at', new Date().toISOString())

if (shouldBeExpired && shouldBeExpired.length > 0) {
  console.log(`⚠️ ${shouldBeExpired.length} activations devraient être expirées:\n`)
  shouldBeExpired.forEach((a, i) => {
    const expired = Math.floor((Date.now() - new Date(a.expires_at).getTime()) / 60000)
    console.log(`${i + 1}. ${a.service_code} | ${a.phone}`)
    console.log(`   Expiré depuis: ${expired} min`)
    console.log(`   Status actuel: ${a.status} (devrait être timeout/cancelled)`)
  })
  console.log('\n💡 Action: Exécuter cleanup-expired-activations')
} else {
  console.log('✅ Aucune activation expirée en attente')
}

// Rentals expirés
const { data: expiredRentals } = await supabase
  .from('rentals')
  .select('phone, status, expires_at, frozen_amount')
  .eq('user_id', userId)
  .eq('status', 'active')
  .lt('expires_at', new Date().toISOString())

if (expiredRentals && expiredRentals.length > 0) {
  console.log(`\n⚠️ ${expiredRentals.length} rentals expirés:\n`)
  let totalExpiredFrozen = 0
  expiredRentals.forEach((r, i) => {
    const expired = Math.floor((Date.now() - new Date(r.expires_at).getTime()) / 60000)
    totalExpiredFrozen += r.frozen_amount
    console.log(`${i + 1}. ${r.phone}`)
    console.log(`   Expiré depuis: ${expired} min`)
    console.log(`   Frozen: ${r.frozen_amount} Ⓐ`)
  })
  console.log(`\nTotal frozen à libérer: ${totalExpiredFrozen} Ⓐ`)
  console.log('💡 Action: Créer cleanup-expired-rentals')
} else {
  console.log('\n✅ Aucun rental expiré')
}

// 7. ANALYSE PATTERNS SUSPECTS
console.log('\n\n🕵️ 7. PATTERNS SUSPECTS\n')

// 7.1 Transactions failed répétées
const { data: failedTx } = await supabase
  .from('transactions')
  .select('type, description, created_at')
  .eq('user_id', userId)
  .eq('status', 'failed')
  .gte('created_at', yesterday)
  .order('created_at', { ascending: false })

if (failedTx && failedTx.length > 0) {
  console.log(`⚠️ ${failedTx.length} transactions échouées 24h:\n`)
  failedTx.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.type} | ${t.description}`)
  })
} else {
  console.log('✅ Aucune transaction échouée')
}

// 7.2 Activations cancelled rapidement (< 2 min)
const { data: quickCancels } = await supabase
  .from('activations')
  .select('service_code, status, created_at, updated_at')
  .eq('user_id', userId)
  .eq('status', 'cancelled')
  .gte('created_at', yesterday)

if (quickCancels) {
  const fast = quickCancels.filter(a => {
    const created = new Date(a.created_at).getTime()
    const updated = new Date(a.updated_at).getTime()
    return (updated - created) < 120000 // < 2 min
  })
  
  if (fast.length > 0) {
    console.log(`\n⚠️ ${fast.length} annulations rapides (< 2 min):`)
    console.log('   Peut indiquer problème API ou UX')
  }
}

// 8. RECOMMANDATIONS
console.log('\n\n💡 8. RECOMMANDATIONS\n')

const issues = []

if (concurrentTx.length > 0) {
  issues.push('🚨 CRITIQUE: Race conditions détectées → Implémenter SELECT FOR UPDATE')
}

if (diff >= 0.01) {
  issues.push(`⚠️ IMPORTANT: Incohérence frozen_balance (${diff.toFixed(2)} Ⓐ) → Recalcul requis`)
}

if (shouldBeExpired && shouldBeExpired.length > 0) {
  issues.push(`⚠️ IMPORTANT: ${shouldBeExpired.length} activations expirées → Cleanup requis`)
}

if (expiredRentals && expiredRentals.length > 0) {
  issues.push(`⚠️ IMPORTANT: ${expiredRentals.length} rentals expirés → Cleanup requis`)
}

if (orphanActivations && orphans.length > 0) {
  issues.push(`⚠️ Activations orphelines (${orphans.length}) → Vérifier flux`)
}

if (failedTx && failedTx.length > 3) {
  issues.push(`⚠️ Taux d'échec élevé (${failedTx.length} échecs) → Investiguer`)
}

if (issues.length > 0) {
  console.log('Issues détectées:\n')
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue}`)
  })
  
  console.log('\n\nActions prioritaires:')
  console.log('1. Implémenter wallet atomique (SELECT FOR UPDATE)')
  console.log('2. Créer cleanup-expired-rentals')
  console.log('3. Ajouter monitoring race conditions')
  console.log('4. Ajouter idempotence (UNIQUE constraints)')
} else {
  console.log('✅ Aucun problème majeur détecté')
  console.log('\nMais recommandations préventives:')
  console.log('1. Implémenter wallet atomique quand même (sécurité)')
  console.log('2. Ajouter monitoring proactif')
  console.log('3. Créer dashboard santé système')
}

console.log('\n' + '='.repeat(80))
console.log('✅ ANALYSE TERMINÉE')
console.log('='.repeat(80))
