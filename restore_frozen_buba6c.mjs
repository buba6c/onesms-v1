import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('🔄 RESTAURATION: 15Ⓐ frozen pour buba6c@gmail.com\n')

// État actuel
const { data: user } = await sb
  .from('users')
  .select('email, balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('📊 ÉTAT ACTUEL:')
console.log(`Email: ${user.email}`)
console.log(`Balance: ${user.balance}Ⓐ`)
console.log(`Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

// Remettre 15Ⓐ en frozen
const targetFrozen = 15
const newFrozen = user.frozen_balance + targetFrozen

console.log(`🔒 Ajout de ${targetFrozen}Ⓐ en frozen...`)

const { data: updatedUser, error } = await sb
  .from('users')
  .update({ 
    frozen_balance: newFrozen,
    updated_at: new Date().toISOString()
  })
  .eq('id', userId)
  .select()
  .single()

if (error) {
  console.error('❌ ERREUR:', error)
} else {
  console.log('✅ SUCCÈS!')
  
  console.log('\n📊 ÉTAT FINAL:')
  console.log(`Balance: ${updatedUser.balance}Ⓐ`)
  console.log(`Frozen: ${updatedUser.frozen_balance}Ⓐ`)
  console.log(`Disponible: ${updatedUser.balance - updatedUser.frozen_balance}Ⓐ\n`)
  
  console.log('CHANGEMENT:')
  console.log(`Frozen: ${user.frozen_balance}Ⓐ → ${updatedUser.frozen_balance}Ⓐ (+${targetFrozen}Ⓐ)`)
  console.log(`Disponible: ${user.balance - user.frozen_balance}Ⓐ → ${updatedUser.balance - updatedUser.frozen_balance}Ⓐ (-${targetFrozen}Ⓐ)`)
}