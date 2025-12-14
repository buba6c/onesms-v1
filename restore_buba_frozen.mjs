import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function restoreBubaFrozen() {
  console.log('🔧 RESTORATION: 10 Ⓐ frozen pour buba6c\n')
  console.log('='.repeat(70))

  // 1. Trouver l'ID de buba6c
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .ilike('email', '%buba6c%')
  
  if (userErr || !users || users.length === 0) {
    console.error('❌ User buba6c not found:', userErr)
    return
  }

  const user = users[0]
  console.log(`\n📋 User trouvé:`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Balance: ${user.balance} Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance} Ⓐ`)

  // 2. Calculer les nouveaux montants
  const restoreAmount = 10
  const newFrozen = parseFloat(user.frozen_balance) + restoreAmount
  
  console.log(`\n💰 Restauration:`)
  console.log(`   Montant à restaurer: ${restoreAmount} Ⓐ`)
  console.log(`   Nouveau frozen_balance: ${newFrozen} Ⓐ`)

  // 3. Mettre à jour users.frozen_balance
  const { error: updateErr } = await supabase
    .from('users')
    .update({ 
      frozen_balance: newFrozen,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
  
  if (updateErr) {
    console.error('❌ Update failed:', updateErr)
    return
  }

  console.log(`   ✅ users.frozen_balance mis à jour`)

  // 4. Créer une balance_operation pour tracer
  const { error: opErr } = await supabase
    .from('balance_operations')
    .insert({
      user_id: user.id,
      operation_type: 'freeze',
      amount: restoreAmount,
      balance_before: user.balance,
      balance_after: user.balance,
      frozen_before: user.frozen_balance,
      frozen_after: newFrozen,
      reason: 'Manual restoration: buba6c frozen balance adjustment'
    })
  
  if (opErr) {
    console.error('⚠️ Balance operation insert failed:', opErr)
  } else {
    console.log(`   ✅ balance_operation créée`)
  }

  // 5. Vérifier le résultat final
  const { data: finalUser } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', user.id)
    .single()
  
  console.log(`\n🎯 RÉSULTAT FINAL:`)
  console.log(`   Balance: ${finalUser.balance} Ⓐ`)
  console.log(`   Frozen: ${finalUser.frozen_balance} Ⓐ`)
  console.log(`\n✅ Restauration terminée!`)
  console.log('='.repeat(70))
}

restoreBubaFrozen()
