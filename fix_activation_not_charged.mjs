import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function fixActivation() {
  const activationId = 'eaf40992-c026-426c-95a2-fc522a670c65'
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  
  console.log('🔧 FIX: Activation avec SMS reçu mais pas chargée correctement')
  console.log('='.repeat(70))

  // 1. État actuel
  const { data: user } = await supabase
    .from('users')
    .select('frozen_balance')
    .eq('id', userId)
    .single()
  
  console.log(`\n📊 État AVANT:`)
  console.log(`   User frozen_balance: ${user.frozen_balance} Ⓐ`)

  // 2. Réduire manuellement le frozen_balance de 5 Ⓐ (le montant de l'activation)
  const newFrozen = Math.max(0, parseFloat(user.frozen_balance) - 5)
  
  const { error: updateErr } = await supabase
    .from('users')
    .update({ 
      frozen_balance: newFrozen,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  if (updateErr) {
    console.error('❌ Update failed:', updateErr)
    return
  }

  console.log(`   ✅ Réduit frozen_balance de 5 Ⓐ`)

  // 3. Créer l'opération CHARGE manquante
  const { data: activation } = await supabase
    .from('activations')
    .select('price')
    .eq('id', activationId)
    .single()

  const { error: opErr } = await supabase
    .from('balance_operations')
    .insert({
      user_id: userId,
      activation_id: activationId,
      operation_type: 'commit',
      amount: activation.price || 5,
      balance_before: 55,
      balance_after: 55,
      frozen_before: user.frozen_balance,
      frozen_after: newFrozen,
      reason: 'Manual fix: SMS received but not charged (missing COMMIT operation)'
    })
  
  if (opErr) {
    console.error('⚠️ Balance operation insert failed:', opErr)
  } else {
    console.log(`   ✅ Balance operation CHARGE créée`)
  }

  // 4. Vérifier résultat final
  const { data: finalUser } = await supabase
    .from('users')
    .select('frozen_balance')
    .eq('id', userId)
    .single()
  
  console.log(`\n📊 État APRÈS:`)
  console.log(`   User frozen_balance: ${finalUser.frozen_balance} Ⓐ`)
  console.log(`\n✅ Correction terminée!`)
  console.log('='.repeat(70))
}

fixActivation()
