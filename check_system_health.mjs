import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🏥 SANTÉ DU SYSTÈME FROZEN BALANCE\n')
console.log('='.repeat(80))
console.log('Date:', new Date().toLocaleString())
console.log('='.repeat(80))

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

// 1. État utilisateur
const { data: user } = await supabase
  .from('users')
  .select('email, balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('\n👤 UTILISATEUR')
console.log('─'.repeat(80))
console.log(`Email: ${user.email}`)
console.log(`Balance totale: ${user.balance} Ⓐ`)
console.log(`Frozen: ${user.frozen_balance} Ⓐ`)
console.log(`Disponible: ${(user.balance - user.frozen_balance).toFixed(2)} Ⓐ`)

// 2. Activations actives
const { data: activations } = await supabase
  .from('activations')
  .select('id, service_code, phone, price, frozen_amount, status, created_at')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })

console.log('\n📱 ACTIVATIONS ACTIVES')
console.log('─'.repeat(80))

let activationsFrozen = 0

if (activations && activations.length > 0) {
  activations.forEach(a => {
    activationsFrozen += a.frozen_amount
    const age = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 60000)
    console.log(`${a.service_code.toUpperCase()} | ${a.phone} | ${a.price} Ⓐ | Frozen: ${a.frozen_amount} Ⓐ | ${age} min ago`)
  })
  console.log(`\nTotal: ${activations.length} activations, ${activationsFrozen} Ⓐ frozen`)
} else {
  console.log('Aucune activation active')
}

// 3. Rentals actifs
const { data: rentals } = await supabase
  .from('rentals')
  .select('phone, status, frozen_amount, total_cost, expires_at')
  .eq('user_id', userId)
  .eq('status', 'active')
  .gt('expires_at', new Date().toISOString())

console.log('\n📦 RENTALS ACTIFS')
console.log('─'.repeat(80))

let rentalsFrozen = 0

if (rentals && rentals.length > 0) {
  rentals.forEach(r => {
    rentalsFrozen += r.frozen_amount
    const expiresIn = Math.floor((new Date(r.expires_at).getTime() - Date.now()) / 3600000)
    console.log(`${r.phone} | ${r.total_cost} Ⓐ | Frozen: ${r.frozen_amount} Ⓐ | Expires in ${expiresIn}h`)
  })
  console.log(`\nTotal: ${rentals.length} rentals, ${rentalsFrozen} Ⓐ frozen`)
} else {
  console.log('Aucun rental actif')
}

// 4. Rentals expirés (bug potentiel)
const { data: expiredRentals } = await supabase
  .from('rentals')
  .select('phone, status, frozen_amount, expires_at')
  .eq('user_id', userId)
  .eq('status', 'active')
  .lt('expires_at', new Date().toISOString())

console.log('\n⚠️ RENTALS EXPIRÉS (BUG POTENTIEL)')
console.log('─'.repeat(80))

if (expiredRentals && expiredRentals.length > 0) {
  let expiredFrozen = 0
  expiredRentals.forEach(r => {
    expiredFrozen += r.frozen_amount
    console.log(`❌ ${r.phone} | Frozen: ${r.frozen_amount} Ⓐ | Expired: ${new Date(r.expires_at).toLocaleString()}`)
  })
  console.log(`\n🚨 PROBLÈME: ${expiredRentals.length} rentals expirés avec ${expiredFrozen} Ⓐ frozen!`)
  console.log('   Action requise: Exécuter fix_expired_rentals_cancelled.mjs')
} else {
  console.log('✅ Aucun rental expiré avec frozen_amount > 0')
}

// 5. Cohérence
console.log('\n🔍 COHÉRENCE DU SYSTÈME')
console.log('─'.repeat(80))

const totalFrozen = activationsFrozen + rentalsFrozen
const userFrozen = user.frozen_balance

console.log(`Activations frozen: ${activationsFrozen} Ⓐ`)
console.log(`Rentals frozen: ${rentalsFrozen} Ⓐ`)
console.log(`Total calculé: ${totalFrozen} Ⓐ`)
console.log(`User frozen_balance: ${userFrozen} Ⓐ`)

const diff = Math.abs(totalFrozen - userFrozen)

if (diff < 0.01) {
  console.log('\n✅ SYSTÈME COHÉRENT')
} else {
  console.log(`\n❌ INCOHÉRENCE DÉTECTÉE: ${diff} Ⓐ de différence`)
  console.log('\nActions possibles:')
  console.log('1. Vérifier les rentals expirés')
  console.log('2. Vérifier les activations avec frozen_amount incorrect')
  console.log('3. Exécuter un script de réparation')
}

// 6. Transactions récentes
console.log('\n💰 DERNIÈRES TRANSACTIONS')
console.log('─'.repeat(80))

const { data: transactions } = await supabase
  .from('transactions')
  .select('type, amount, status, description, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)

if (transactions && transactions.length > 0) {
  transactions.forEach(t => {
    const date = new Date(t.created_at).toLocaleString().slice(0, 16)
    const amountStr = t.amount > 0 ? `+${t.amount}` : `${t.amount}`
    console.log(`[${date}] ${t.type.padEnd(12)} ${amountStr.padStart(7)} Ⓐ | ${t.status.padEnd(10)} | ${t.description.slice(0, 40)}`)
  })
}

console.log('\n' + '='.repeat(80))
console.log('✅ Diagnostic terminé')
console.log('='.repeat(80))

// 7. Résumé santé
console.log('\n📊 RÉSUMÉ SANTÉ')
console.log('─'.repeat(80))

const checks = [
  {
    name: 'Cohérence frozen_balance',
    status: diff < 0.01,
    message: diff < 0.01 ? 'Parfaite' : `Écart de ${diff} Ⓐ`
  },
  {
    name: 'Rentals expirés',
    status: !expiredRentals || expiredRentals.length === 0,
    message: expiredRentals?.length > 0 ? `${expiredRentals.length} rentals expirés à nettoyer` : 'Aucun'
  },
  {
    name: 'Balance positive',
    status: user.balance > 0,
    message: `${user.balance} Ⓐ`
  },
  {
    name: 'Disponible suffisant',
    status: (user.balance - user.frozen_balance) >= 0,
    message: `${(user.balance - user.frozen_balance).toFixed(2)} Ⓐ`
  }
]

checks.forEach(check => {
  const icon = check.status ? '✅' : '❌'
  console.log(`${icon} ${check.name}: ${check.message}`)
})

const allHealthy = checks.every(c => c.status)

console.log('\n' + '='.repeat(80))
if (allHealthy) {
  console.log('🎉 SYSTÈME EN BONNE SANTÉ')
} else {
  console.log('⚠️ ATTENTION REQUISE - Voir les vérifications ci-dessus')
}
console.log('='.repeat(80))
