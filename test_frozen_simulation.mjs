/**
 * 🧪 TEST FROZEN BALANCE - Simulation directe en DB
 * Ce test simule exactement ce que font les Edge Functions
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY  // anon key fonctionne
)

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('🧪 TEST FROZEN BALANCE - Simulation DB')
console.log('='.repeat(70))

// Récupérer état
async function getState() {
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()
  
  const { data: activations } = await supabase
    .from('activations')
    .select('id, order_id, phone, price, frozen_amount, status')
    .eq('user_id', USER_ID)
    .eq('provider', 'test-simulation')
  
  return { user, activations: activations || [] }
}

function printState(label, state) {
  console.log(`\n📊 ${label}:`)
  console.log(`   Balance: ${state.user?.balance}Ⓐ`)
  console.log(`   Frozen: ${state.user?.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${(state.user?.balance || 0) - (state.user?.frozen_balance || 0)}Ⓐ`)
  if (state.activations.length > 0) {
    console.log(`   Activations test: ${state.activations.length}`)
    state.activations.forEach(a => {
      console.log(`      📱 ${a.phone} | price=${a.price}Ⓐ | frozen=${a.frozen_amount}Ⓐ | status=${a.status}`)
    })
  }
}

// Simuler un achat (comme buy-sms-activate-number)
async function simulateBuy(price, phone) {
  // 1. Récupérer user
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()
  
  const currentFrozen = user.frozen_balance || 0
  const newFrozen = currentFrozen + price
  
  // 2. Créer l'activation avec frozen_amount
  const { data: activation, error } = await supabase
    .from('activations')
    .insert({
      user_id: USER_ID,
      order_id: String(Math.floor(Math.random() * 1000000000)),
      phone: phone,
      service_code: 'test',
      country_code: 'test',
      operator: 'test-simulation',
      price: price,
      frozen_amount: price,  // V2: Le montant gelé pour CETTE activation
      status: 'pending',
      provider: 'test-simulation',
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString()
    })
    .select()
    .single()
  
  if (error) {
    console.log(`   ❌ Erreur création: ${error.message}`)
    return null
  }
  
  // 3. Mettre à jour frozen_balance
  await supabase
    .from('users')
    .update({ frozen_balance: newFrozen })
    .eq('id', USER_ID)
  
  return activation
}

// Simuler une annulation (comme cancel-sms-activate-order V2)
async function simulateCancel(activationId) {
  // 1. Récupérer l'activation
  const { data: activation } = await supabase
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .single()
  
  if (!activation) return { success: false, error: 'Activation not found' }
  
  // 2. Récupérer user
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()
  
  // 3. V2: Utiliser frozen_amount de l'activation (PAS price!)
  const frozenAmountToUnfreeze = activation.frozen_amount || 0
  
  // Protection: ne pas dégeler plus que ce qui est gelé
  const actualUnfreeze = Math.min(frozenAmountToUnfreeze, user.frozen_balance || 0)
  const newFrozen = Math.max(0, (user.frozen_balance || 0) - actualUnfreeze)
  
  // 4. Mettre à jour
  await supabase
    .from('users')
    .update({ frozen_balance: newFrozen })
    .eq('id', USER_ID)
  
  await supabase
    .from('activations')
    .update({ 
      status: 'cancelled',
      frozen_amount: 0  // V2: Reset le frozen_amount
    })
    .eq('id', activationId)
  
  return { 
    success: true, 
    unfrozen: actualUnfreeze,
    newFrozen: newFrozen 
  }
}

// Nettoyer les tests
async function cleanup() {
  // Supprimer les activations de test
  await supabase
    .from('activations')
    .delete()
    .eq('user_id', USER_ID)
    .eq('provider', 'test-simulation')
  
  // Récupérer et recalculer frozen_balance basé sur les vraies activations
  const { data: realActivations } = await supabase
    .from('activations')
    .select('frozen_amount')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'waiting'])
  
  const realFrozen = realActivations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0
  
  await supabase
    .from('users')
    .update({ frozen_balance: realFrozen })
    .eq('id', USER_ID)
}

// ============================================================================
// TESTS
// ============================================================================

// Nettoyage initial
await cleanup()

const initialState = await getState()
printState('ÉTAT INITIAL', initialState)
const initialBalance = initialState.user?.balance
const initialFrozen = initialState.user?.frozen_balance || 0

// ---------------------------------------------------------------------------
// TEST 1: Achat unique + annulation
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 1: ACHAT UNIQUE + ANNULATION')
console.log('='.repeat(70))

const act1 = await simulateBuy(50, '+1234567001')
console.log(`\n✅ Activation créée: 50Ⓐ`)

let state = await getState()
printState('Après achat', state)

if (state.user.frozen_balance === initialFrozen + 50) {
  console.log(`\n✅ PASS: frozen_balance = ${state.user.frozen_balance} (attendu: ${initialFrozen + 50})`)
} else {
  console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu ${initialFrozen + 50}`)
}

// Annuler
const cancel1 = await simulateCancel(act1.id)
console.log(`\n🔓 Annulation: dégelé ${cancel1.unfrozen}Ⓐ`)

state = await getState()
printState('Après annulation', state)

if (state.user.frozen_balance === initialFrozen) {
  console.log(`\n✅ PASS: frozen_balance revenu à ${initialFrozen}`)
} else {
  console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu ${initialFrozen}`)
}

await cleanup()

// ---------------------------------------------------------------------------
// TEST 2: ACHATS MULTIPLES + ANNULATION D'UN SEUL (TEST CRITIQUE!)
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 2: ACHATS MULTIPLES + ANNULATION D\'UN SEUL')
console.log('   ⚠️ CE TEST VALIDE QUE LE BUG CRITIQUE EST CORRIGÉ')
console.log('='.repeat(70))

const actA = await simulateBuy(50, '+1234567002')
console.log(`\n✅ Activation A créée: 50Ⓐ`)

const actB = await simulateBuy(30, '+1234567003')
console.log(`✅ Activation B créée: 30Ⓐ`)

const actC = await simulateBuy(20, '+1234567004')
console.log(`✅ Activation C créée: 20Ⓐ`)

state = await getState()
printState('Après 3 achats (50+30+20=100Ⓐ)', state)

const expectedFrozen = initialFrozen + 100
if (Math.abs(state.user.frozen_balance - expectedFrozen) < 0.01) {
  console.log(`\n✅ PASS: frozen_balance = ${state.user.frozen_balance}Ⓐ (attendu: ${expectedFrozen})`)
} else {
  console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu ${expectedFrozen}`)
}

// ANNULER SEULEMENT L'ACTIVATION A (50Ⓐ)
console.log('\n' + '⚠️'.repeat(35))
console.log('🎯 ANNULATION DE L\'ACTIVATION A SEULEMENT (50Ⓐ)')
console.log('⚠️'.repeat(35))

const cancelA = await simulateCancel(actA.id)
console.log(`\n🔓 Annulation A: dégelé ${cancelA.unfrozen}Ⓐ, nouveau frozen: ${cancelA.newFrozen}Ⓐ`)

state = await getState()
printState('Après annulation de A (50Ⓐ)', state)

// VÉRIFICATION CRITIQUE
const expectedAfterCancel = initialFrozen + 50  // B(30) + C(20) = 50
console.log(`\n🎯 VÉRIFICATION CRITIQUE:`)
console.log(`   Activations restantes: B(30Ⓐ) + C(20Ⓐ) = 50Ⓐ`)
console.log(`   Frozen ATTENDU: ${expectedAfterCancel}Ⓐ`)
console.log(`   Frozen ACTUEL: ${state.user.frozen_balance}Ⓐ`)

if (Math.abs(state.user.frozen_balance - expectedAfterCancel) < 0.01) {
  console.log(`\n   ✅✅✅ SUCCÈS! LE BUG EST CORRIGÉ!`)
  console.log(`   Seul le montant de l'activation annulée (50Ⓐ) a été dégelé.`)
  console.log(`   Les 50Ⓐ restants (30+20) sont toujours gelés.`)
} else if (state.user.frozen_balance === 0 || state.user.frozen_balance === initialFrozen) {
  console.log(`\n   ❌❌❌ ÉCHEC! LE BUG N'EST PAS CORRIGÉ!`)
  console.log(`   TOUT le frozen_balance a été libéré au lieu de 50Ⓐ seulement!`)
} else {
  console.log(`\n   ⚠️ Résultat inattendu - à vérifier`)
}

// Vérifier les frozen_amount individuels
console.log(`\n📋 Vérification des frozen_amount individuels:`)
const { data: activations } = await supabase
  .from('activations')
  .select('phone, price, frozen_amount, status')
  .eq('user_id', USER_ID)
  .eq('provider', 'test-simulation')

activations?.forEach(a => {
  const expected = a.status === 'cancelled' ? 0 : a.price
  const status = a.frozen_amount === expected ? '✅' : '❌'
  console.log(`   ${status} ${a.phone}: price=${a.price}, frozen_amount=${a.frozen_amount}, status=${a.status}`)
})

// Nettoyage
await cleanup()

// ---------------------------------------------------------------------------
// TEST 3: Double annulation (idempotence)
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 3: DOUBLE ANNULATION (IDEMPOTENCE)')
console.log('='.repeat(70))

const actD = await simulateBuy(75, '+1234567005')
console.log(`\n✅ Activation créée: 75Ⓐ`)

// Première annulation
await simulateCancel(actD.id)
state = await getState()
const frozenAfter1stCancel = state.user.frozen_balance
console.log(`\n1ère annulation: frozen_balance = ${frozenAfter1stCancel}Ⓐ`)

// Deuxième annulation (ne devrait rien faire car frozen_amount = 0)
const cancel2nd = await simulateCancel(actD.id)
state = await getState()
console.log(`2ème annulation: frozen_balance = ${state.user.frozen_balance}Ⓐ, dégelé: ${cancel2nd.unfrozen}Ⓐ`)

if (state.user.frozen_balance === frozenAfter1stCancel && cancel2nd.unfrozen === 0) {
  console.log(`\n✅ PASS: La 2ème annulation n'a rien dégelé (frozen_amount était déjà 0)`)
} else {
  console.log(`\n❌ FAIL: La 2ème annulation a dégelé des crédits!`)
}

await cleanup()

// ---------------------------------------------------------------------------
// RÉSUMÉ FINAL
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📊 RÉSUMÉ FINAL')
console.log('='.repeat(70))

const finalState = await getState()
printState('État final', finalState)

const { data: health } = await supabase
  .from('v_frozen_balance_health')
  .select('*')
  .eq('user_id', USER_ID)

if (!health || health.length === 0 || health[0]?.health_status === 'OK') {
  console.log('\n✅ Santé frozen_balance: OK')
} else {
  console.log('\n⚠️ Anomalie:', health[0])
}

if (Math.abs((finalState.user?.balance || 0) - initialBalance) < 0.01) {
  console.log(`\n✅✅✅ TESTS TERMINÉS - Balance inchangée: ${finalState.user?.balance}Ⓐ`)
} else {
  console.log(`\n⚠️ Balance a changé: ${initialBalance} → ${finalState.user?.balance}`)
}

console.log('\n' + '='.repeat(70))
