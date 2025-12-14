import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com
const testAmount = 8 // 8Ⓐ pour ce test

console.log('🚀 NOUVEAU TEST: Activation qui expire dans 3 minutes\n')

async function createTest3MinExpiration() {
  try {
    // 1. Vérifier l'état actuel
    const { data: currentUser } = await sb
      .from('users')
      .select('email, balance, frozen_balance')
      .eq('id', userId)
      .single()

    console.log(`📧 User: ${currentUser.email}`)
    console.log(`💰 Balance: ${currentUser.balance}Ⓐ`)
    console.log(`🔒 Frozen: ${currentUser.frozen_balance}Ⓐ`)
    console.log(`💸 Disponible: ${currentUser.balance - currentUser.frozen_balance}Ⓐ`)

    // 2. Créer activation qui expire dans exactement 3 minutes
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 3 * 60 * 1000) // +3 minutes
    
    const testActivation = {
      id: crypto.randomUUID(),
      user_id: userId,
      service_code: 'test3min',
      country_code: 'test',
      price: testAmount,
      frozen_amount: testAmount,
      order_id: 'TEST3MIN_' + Date.now(),
      phone: 'TEST_' + Math.random().toString().substr(2, 8),
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      provider: 'test',
      operator: 'test',
      charged: false
    }

    console.log(`\n⏰ TIMING:`)
    console.log(`   Création: ${now.toLocaleTimeString()}`)
    console.log(`   Expiration: ${expiresAt.toLocaleTimeString()}`) 
    console.log(`   Durée: 3 minutes exactes`)

    // 3. Insérer l'activation
    const { error: activationError } = await sb
      .from('activations')
      .insert([testActivation])

    if (activationError) {
      throw new Error(`Erreur création activation: ${activationError.message}`)
    }

    console.log(`\n✅ ACTIVATION CRÉÉE:`)
    console.log(`   ID: ${testActivation.id}`)
    console.log(`   Service: ${testActivation.service_code}`)
    console.log(`   Prix: ${testAmount}Ⓐ`)

    // 4. Créer balance operation
    const balanceOp = {
      id: crypto.randomUUID(),
      user_id: userId,
      activation_id: testActivation.id,
      operation_type: 'freeze',
      amount: testAmount,
      balance_before: currentUser.balance,
      balance_after: currentUser.balance,
      frozen_before: currentUser.frozen_balance,
      frozen_after: currentUser.frozen_balance + testAmount,
      created_at: new Date().toISOString()
    }

    const { error: opError } = await sb
      .from('balance_operations')
      .insert([balanceOp])

    if (opError) {
      throw new Error(`Erreur balance operation: ${opError.message}`)
    }

    // 5. Mettre à jour frozen_balance
    const { error: updateError } = await sb
      .from('users')
      .update({ 
        frozen_balance: currentUser.frozen_balance + testAmount 
      })
      .eq('id', userId)

    if (updateError) {
      throw new Error(`Erreur update frozen_balance: ${updateError.message}`)
    }

    console.log(`✅ Balance operation créée!`)
    console.log(`✅ User frozen_balance: ${currentUser.frozen_balance} → ${currentUser.frozen_balance + testAmount}Ⓐ`)

    // 6. État final
    const { data: finalUser } = await sb
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    console.log(`\n📊 ÉTAT UTILISATEUR:`)
    console.log(`   Balance: ${finalUser.balance}Ⓐ`)
    console.log(`   Frozen: ${finalUser.frozen_balance}Ⓐ`)
    console.log(`   Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ`)

    console.log(`\n⏰ TIMELINE DE TEST:`)
    console.log(`   🟢 Créé: ${now.toLocaleTimeString()}`)
    console.log(`   🔴 Expire: ${expiresAt.toLocaleTimeString()}`)
    console.log(`   📡 Cron: Toutes les 2 minutes (prochain cycle dans max 2 min)`)
    console.log(`   🎯 Test: Dans ~4 minutes maximum`)

    // 7. Attendre et vérifier automatiquement
    console.log(`\n📋 ACTIVATION TEST ID: ${testActivation.id}`)
    console.log(`⏳ Lancement de la vérification automatique dans 4 minutes...`)
    
    // Attendre 4 minutes puis vérifier
    setTimeout(async () => {
      await checkTestResult(testActivation.id, testAmount, currentUser.frozen_balance)
    }, 4 * 60 * 1000)

    console.log(`💡 Script en attente... Résultat dans 4 minutes`)
    console.log(`🔍 Gardez ce terminal ouvert!`)

    return testActivation.id

  } catch (error) {
    console.error('❌ ERREUR CRÉATION TEST:', error.message)
  }
}

