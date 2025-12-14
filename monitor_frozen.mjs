/**
 * 🔍 MONITORING FROZEN BALANCE EN TEMPS RÉEL
 * Lance ce script et fais tes tests dans l'interface
 * Le script affichera les changements automatiquement
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.VITE_SUPABASE_ANON_KEY
)

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

let lastState = null

async function getState() {
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single()
  
  const { data: activations } = await supabase
    .from('activations')
    .select('id, phone, price, frozen_amount, status, service_code, country_code')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'waiting'])
    .order('created_at', { ascending: false })
  
  return { 
    user, 
    activations: activations || [],
    timestamp: new Date().toISOString()
  }
}

function printState(state, changed = false) {
  const prefix = changed ? '🔄' : '📊'
  console.clear()
  console.log('═'.repeat(70))
  console.log(`${prefix} MONITORING FROZEN BALANCE - ${new Date().toLocaleTimeString()}`)
  console.log('═'.repeat(70))
  
  const balance = state.user?.balance || 0
  const frozen = state.user?.frozen_balance || 0
  const available = balance - frozen
  
  console.log(`\n💰 BALANCE: ${balance.toFixed(2)}Ⓐ`)
  console.log(`🔒 FROZEN:  ${frozen.toFixed(2)}Ⓐ`)
  console.log(`✅ DISPO:   ${available.toFixed(2)}Ⓐ`)
  
  console.log('\n' + '─'.repeat(70))
  console.log('📱 ACTIVATIONS ACTIVES (pending/waiting):')
  console.log('─'.repeat(70))
  
  if (state.activations.length === 0) {
    console.log('   (aucune)')
  } else {
    let totalFrozen = 0
    state.activations.forEach((a, i) => {
      totalFrozen += a.frozen_amount || 0
      console.log(`\n   ${i+1}. ${a.service_code.toUpperCase()} - ${a.country_code}`)
      console.log(`      📞 ${a.phone}`)
      console.log(`      💵 price: ${a.price}Ⓐ | frozen_amount: ${a.frozen_amount}Ⓐ`)
      console.log(`      📌 status: ${a.status}`)
    })
    
    console.log('\n' + '─'.repeat(70))
    console.log(`📊 COHÉRENCE:`)
    console.log(`   Somme frozen_amount: ${totalFrozen.toFixed(2)}Ⓐ`)
    console.log(`   frozen_balance user: ${frozen.toFixed(2)}Ⓐ`)
    
    const diff = Math.abs(totalFrozen - frozen)
    if (diff < 0.01) {
      console.log(`   ✅ COHÉRENT`)
    } else {
      console.log(`   ⚠️ DÉSYNCHRONISÉ (diff: ${diff.toFixed(2)}Ⓐ)`)
    }
  }
  
  console.log('\n' + '═'.repeat(70))
  console.log('🎯 INSTRUCTIONS DE TEST:')
  console.log('   1. Achète 2 activations (ex: Telegram 50Ⓐ, WhatsApp 30Ⓐ)')
  console.log('   2. Vérifie que frozen = 80Ⓐ')
  console.log('   3. Annule UNE SEULE activation')
  console.log('   4. Le frozen doit être 30Ⓐ (pas 0!)')
  console.log('═'.repeat(70))
  console.log('\n⏳ Mise à jour toutes les 2 secondes... (Ctrl+C pour arrêter)')
}

function hasChanged(oldState, newState) {
  if (!oldState) return false
  if (oldState.user?.balance !== newState.user?.balance) return true
  if (oldState.user?.frozen_balance !== newState.user?.frozen_balance) return true
  if (oldState.activations.length !== newState.activations.length) return true
  return false
}

// Boucle principale
console.log('🚀 Démarrage du monitoring...\n')

let previousState = null
while (true) {
  const state = await getState()
  const changed = hasChanged(previousState, state)
  printState(state, changed)
  previousState = state
  await new Promise(r => setTimeout(r, 2000))
}
