/**
 * 🧪 TEST INTELLIGENT FROZEN BALANCE
 * Utilise le service_role pour tester directement
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL

console.log('🧪 TEST INTELLIGENT FROZEN BALANCE')
console.log('='.repeat(70))

// Fonctions utilitaires
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
    .in('status', ['pending', 'waiting'])
  
  return { user, activations: activations || [] }
}

function printState(label, state) {
  console.log(`\n📊 ${label}:`)
  console.log(`   Balance: ${state.user?.balance}Ⓐ`)
  console.log(`   Frozen: ${state.user?.frozen_balance}Ⓐ`)
  console.log(`   Disponible: ${(state.user?.balance || 0) - (state.user?.frozen_balance || 0)}Ⓐ`)
  console.log(`   Activations pending: ${state.activations.length}`)
  state.activations.forEach(a => {
    console.log(`      📱 ${a.phone} | price=${a.price}Ⓐ | frozen_amount=${a.frozen_amount}Ⓐ | id=${a.id.substring(0,8)}...`)
  })
}

// Appeler une Edge Function
async function callEdgeFunction(name, body) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL}`
      },
      body: JSON.stringify(body)
    })
    return await response.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// ============================================================================
// DÉBUT DES TESTS
// ============================================================================

const initialState = await getState()
printState('ÉTAT INITIAL', initialState)
const initialBalance = initialState.user?.balance || 0
const initialFrozen = initialState.user?.frozen_balance || 0

// ---------------------------------------------------------------------------
// TEST: Acheter 2 activations pas chères
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70))
console.log('🛒 ACHAT DE 2 ACTIVATIONS')
console.log('='.repeat(70))

// Activation 1: Telegram Indonésie (pas cher)
console.log('\n📱 Achat activation 1: Telegram - Indonésie...')
const buy1 = await callEdgeFunction('buy-sms-activate-number', {
  country: 'id',
  product: 'tg',
  userId: USER_ID
})

let activation1 = null
if (buy1.success) {
  activation1 = buy1.data
  console.log(`   ✅ Succès! Phone: ${activation1.phone}, Price: ${activation1.price}Ⓐ`)
} else {
  console.log(`   ❌ Erreur: ${buy1.error}`)
}

// Petit délai
await new Promise(r => setTimeout(r, 1000))

// Activation 2: WhatsApp Indonésie
console.log('\n📱 Achat activation 2: WhatsApp - Indonésie...')
const buy2 = await callEdgeFunction('buy-sms-activate-number', {
  country: 'id', 
  product: 'wa',
  userId: USER_ID
})

let activation2 = null
if (buy2.success) {
  activation2 = buy2.data
  console.log(`   ✅ Succès! Phone: ${activation2.phone}, Price: ${activation2.price}Ⓐ`)
} else {
  console.log(`   ❌ Erreur: ${buy2.error}`)
}

// État après achats
const stateAfterBuys = await getState()
printState('APRÈS 2 ACHATS', stateAfterBuys)

// Vérification
if (activation1 && activation2) {
  const expectedFrozen = initialFrozen + activation1.price + activation2.price
  const actualFrozen = stateAfterBuys.user?.frozen_balance || 0
  
  console.log(`\n🔍 VÉRIFICATION:`)
  console.log(`   Frozen attendu: ${initialFrozen} + ${activation1.price} + ${activation2.price} = ${expectedFrozen}Ⓐ`)
  console.log(`   Frozen actuel: ${actualFrozen}Ⓐ`)
  
  if (Math.abs(actualFrozen - expectedFrozen) < 0.01) {
    console.log(`   ✅ PASS: frozen_balance correct!`)
  } else {
    console.log(`   ❌ FAIL: Différence détectée!`)
  }
}

// ---------------------------------------------------------------------------
// TEST CRITIQUE: Annuler UNE SEULE activation
// ---------------------------------------------------------------------------
if (activation1) {
  console.log('\n' + '='.repeat(70))
  console.log('🔴 TEST CRITIQUE: ANNULATION D\'UNE SEULE ACTIVATION')
  console.log('='.repeat(70))
  
  console.log(`\n🗑️ Annulation de l'activation 1 (${activation1.phone}, ${activation1.price}Ⓐ)...`)
  
  const cancel = await callEdgeFunction('cancel-sms-activate-order', {
    orderId: activation1.order_id,
    activationId: activation1.id,
    userId: USER_ID
  })
  
  if (cancel.success) {
    console.log(`   ✅ Annulation réussie!`)
  } else {
    console.log(`   ❌ Erreur: ${cancel.error}`)
  }
  
  // Petit délai
  await new Promise(r => setTimeout(r, 500))
  
  // État après annulation
  const stateAfterCancel = await getState()
  printState('APRÈS ANNULATION DE 1 SEULE ACTIVATION', stateAfterCancel)
  
  // VÉRIFICATION CRITIQUE
  console.log('\n' + '⚠️'.repeat(35))
  console.log('🎯 VÉRIFICATION CRITIQUE DU BUG')
  console.log('⚠️'.repeat(35))
  
  if (activation2) {
    const expectedFrozenAfterCancel = initialFrozen + activation2.price
    const actualFrozenAfterCancel = stateAfterCancel.user?.frozen_balance || 0
    
    console.log(`\n   Activation 1 annulée: ${activation1.price}Ⓐ`)
    console.log(`   Activation 2 toujours active: ${activation2.price}Ⓐ`)
    console.log(`\n   Frozen ATTENDU: ${expectedFrozenAfterCancel}Ⓐ (seulement activation 2)`)
    console.log(`   Frozen ACTUEL: ${actualFrozenAfterCancel}Ⓐ`)
    
    if (Math.abs(actualFrozenAfterCancel - expectedFrozenAfterCancel) < 0.01) {
      console.log(`\n   ✅✅✅ SUCCÈS! Le bug est CORRIGÉ!`)
      console.log(`   Seul le montant de l'activation annulée a été dégelé.`)
    } else if (actualFrozenAfterCancel === 0) {
      console.log(`\n   ❌❌❌ ÉCHEC! Le bug N'EST PAS corrigé!`)
      console.log(`   TOUT le frozen_balance a été libéré au lieu de ${activation1.price}Ⓐ seulement!`)
    } else {
      console.log(`\n   ⚠️ Résultat inattendu - à vérifier`)
    }
  }
  
  // Nettoyer - annuler l'activation 2 aussi
  if (activation2) {
    console.log('\n\n🧹 Nettoyage: annulation de l\'activation 2...')
    await callEdgeFunction('cancel-sms-activate-order', {
      orderId: activation2.order_id,
      activationId: activation2.id,
      userId: USER_ID
    })
  }
}

// État final
await new Promise(r => setTimeout(r, 500))
const finalState = await getState()
printState('ÉTAT FINAL', finalState)

// Vérification santé
console.log('\n' + '='.repeat(70))
console.log('📊 VÉRIFICATION SANTÉ FINALE')
console.log('='.repeat(70))

const { data: health } = await supabase
  .from('v_frozen_balance_health')
  .select('*')
  .eq('user_id', USER_ID)

if (!health || health.length === 0) {
  console.log('\n✅ Santé: OK (aucune anomalie)')
} else if (health[0]?.health_status === 'OK') {
  console.log('\n✅ Santé: OK')
} else {
  console.log('\n⚠️ Anomalie:', health[0])
}

// Résumé
console.log('\n' + '='.repeat(70))
console.log('📋 RÉSUMÉ DES TESTS')
console.log('='.repeat(70))
console.log(`\n   Balance initiale: ${initialBalance}Ⓐ`)
console.log(`   Balance finale: ${finalState.user?.balance}Ⓐ`)
console.log(`   Frozen finale: ${finalState.user?.frozen_balance}Ⓐ`)

if (Math.abs((finalState.user?.balance || 0) - initialBalance) < 0.01 && 
    (finalState.user?.frozen_balance || 0) === 0) {
  console.log(`\n   ✅✅✅ TOUS LES TESTS PASSENT!`)
} else {
  console.log(`\n   ⚠️ Vérifier les résultats ci-dessus`)
}

console.log('\n' + '='.repeat(70))
