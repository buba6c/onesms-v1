import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔧 CORRECTION DES RENTALS EXPIRÉS (status → cancelled)\n')

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

// 1. Trouver tous les rentals expirés
console.log('1️⃣ Recherche des rentals expirés...\n')
const { data: expiredRentals } = await supabase
  .from('rentals')
  .select('id, phone, status, frozen_amount, expires_at')
  .eq('user_id', userId)
  .eq('status', 'active')
  .lt('expires_at', new Date().toISOString())

if (!expiredRentals || expiredRentals.length === 0) {
  console.log('✅ Aucun rental expiré')
  process.exit(0)
}

console.log(`Trouvé ${expiredRentals.length} rentals expirés:\n`)
expiredRentals.forEach(r => {
  console.log(`${r.phone}: ${r.frozen_amount} Ⓐ (expire ${new Date(r.expires_at).toLocaleString()})`)
})

const totalToRelease = expiredRentals.reduce((sum, r) => sum + r.frozen_amount, 0)
console.log(`\n📦 Total à libérer: ${totalToRelease} Ⓐ`)

// 2. Mettre à jour les rentals expirés (status → cancelled)
console.log('\n2️⃣ Mise à jour...\n')

for (const rental of expiredRentals) {
  const { error } = await supabase
    .from('rentals')
    .update({
      status: 'cancelled',  // ⭐ cancelled au lieu de expired
      frozen_amount: 0
    })
    .eq('id', rental.id)
  
  if (error) {
    console.error(`❌ ${rental.phone}:`, error.message)
  } else {
    console.log(`✅ ${rental.phone}: libéré ${rental.frozen_amount} Ⓐ`)
  }
}

// 3. Mettre à jour le frozen_balance de l'utilisateur
console.log('\n3️⃣ Mise à jour du frozen_balance...\n')

const { data: user } = await supabase
  .from('users')
  .select('frozen_balance')
  .eq('id', userId)
  .single()

const newFrozen = user.frozen_balance - totalToRelease

const { error: updateError } = await supabase
  .from('users')
  .update({ frozen_balance: newFrozen })
  .eq('id', userId)

if (updateError) {
  console.error('❌ Erreur:', updateError.message)
} else {
  console.log(`✅ Frozen balance: ${user.frozen_balance} Ⓐ → ${newFrozen} Ⓐ`)
}

// 4. Vérification
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

const activationsFrozen = activeActivations?.reduce((sum, a) => sum + a.frozen_amount, 0) || 0

console.log(`Balance: ${finalUser.balance} Ⓐ`)
console.log(`Frozen: ${finalUser.frozen_balance} Ⓐ`)
console.log(`Activations frozen: ${activationsFrozen} Ⓐ`)
console.log(`Rentals actifs frozen: 0 Ⓐ`)

if (Math.abs(finalUser.frozen_balance - activationsFrozen) < 0.01) {
  console.log('\n✅ COHÉRENCE PARFAITE !')
} else {
  console.log(`\n❌ Incohérence: ${finalUser.frozen_balance} ≠ ${activationsFrozen}`)
}
