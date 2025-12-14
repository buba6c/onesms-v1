import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com
const amountToFreeze = 10

console.log('💰 AJOUT FROZEN BALANCE: 10Ⓐ pour buba6c@gmail.com\n')

try {
  // 1. Vérifier l'état actuel
  console.log('1️⃣ État actuel du compte...')
  
  const { data: currentUser, error: userError } = await sb
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', userId)
    .single()

  if (userError) {
    throw new Error(`Erreur récupération user: ${userError.message}`)
  }

  console.log(`📧 Email: ${currentUser.email}`)
  console.log(`💰 Balance: ${currentUser.balance}Ⓐ`)
  console.log(`🔒 Frozen: ${currentUser.frozen_balance}Ⓐ`)

  // 2. Créer une activation de test qui va geler les fonds
  console.log('\n2️⃣ Création d\'une activation test pour geler 10Ⓐ...')
  
  const testActivation = {
    id: crypto.randomUUID(),
    user_id: userId,
    service_code: 'test10a',
    country_code: 'test',
    price: amountToFreeze,
    frozen_amount: amountToFreeze,
    order_id: 'TEST_' + Date.now(),
    phone: 'TEST_PHONE',
    status: 'pending',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    provider: 'test',
    operator: 'test',
    charged: false
  }

  // Insérer l'activation
  const { error: activationError } = await sb
    .from('activations')
    .insert([testActivation])

  if (activationError) {
    throw new Error(`Erreur création activation: ${activationError.message}`)
  }

  console.log(`✅ Activation créée: ${testActivation.id}`)

  // 3. Créer la balance_operation pour geler les fonds
  console.log('\n3️⃣ Création de l\'opération de gel...')
  
  const balanceOp = {
    id: crypto.randomUUID(),
    user_id: userId,
    activation_id: testActivation.id,
    operation_type: 'freeze',
    amount: amountToFreeze,
    balance_before: currentUser.balance,
    balance_after: currentUser.balance,
    frozen_before: currentUser.frozen_balance,
    frozen_after: currentUser.frozen_balance + amountToFreeze,
    created_at: new Date().toISOString()
  }

  const { error: opError } = await sb
    .from('balance_operations')
    .insert([balanceOp])

  if (opError) {
    throw new Error(`Erreur balance operation: ${opError.message}`)
  }

  console.log(`✅ Balance operation créée: ${balanceOp.id}`)

  // 4. Mettre à jour frozen_balance de l'utilisateur
  console.log('\n4️⃣ Mise à jour frozen_balance...')
  
  const { error: updateError } = await sb
    .from('users')
    .update({ 
      frozen_balance: currentUser.frozen_balance + amountToFreeze 
    })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Erreur update frozen_balance: ${updateError.message}`)
  }

  // 5. Vérifier le résultat final
  console.log('\n5️⃣ Vérification finale...')
  
  const { data: finalUser } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`\n📊 RÉSULTAT:`)
  console.log(`   Balance: ${currentUser.balance}Ⓐ → ${finalUser.balance}Ⓐ`)
  console.log(`   Frozen: ${currentUser.frozen_balance}Ⓐ → ${finalUser.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ`)
  console.log(`   Activation: ${testActivation.id} (expire dans 5 min)`)

  console.log(`\n✅ 10Ⓐ ajoutés au frozen_balance de buba6c@gmail.com!`)
  console.log(`💡 L'activation va expirer dans 5 minutes et tester le nouveau cron.`)

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}