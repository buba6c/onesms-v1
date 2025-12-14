import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔧 CORRECTION DES RENTALS EXPIRÉS\n')

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

// 1. Trouver tous les rentals expirés avec status = 'active'
console.log('1️⃣ Recherche des rentals expirés...\n')
const { data: expiredRentals, error: fetchError } = await supabase
  .from('rentals')
  .select('id, phone, status, frozen_amount, total_cost, expires_at')
  .eq('user_id', userId)
  .eq('status', 'active')
  .lt('expires_at', new Date().toISOString())

if (fetchError) {
  console.error('❌ Erreur:', fetchError)
  process.exit(1)
}

if (!expiredRentals || expiredRentals.length === 0) {
  console.log('✅ Aucun rental expiré à corriger')
  process.exit(0)
}

console.log(`Trouvé ${expiredRentals.length} rentals expirés:\n`)
console.log('Phone\t\t\tFrozen\tExpiration')
console.log('─'.repeat(60))

let totalToRelease = 0
expiredRentals.forEach(r => {
  totalToRelease += r.frozen_amount
  const expires = new Date(r.expires_at).toLocaleString()
  console.log(`${r.phone}\t${r.frozen_amount} Ⓐ\t${expires}`)
})

console.log(`\nTotal à libérer: ${totalToRelease} Ⓐ`)

// 2. Mettre à jour le status et frozen_amount des rentals expirés
console.log('\n2️⃣ Mise à jour des rentals expirés...\n')

for (const rental of expiredRentals) {
  const { error: updateError } = await supabase
    .from('rentals')
    .update({
      status: 'expired',
      frozen_amount: 0
    })
    .eq('id', rental.id)
  
  if (updateError) {
    console.error(`❌ Erreur pour ${rental.phone}:`, updateError)
  } else {
    console.log(`✅ ${rental.phone}: status → expired, frozen_amount → 0`)
  }
}

// 3. Libérer le frozen_balance de l'utilisateur
console.log('\n3️⃣ Libération du frozen_balance...\n')

const { data: currentUser } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log(`Balance actuelle: ${currentUser.balance} Ⓐ`)
console.log(`Frozen actuel: ${currentUser.frozen_balance} Ⓐ`)
console.log(`À libérer: ${totalToRelease} Ⓐ`)

const { error: updateUserError } = await supabase
  .from('users')
  .update({
    frozen_balance: currentUser.frozen_balance - totalToRelease
  })
  .eq('id', userId)

if (updateUserError) {
  console.error('❌ Erreur mise à jour user:', updateUserError)
} else {
  console.log(`✅ Nouveau frozen_balance: ${currentUser.frozen_balance - totalToRelease} Ⓐ`)
}

// 4. Vérification finale
console.log('\n4️⃣ Vérification finale...\n')

const { data: finalUser } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

const { data: activeActivations } = await supabase
  .from('activations')
  .select('frozen_amount')
  .eq('user_id', userId)
  .in('status', ['pending', 'waiting'])

const { data: activeRentals } = await supabase
  .from('rentals')
  .select('frozen_amount')
  .eq('user_id', userId)
  .eq('status', 'active')
  .gt('expires_at', new Date().toISOString())

const activationsFrozen = activeActivations?.reduce((sum, a) => sum + a.frozen_amount, 0) || 0
const rentalsFrozen = activeRentals?.reduce((sum, r) => sum + r.frozen_amount, 0) || 0
const calculatedFrozen = activationsFrozen + rentalsFrozen

console.log(`Balance: ${finalUser.balance} Ⓐ`)
console.log(`Frozen balance (users table): ${finalUser.frozen_balance} Ⓐ`)
console.log(`Activations frozen: ${activationsFrozen} Ⓐ`)
console.log(`Rentals frozen: ${rentalsFrozen} Ⓐ`)
console.log(`Calculé: ${calculatedFrozen} Ⓐ`)

if (Math.abs(finalUser.frozen_balance - calculatedFrozen) < 0.01) {
  console.log('\n✅ COHÉRENCE PARFAITE !')
} else {
  console.log('\n❌ INCOHÉRENCE DÉTECTÉE !')
}