async function checkTestResult(testId, expectedRefund, originalFrozen) {
  console.log(`\n🔍 VÉRIFICATION FINALE - ${new Date().toLocaleTimeString()}`)
  console.log(`📋 Test ID: ${testId.substring(0, 8)}...`)

  try {
    // Vérifier l'activation
    const { data: activation } = await sb
      .from('activations')
      .select('status, frozen_amount, expires_at')
      .eq('id', testId)
      .single()

    // Vérifier les balance operations
    const { data: operations } = await sb
      .from('balance_operations')
      .select('operation_type, amount')
      .eq('activation_id', testId)
      .order('created_at', { ascending: true })

    // Vérifier l'utilisateur
    const { data: user } = await sb
      .from('users')
      .select('frozen_balance')
      .eq('id', userId)
      .single()

    const now = new Date()
    const expires = new Date(activation.expires_at)
    const hasExpired = now > expires

    console.log(`\n📊 RÉSULTATS:`)
    console.log(`   Statut: ${activation.status}`)
    console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)
    console.log(`   Expiré: ${hasExpired ? 'OUI' : 'NON'} (${expires.toLocaleTimeString()})`)
    console.log(`   User frozen: ${user.frozen_balance}Ⓐ (était ${originalFrozen + expectedRefund}Ⓐ)`)
    console.log(`   Operations: ${operations?.map(o => `${o.operation_type}(${o.amount}Ⓐ)`).join(', ')}`)

    // Analyser le résultat
    const hasRefund = operations?.some(op => op.operation_type === 'refund')
    const expectedFinalFrozen = originalFrozen // Après refund, retour à l'état initial

    if (activation.status === 'timeout' && 
        activation.frozen_amount === 0 && 
        hasRefund && 
        user.frozen_balance === expectedFinalFrozen) {
      
      console.log(`\n🎉 SUCCÈS TOTAL!`)
      console.log(`   ✅ Status: timeout`)
      console.log(`   ✅ frozen_amount: 0Ⓐ`)
      console.log(`   ✅ Refund créé: ${expectedRefund}Ⓐ`)
      console.log(`   ✅ User frozen réduit: ${originalFrozen + expectedRefund} → ${user.frozen_balance}Ⓐ`)
      console.log(`\n🚀 Le nouveau système cron-atomic-reliable fonctionne parfaitement!`)
      
    } else {
      console.log(`\n⚠️ PROBLÈME DÉTECTÉ:`)
      if (activation.status !== 'timeout') console.log(`   ❌ Status: ${activation.status} (attendu: timeout)`)
      if (activation.frozen_amount !== 0) console.log(`   ❌ frozen_amount: ${activation.frozen_amount}Ⓐ (attendu: 0)`)
      if (!hasRefund) console.log(`   ❌ Pas de refund dans balance_operations`)
      if (user.frozen_balance !== expectedFinalFrozen) console.log(`   ❌ User frozen: ${user.frozen_balance}Ⓐ (attendu: ${expectedFinalFrozen}Ⓐ)`)
      
      console.log(`\n🔧 Diagnostic à faire sur le système atomic...`)
    }

  } catch (error) {
    console.error('❌ ERREUR VÉRIFICATION:', error.message)
  }
}

// Lancer le test
createTest3MinExpiration()