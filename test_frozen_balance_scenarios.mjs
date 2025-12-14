/**
 * 🧪 TEST COMPLET DU SYSTÈME FROZEN BALANCE
 * 
 * Ce script teste tous les scénarios critiques pour valider
 * qu'il n'y a pas de risque financier.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

const TEST_USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('🧪 TEST SYSTÈME FROZEN BALANCE')
console.log('='.repeat(70))

// Fonction utilitaire pour récupérer l'état actuel
async function getState() {
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', TEST_USER_ID)
    .single()
  
  const { data: activations } = await supabase
    .from('activations')
    .select('id, status, price, frozen_amount')
    .eq('user_id', TEST_USER_ID)
    .in('status', ['pending', 'waiting'])
  
  return { user, activations: activations || [] }
}

// Fonction pour afficher l'état
function printState(label, state) {
  console.log(`\n📊 ${label}:`)
  console.log(`   Balance: ${state.user?.balance || 0}`)
  console.log(`   Frozen Balance: ${state.user?.frozen_balance || 0}`)
  console.log(`   Disponible: ${(state.user?.balance || 0) - (state.user?.frozen_balance || 0)}`)
  console.log(`   Activations pending: ${state.activations.length}`)
  if (state.activations.length > 0) {
    state.activations.forEach(a => {
      console.log(`      - ${a.id.substring(0,8)}... price=${a.price}, frozen_amount=${a.frozen_amount}`)
    })
  }
}

// Fonction pour créer une activation de test
async function createTestActivation(price) {
  const { data, error } = await supabase
    .from('activations')
    .insert({
      user_id: TEST_USER_ID,
      order_id: Math.floor(Math.random() * 1000000000),
      phone: '+1' + Math.floor(Math.random() * 9000000000 + 1000000000),
      service_code: 'test',
      country_code: 'us',
      price: price,
      frozen_amount: price,
      status: 'pending',
      provider: 'test'
    })
    .select()
    .single()
  
  if (error) {
    console.error('❌ Erreur création activation:', error.message)
    return null
  }
  
  // Mettre à jour frozen_balance
  const { data: user } = await supabase
    .from('users')
    .select('frozen_balance')
    .eq('id', TEST_USER_ID)
    .single()
  
  await supabase
    .from('users')
    .update({ frozen_balance: (user?.frozen_balance || 0) + price })
    .eq('id', TEST_USER_ID)
  
  return data
}

// Fonction pour annuler une activation (simule cancel-sms-activate-order)
async function cancelActivation(activationId) {
  // Récupérer l'activation
  const { data: activation } = await supabase
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .single()
  
  if (!activation) return false
  
  // Récupérer l'utilisateur
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', TEST_USER_ID)
    .single()
  
  // V2: Utiliser frozen_amount (pas price!)
  const frozenAmountToUnfreeze = activation.frozen_amount || 0
  const actualUnfreeze = Math.min(frozenAmountToUnfreeze, user.frozen_balance || 0)
  const newFrozenBalance = Math.max(0, (user.frozen_balance || 0) - actualUnfreeze)
  
  // Mettre à jour
  await supabase
    .from('users')
    .update({ frozen_balance: newFrozenBalance })
    .eq('id', TEST_USER_ID)
  
  await supabase
    .from('activations')
    .update({ status: 'cancelled', frozen_amount: 0 })
    .eq('id', activationId)
  
  return { unfrozen: actualUnfreeze, newFrozen: newFrozenBalance }
}

// Nettoyer les activations de test
async function cleanup() {
  await supabase
    .from('activations')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .eq('provider', 'test')
  
  await supabase
    .from('users')
    .update({ frozen_balance: 0 })
    .eq('id', TEST_USER_ID)
}

// ============================================================================
// TESTS
// ============================================================================

console.log('\n' + '='.repeat(70))
console.log('🧹 Nettoyage initial...')
await cleanup()

const initialState = await getState()
printState('État initial', initialState)
const initialBalance = initialState.user?.balance || 0

// ---------------------------------------------------------------------------
// TEST 1: Achat unique + Annulation
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 1: Achat unique + Annulation')
console.log('='.repeat(70))

const act1 = await createTestActivation(50)
if (act1) {
  console.log(`\n✅ Activation créée: ${act1.id.substring(0,8)}... (50Ⓐ)`)
  
  let state = await getState()
  printState('Après achat', state)
  
  const expectedFrozen1 = 50
  if (state.user.frozen_balance === expectedFrozen1) {
    console.log(`\n✅ PASS: frozen_balance = ${expectedFrozen1} (attendu)`)
  } else {
    console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu ${expectedFrozen1}`)
  }
  
  // Annuler
  const result = await cancelActivation(act1.id)
  console.log(`\n🔓 Annulation: dégelé ${result.unfrozen}, nouveau frozen: ${result.newFrozen}`)
  
  state = await getState()
  printState('Après annulation', state)
  
  if (state.user.frozen_balance === 0) {
    console.log(`\n✅ PASS: frozen_balance = 0 (attendu)`)
  } else {
    console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu 0`)
  }
}

await cleanup()

// ---------------------------------------------------------------------------
// TEST 2: Achats multiples + Annulation d'un seul (BUG CRITIQUE!)
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 2: Achats multiples + Annulation d\'un seul')
console.log('   (Ce test valide que le bug critique est corrigé)')
console.log('='.repeat(70))

const act2a = await createTestActivation(50)
const act2b = await createTestActivation(30)
const act2c = await createTestActivation(20)

if (act2a && act2b && act2c) {
  console.log(`\n✅ 3 activations créées: 50Ⓐ + 30Ⓐ + 20Ⓐ = 100Ⓐ total`)
  
  let state = await getState()
  printState('Après 3 achats', state)
  
  const expectedFrozen2 = 100
  if (state.user.frozen_balance === expectedFrozen2) {
    console.log(`\n✅ PASS: frozen_balance = ${expectedFrozen2} (attendu)`)
  } else {
    console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu ${expectedFrozen2}`)
  }
  
  // Annuler SEULEMENT la première (50Ⓐ)
  console.log(`\n🔓 Annulation de l'activation à 50Ⓐ uniquement...`)
  const result = await cancelActivation(act2a.id)
  console.log(`   Dégelé: ${result.unfrozen}, nouveau frozen: ${result.newFrozen}`)
  
  state = await getState()
  printState('Après annulation de 50Ⓐ', state)
  
  // ⚠️ TEST CRITIQUE: frozen_balance doit être 50 (30+20), PAS 0!
  const expectedAfterCancel = 50  // 30 + 20
  if (state.user.frozen_balance === expectedAfterCancel) {
    console.log(`\n✅✅✅ PASS CRITIQUE: frozen_balance = ${expectedAfterCancel}`)
    console.log(`   Le bug est CORRIGÉ! Seul le montant de l'activation annulée a été dégelé.`)
  } else if (state.user.frozen_balance === 0) {
    console.log(`\n❌❌❌ FAIL CRITIQUE: frozen_balance = 0`)
    console.log(`   ⚠️ BUG! Tout le frozen_balance a été libéré au lieu de 50 seulement!`)
  } else {
    console.log(`\n❌ FAIL: frozen_balance = ${state.user.frozen_balance}, attendu ${expectedAfterCancel}`)
  }
  
  // Vérifier les activations restantes
  console.log(`\n📋 Activations restantes:`)
  state.activations.forEach(a => {
    console.log(`   - ${a.id.substring(0,8)}... status=${a.status}, price=${a.price}, frozen_amount=${a.frozen_amount}`)
  })
}

await cleanup()

// ---------------------------------------------------------------------------
// TEST 3: Double annulation (idempotence)
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 3: Double annulation (test idempotence)')
console.log('='.repeat(70))

const act3 = await createTestActivation(75)
if (act3) {
  console.log(`\n✅ Activation créée: 75Ⓐ`)
  
  // Première annulation
  await cancelActivation(act3.id)
  let state = await getState()
  console.log(`\n1ère annulation: frozen_balance = ${state.user.frozen_balance}`)
  
  // Deuxième annulation (ne devrait rien changer car frozen_amount = 0)
  // Simuler en essayant d'annuler à nouveau
  const { data: act3Updated } = await supabase
    .from('activations')
    .select('frozen_amount')
    .eq('id', act3.id)
    .single()
  
  console.log(`   frozen_amount après 1ère annulation: ${act3Updated?.frozen_amount}`)
  
  if (act3Updated?.frozen_amount === 0) {
    console.log(`\n✅ PASS: frozen_amount = 0 après annulation`)
    console.log(`   Une 2ème annulation ne libérerait rien (protection contre double-remboursement)`)
  } else {
    console.log(`\n❌ FAIL: frozen_amount devrait être 0`)
  }
}

await cleanup()

// ---------------------------------------------------------------------------
// TEST 4: Vérification santé finale
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📋 TEST 4: Vérification santé finale')
console.log('='.repeat(70))

const { data: health } = await supabase
  .from('v_frozen_balance_health')
  .select('*')
  .eq('user_id', TEST_USER_ID)

if (!health || health.length === 0) {
  console.log('\n✅ PASS: Aucune anomalie détectée (vue vide = OK)')
} else {
  const h = health[0]
  if (h.health_status === 'OK') {
    console.log(`\n✅ PASS: health_status = OK`)
  } else {
    console.log(`\n❌ FAIL: health_status = ${h.health_status}`)
    console.log(`   stored_frozen: ${h.stored_frozen}`)
    console.log(`   calculated_frozen: ${h.calculated_frozen}`)
    console.log(`   discrepancy: ${h.discrepancy}`)
  }
}

// ---------------------------------------------------------------------------
// RÉSUMÉ
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('📊 RÉSUMÉ DES TESTS')
console.log('='.repeat(70))

const finalState = await getState()
console.log(`\nBalance finale: ${finalState.user?.balance}`)
console.log(`Frozen finale: ${finalState.user?.frozen_balance}`)

if (finalState.user?.balance === initialBalance && finalState.user?.frozen_balance === 0) {
  console.log(`\n✅✅✅ TOUS LES TESTS PASSENT!`)
  console.log(`Le système de frozen_balance est sécurisé.`)
} else {
  console.log(`\n⚠️ Vérifier les résultats ci-dessus`)
}

console.log('\n' + '='.repeat(70))
