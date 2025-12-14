import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('🧪 TEST DU NOUVEAU SYSTÈME DE FROZEN BALANCE\n')
console.log('='.repeat(70))

// 1. État initial
console.log('\n1️⃣ ÉTAT INITIAL\n')
const { data: user1 } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log(`Balance: ${user1.balance} Ⓐ`)
console.log(`Frozen: ${user1.frozen_balance} Ⓐ`)
console.log(`Disponible: ${user1.balance - user1.frozen_balance} Ⓐ`)

// 2. Activations actives
console.log('\n2️⃣ ACTIVATIONS ACTIVES\n')
const { data: activations } = await supabase
  .from('activations')
  .select('id, phone, service_code, price, frozen_amount, status, created_at')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })

if (activations && activations.length > 0) {
  console.log('Service\tPhone\t\t\tPrix\tFrozen\tStatus')
  console.log('─'.repeat(70))
  
  let totalPrice = 0
  let totalFrozen = 0
  
  activations.forEach(a => {
    totalPrice += a.price
    totalFrozen += a.frozen_amount
    console.log(`${a.service_code}\t${a.phone}\t${a.price} Ⓐ\t${a.frozen_amount} Ⓐ\t${a.status}`)
  })
  
  console.log('\n' + '─'.repeat(70))
  console.log(`Total: ${activations.length} activations`)
  console.log(`Prix total: ${totalPrice} Ⓐ`)
  console.log(`Frozen total: ${totalFrozen} Ⓐ`)
  console.log(`Frozen balance (user): ${user1.frozen_balance} Ⓐ`)
  
  if (Math.abs(totalFrozen - user1.frozen_balance) < 0.01) {
    console.log('✅ COHÉRENCE PARFAITE !')
  } else {
    console.log(`❌ INCOHÉRENCE: ${totalFrozen} ≠ ${user1.frozen_balance}`)
    console.log(`   Différence: ${Math.abs(totalFrozen - user1.frozen_balance)} Ⓐ`)
  }
} else {
  console.log('Aucune activation active')
  if (user1.frozen_balance > 0) {
    console.log(`⚠️ Mais frozen_balance = ${user1.frozen_balance} Ⓐ (devrait être 0)`)
  }
}

// 3. Rentals actifs
console.log('\n3️⃣ RENTALS ACTIFS\n')
const { data: rentals } = await supabase
  .from('rentals')
  .select('phone, status, frozen_amount, expires_at')
  .eq('user_id', userId)
  .eq('status', 'active')
  .gt('expires_at', new Date().toISOString())

if (rentals && rentals.length > 0) {
  let rentalsFrozen = 0
  rentals.forEach(r => {
    rentalsFrozen += r.frozen_amount
    console.log(`${r.phone}: ${r.frozen_amount} Ⓐ`)
  })
  console.log(`\nTotal rentals frozen: ${rentalsFrozen} Ⓐ`)
} else {
  console.log('Aucun rental actif')
}

// 4. Transactions récentes
console.log('\n4️⃣ DERNIÈRES TRANSACTIONS\n')
const { data: transactions } = await supabase
  .from('transactions')
  .select('type, amount, status, description, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5)

if (transactions && transactions.length > 0) {
  console.log('Type\t\tMontant\tStatus\t\tDescription')
  console.log('─'.repeat(70))
  transactions.forEach(t => {
    const date = new Date(t.created_at).toLocaleString().slice(0, 16)
    console.log(`${t.type}\t${t.amount} Ⓐ\t${t.status}\t${t.description.slice(0, 30)}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('✅ Diagnostic terminé')
console.log('\n💡 Test du nouveau système:')
console.log('   1. Achetez une activation → Balance devrait rester identique')
console.log('   2. Frozen devrait augmenter du prix')
console.log('   3. Annulez → Balance reste identique, Frozen diminue')
console.log('   4. SMS reçu → Balance diminue, Frozen diminue')
