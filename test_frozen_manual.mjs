/**
 * 🧪 TEST MANUEL FROZEN BALANCE - Via Edge Functions
 * 
 * Ce script utilise les vraies Edge Functions pour tester le système.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Client authentifié
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🧪 TEST FROZEN BALANCE - Via Edge Functions')
console.log('='.repeat(70))

// Se connecter avec le compte test
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'buba6c@gmail.com',
  password: process.env.TEST_PASSWORD || 'votre_mot_de_passe'
})

if (authError) {
  console.log('⚠️ Impossible de se connecter automatiquement.')
  console.log('   Veuillez tester manuellement dans l\'application:')
  console.log('')
  console.log('   📋 PLAN DE TEST MANUEL:')
  console.log('   ========================')
  console.log('')
  console.log('   1️⃣ TEST ACHAT UNIQUE + ANNULATION:')
  console.log('      - Noter ton solde actuel')
  console.log('      - Acheter une activation (ex: WhatsApp USA)')
  console.log('      - Vérifier: frozen_balance augmente du prix')
  console.log('      - Annuler l\'activation')
  console.log('      - Vérifier: frozen_balance revient à 0')
  console.log('')
  console.log('   2️⃣ TEST CRITIQUE - ACHATS MULTIPLES:')
  console.log('      - Acheter activation 1 (ex: WhatsApp 50Ⓐ)')
  console.log('      - Acheter activation 2 (ex: Telegram 30Ⓐ)')
  console.log('      - Vérifier: frozen_balance = 80Ⓐ')
  console.log('      - Annuler SEULEMENT activation 1')
  console.log('      - ⚠️ VÉRIFIER: frozen_balance = 30Ⓐ (PAS 0!)')
  console.log('      - Si frozen_balance = 0, le bug n\'est pas corrigé!')
  console.log('')
  console.log('   3️⃣ TEST EXPIRATION:')
  console.log('      - Acheter une activation')
  console.log('      - Attendre 20 minutes sans utiliser le code')
  console.log('      - Vérifier: activation marquée expirée')
  console.log('      - Vérifier: frozen_balance revient à 0')
  console.log('')
  console.log('   📊 VÉRIFICATION SQL (dans Supabase):')
  console.log('      SELECT * FROM v_frozen_balance_health;')
  console.log('')
  process.exit(0)
}

const user = authData.user
const session = authData.session

console.log(`\n✅ Connecté en tant que: ${user.email}`)
console.log(`   User ID: ${user.id}`)

// Fonction pour appeler les Edge Functions
async function callFunction(name, body) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify(body)
  })
  return response.json()
}

// Récupérer l'état actuel
async function getState() {
  const { data: profile } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', user.id)
    .single()
  
  const { data: activations } = await supabase
    .from('activations')
    .select('id, order_id, status, price, frozen_amount, phone')
    .eq('user_id', user.id)
    .in('status', ['pending', 'waiting'])
    .order('created_at', { ascending: false })
  
  return { profile, activations: activations || [] }
}

function printState(label, state) {
  console.log(`\n📊 ${label}:`)
  console.log(`   Balance: ${state.profile?.balance || 0}Ⓐ`)
  console.log(`   Frozen: ${state.profile?.frozen_balance || 0}Ⓐ`)
  console.log(`   Disponible: ${(state.profile?.balance || 0) - (state.profile?.frozen_balance || 0)}Ⓐ`)
  console.log(`   Activations pending: ${state.activations.length}`)
  state.activations.forEach(a => {
    console.log(`      - ${a.phone} (${a.price}Ⓐ) frozen_amount=${a.frozen_amount}`)
  })
}

// État initial
const initialState = await getState()
printState('État initial', initialState)

console.log('\n' + '='.repeat(70))
console.log('🧪 TEST: Achat d\'une activation')
console.log('='.repeat(70))

// Acheter une activation
const buyResult = await callFunction('buy-sms-activate-number', {
  country: 'id',      // Indonésie (pas cher)
  product: 'tg',      // Telegram
  userId: user.id
})

if (buyResult.success) {
  console.log(`\n✅ Activation achetée!`)
  console.log(`   Phone: ${buyResult.data.phone}`)
  console.log(`   Price: ${buyResult.data.price}Ⓐ`)
  console.log(`   Order ID: ${buyResult.data.order_id}`)
  
  const stateAfterBuy = await getState()
  printState('Après achat', stateAfterBuy)
  
  // Vérifier que frozen_amount est correct
  const newActivation = stateAfterBuy.activations.find(a => a.order_id === buyResult.data.order_id)
  if (newActivation && newActivation.frozen_amount === newActivation.price) {
    console.log(`\n✅ PASS: frozen_amount = price (${newActivation.frozen_amount})`)
  } else {
    console.log(`\n⚠️ CHECK: frozen_amount = ${newActivation?.frozen_amount}, price = ${newActivation?.price}`)
  }
  
  // Annuler
  console.log('\n' + '='.repeat(70))
  console.log('🧪 TEST: Annulation')
  console.log('='.repeat(70))
  
  const cancelResult = await callFunction('cancel-sms-activate-order', {
    orderId: buyResult.data.order_id,
    activationId: buyResult.data.id,
    userId: user.id
  })
  
  if (cancelResult.success) {
    console.log(`\n✅ Annulation réussie!`)
    
    const stateAfterCancel = await getState()
    printState('Après annulation', stateAfterCancel)
    
    if (stateAfterCancel.profile.frozen_balance === initialState.profile.frozen_balance) {
      console.log(`\n✅✅✅ PASS: frozen_balance revenu à ${initialState.profile.frozen_balance}Ⓐ`)
    } else {
      console.log(`\n⚠️ frozen_balance = ${stateAfterCancel.profile.frozen_balance}, initial = ${initialState.profile.frozen_balance}`)
    }
  } else {
    console.log(`\n❌ Erreur annulation: ${cancelResult.error}`)
  }
  
} else {
  console.log(`\n❌ Erreur achat: ${buyResult.error}`)
  console.log('   Cela peut être normal si pas de numéros disponibles.')
}

// Résumé
console.log('\n' + '='.repeat(70))
console.log('📊 RÉSUMÉ')
console.log('='.repeat(70))

const finalState = await getState()
printState('État final', finalState)

// Vérification santé
const { data: health } = await supabase
  .from('v_frozen_balance_health')
  .select('*')
  .eq('user_id', user.id)

if (!health || health.length === 0 || health[0]?.health_status === 'OK') {
  console.log('\n✅ Santé frozen_balance: OK')
} else {
  console.log('\n⚠️ Anomalie détectée:', health[0])
}

console.log('\n' + '='.repeat(70))
