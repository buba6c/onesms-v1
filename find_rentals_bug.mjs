import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 RECHERCHE DU BUG RENTALS\n')

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

// 1. Tous les rentals avec frozen_amount > 0
console.log('1️⃣ RENTALS AVEC FROZEN_AMOUNT > 0 (tous status)\n')
const { data: rentalsWithFrozen } = await supabase
  .from('rentals')
  .select('id, phone, status, frozen_amount, total_cost, created_at, expires_at')
  .eq('user_id', userId)
  .gt('frozen_amount', 0)
  .order('created_at', { ascending: false })

console.log('Status\t\tFrozen\tTotal\tPhone\t\t\tExpires')
console.log('─'.repeat(80))

let totalFrozen = 0
rentalsWithFrozen?.forEach(r => {
  totalFrozen += r.frozen_amount
  const expires = r.expires_at ? new Date(r.expires_at).toLocaleString() : 'N/A'
  const isExpired = r.expires_at && new Date(r.expires_at) < new Date()
  const expiresMark = isExpired ? ' ❌ EXPIRÉ' : ''
  console.log(`${r.status}\t${r.frozen_amount} Ⓐ\t${r.total_cost} Ⓐ\t${r.phone}\t${expires.slice(0, 16)}${expiresMark}`)
})

console.log(`\nTotal frozen_amount: ${totalFrozen} Ⓐ`)

// 2. Rentals actifs
console.log('\n\n2️⃣ RENTALS AVEC STATUS = "active"\n')
const { data: activeRentals } = await supabase
  .from('rentals')
  .select('id, phone, status, frozen_amount, total_cost, expires_at')
  .eq('user_id', userId)
  .eq('status', 'active')

if (activeRentals && activeRentals.length > 0) {
  console.log('Status\tFrozen\tTotal\tPhone\t\t\tExpires')
  console.log('─'.repeat(80))
  
  let activeFrozen = 0
  activeRentals.forEach(r => {
    activeFrozen += r.frozen_amount
    const expires = r.expires_at ? new Date(r.expires_at).toLocaleString() : 'N/A'
    console.log(`${r.status}\t${r.frozen_amount} Ⓐ\t${r.total_cost} Ⓐ\t${r.phone}\t${expires.slice(0, 16)}`)
  })
  
  console.log(`\nTotal rentals actifs frozen: ${activeFrozen} Ⓐ`)
} else {
  console.log('Aucun rental avec status = "active"')
}

// 3. Le problème
console.log('\n\n❌ PROBLÈME IDENTIFIÉ:')
console.log(`- Rentals avec frozen_amount > 0: ${totalFrozen} Ⓐ`)
console.log(`- Mais certains de ces rentals ont status != "active"`)
console.log(`- Ces rentals ont expiré mais leur frozen_amount n'a pas été libéré!`)
console.log('\n💡 SOLUTION: Mettre frozen_amount = 0 pour tous les rentals expirés ou non-actifs')
