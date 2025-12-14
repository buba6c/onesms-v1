import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com
const freezeAmount = 15

console.log('💰 AJOUT: 15Ⓐ frozen à buba6c@gmail.com\n')

try {
  // 1. État actuel
  console.log('1️⃣ État actuel du compte...')
  
  const { data: currentUser } = await sb
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`📧 Email: ${currentUser.email}`)
  console.log(`💰 Balance: ${currentUser.balance}Ⓐ`)
  console.log(`🔒 Frozen: ${currentUser.frozen_balance}Ⓐ`)
  console.log(`💸 Disponible: ${currentUser.balance - currentUser.frozen_balance}Ⓐ`)

  // 2. Créer activation test qui va geler 15Ⓐ
  console.log(`\n2️⃣ Création activation test pour geler ${freezeAmount}Ⓐ...`)
  
  const testActivation = {
    id: crypto.randomUUID(),
    user_id: userId,
    service_code: 'test15a',
    country_code: 'test',
    price: freezeAmount,
    frozen_amount: freezeAmount,
    order_id: 'TEST15A_' + Date.now(),
    phone: 'TEST_' + Math.random().toString().substr(2, 10),
    status: 'pending',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    provider: 'test',
    operator: 'test',
    charged: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { error: activationError } = await sb
    .from('activations')
    .insert([testActivation])

  if (activationError) {
    throw new Error(`Erreur création activation: ${activationError.message}`)
  }

  console.log(`✅ Activation créée: ${testActivation.id}`)
  console.log(`   Service: ${testActivation.service_code}`)
  console.log(`   Prix: ${freezeAmount}Ⓐ`)
  console.log(`   Expire: ${new Date(testActivation.expires_at).toLocaleTimeString()} (dans 10 min)`)

  // 3. Créer balance operation freeze
  console.log('\n3️⃣ Création balance operation freeze...')
  
  const balanceOp = {
    id: crypto.randomUUID(),
    user_id: userId,
    activation_id: testActivation.id,
    operation_type: 'freeze',
    amount: freezeAmount,
    balance_before: currentUser.balance,
    balance_after: currentUser.balance, // Balance unchanged in Model A
    frozen_before: currentUser.frozen_balance,
    frozen_after: currentUser.frozen_balance + freezeAmount,
    created_at: new Date().toISOString()
  }

  const { error: opError } = await sb
    .from('balance_operations')
    .insert([balanceOp])

  if (opError) {
    throw new Error(`Erreur balance operation: ${opError.message}`)
  }

  console.log(`✅ Balance operation créée: ${balanceOp.id}`)

  // 4. Mettre à jour frozen_balance utilisateur
  console.log('\n4️⃣ Mise à jour frozen_balance...')
  
  const { error: updateError } = await sb
    .from('users')
    .update({ 
      frozen_balance: currentUser.frozen_balance + freezeAmount 
    })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Erreur update user: ${updateError.message}`)
  }

  console.log(`✅ User frozen_balance mis à jour`)

  // 5. Vérification finale
  console.log('\n5️⃣ Vérification finale...')
  
  const { data: finalUser } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`\n📊 RÉSULTAT FINAL:`)
  console.log(`   Balance: ${currentUser.balance}Ⓐ → ${finalUser.balance}Ⓐ`)
  console.log(`   Frozen: ${currentUser.frozen_balance}Ⓐ → ${finalUser.frozen_balance}Ⓐ`)
  console.log(`   Variation: +${finalUser.frozen_balance - currentUser.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ`)

  console.log(`\n🎯 ACTIVATION CRÉÉE:`)
  console.log(`   ID: ${testActivation.id}`)
  console.log(`   Expire dans: 10 minutes`)
  console.log(`   Sera traitée par: atomic-timeout-processor`)
  
  console.log(`\n✅ ${freezeAmount}Ⓐ ajoutés au frozen_balance de buba6c@gmail.com!`)
  console.log(`💡 Cette activation testera le nouveau système dans 10 minutes.`)

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}