// CORRECTION URGENTE - Reset frozen_balance buba6c à 0
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('🔧 CORRECTION - Reset frozen_balance buba6c à 0')
console.log('=' .repeat(50))

try {
  // 1. État actuel
  console.log('🔍 État actuel...')
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  console.log(`📧 Email: ${user.email}`)
  console.log(`💰 Balance: ${user.balance}Ⓐ`)
  console.log(`🔒 Frozen: ${user.frozen_balance}Ⓐ`)

  // 2. Reset frozen_balance à 0
  console.log('\n🔧 Reset frozen_balance à 0...')
  const { error: updateError } = await supabase
    .from('users')
    .update({ frozen_balance: 0 })
    .eq('id', userId)

  if (updateError) throw updateError

  // 3. Vérification
  const { data: updatedUser, error: checkError } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single()

  if (checkError) throw checkError

  console.log('✅ Frozen_balance reseté avec succès!')
  console.log(`📊 APRÈS: Balance: ${updatedUser.balance}Ⓐ | Frozen: ${updatedUser.frozen_balance}Ⓐ`)

  // 4. Nettoyer aussi les activations/rentals de test orphelins
  console.log('\n🧹 Nettoyage des activations/rentals orphelins...')
  
  const { data: orphanedActivations } = await supabase
    .from('activations')
    .select('id, order_id, status, frozen_amount')
    .eq('user_id', userId)
    .gt('frozen_amount', 0)

  const { data: orphanedRentals } = await supabase
    .from('rentals')
    .select('id, rent_id, status, frozen_amount')
    .eq('user_id', userId)
    .gt('frozen_amount', 0)

  if (orphanedActivations?.length > 0) {
    console.log(`🔧 Reset ${orphanedActivations.length} activations orphelines...`)
    await supabase
      .from('activations')
      .update({ frozen_amount: 0 })
      .eq('user_id', userId)
      .gt('frozen_amount', 0)
  }

  if (orphanedRentals?.length > 0) {
    console.log(`🔧 Reset ${orphanedRentals.length} rentals orphelins...`)
    await supabase
      .from('rentals')
      .update({ frozen_amount: 0 })
      .eq('user_id', userId)
      .gt('frozen_amount', 0)
  }

  console.log('\n🎉 CORRECTION TERMINÉE - Compte remis à la normale!')

} catch (error) {
  console.error('❌ Erreur:', error.message)
}