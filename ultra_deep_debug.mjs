import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac'
const SMS_ACTIVATE_API_KEY = 'd29edd5e1d04c3127d5253d5eAe70de8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 ═══════════════════════════════════════════════════════════════')
console.log('🔍 ULTRA DEEP DEBUG - Numéro 6289518249636')
console.log('🔍 ═══════════════════════════════════════════════════════════════\n')

async function ultraDeepDebug() {
  const phone = '6289518249636'
  
  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 1: TROUVER L'ACTIVATION DANS LA BASE DE DONNÉES
  // ═══════════════════════════════════════════════════════════════
  console.log('📊 ÉTAPE 1: RECHERCHE DANS LA BASE DE DONNÉES')
  console.log('─────────────────────────────────────────────────────────────\n')
  
  const { data: activations, error: dbError } = await supabase
    .from('activations')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)

  if (dbError) {
    console.error('❌ Erreur DB:', dbError)
    return
  }

  if (!activations || activations.length === 0) {
    console.error('❌ AUCUNE ACTIVATION TROUVÉE pour ce numéro!')
    console.log('   Vérifications à faire:')
    console.log('   1. Le numéro est-il correctement enregistré?')
    console.log('   2. Y a-t-il eu une erreur lors de l\'achat?')
    console.log('\n🔍 Recherche des activations récentes...\n')
    
    const { data: recentActs } = await supabase
      .from('activations')
      .select('id, phone, order_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('📋 5 dernières activations:')
    recentActs?.forEach((act, i) => {
      console.log(`   ${i+1}. ${act.phone} | Order: ${act.order_id} | Status: ${act.status}`)
    })
    return
  }

  const activation = activations[0]
  
  console.log('✅ ACTIVATION TROUVÉE!\n')
  console.log('   📱 Téléphone:', activation.phone)
  console.log('   🆔 ID Activation:', activation.id)
  console.log('   📦 Order ID:', activation.order_id)
  console.log('   🎯 Service:', activation.service_code)
  console.log('   📊 Status:', activation.status)
  console.log('   💰 Prix:', activation.price)
  console.log('   💳 Chargé:', activation.charged ? '✅ Oui' : '❌ Non')
  console.log('   📅 Créé:', new Date(activation.created_at).toLocaleString())
  console.log('   ⏰ Expire:', new Date(activation.expires_at).toLocaleString())
  console.log('')
  console.log('   📨 SMS CODE:', activation.sms_code || '❌ PAS DE CODE')
  console.log('   📝 SMS TEXT:', activation.sms_text || '❌ PAS DE TEXTE')
  console.log('')

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 2: VÉRIFIER SI L'ACTIVATION EST EXPIRÉE
  // ═══════════════════════════════════════════════════════════════
  const now = new Date()
  const expiresAt = new Date(activation.expires_at)
  const isExpired = now > expiresAt
  const timeLeft = Math.round((expiresAt - now) / 1000 / 60)
  
  console.log('⏰ VÉRIFICATION EXPIRATION')
  console.log('─────────────────────────────────────────────────────────────\n')
  console.log('   Maintenant:', now.toLocaleString())
  console.log('   Expire à:', expiresAt.toLocaleString())
  console.log('   Status:', isExpired ? '❌ EXPIRÉ!' : `✅ Actif (${timeLeft} min restantes)`)
  console.log('')

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 3: TESTER L'API SMS-ACTIVATE DIRECTEMENT
  // ═══════════════════════════════════════════════════════════════
  console.log('🌐 ÉTAPE 3: TEST API SMS-ACTIVATE')
  console.log('─────────────────────────────────────────────────────────────\n')
  
  const orderId = activation.order_id
  
  // TEST V2 API (JSON)
  console.log('   🔹 Test V2 API (JSON)...')
  const v2Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
  
  try {
    const v2Response = await fetch(v2Url)
    const v2Text = await v2Response.text()
    console.log('   📥 Réponse V2:', v2Text)
    
    try {
      const v2Json = JSON.parse(v2Text)
      console.log('   📊 V2 JSON:', JSON.stringify(v2Json, null, 2))
      
      if (v2Json.status === 'STATUS_OK' && v2Json.sms) {
        console.log('   ✅ SMS TROUVÉ VIA V2!')
        console.log('   📨 Code:', v2Json.sms)
        console.log('   📝 Texte:', v2Json.smsText || v2Json.full_sms || 'N/A')
      } else if (v2Json.status === 'STATUS_WAIT_CODE') {
        console.log('   ⏳ V2: En attente du SMS...')
      } else {
        console.log('   ⚠️  V2 Status:', v2Json.status)
      }
    } catch (e) {
      console.log('   ℹ️  Réponse V2 n\'est pas du JSON')
    }
  } catch (error) {
    console.error('   ❌ Erreur V2:', error.message)
  }
  
  console.log('')
  
  // TEST V1 API (Text)
  console.log('   🔹 Test V1 API (Text/Fallback)...')
  const v1Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
  
  try {
    const v1Response = await fetch(v1Url)
    const v1Text = await v1Response.text()
    console.log('   📥 Réponse V1:', v1Text)
    
    if (v1Text.startsWith('STATUS_OK:')) {
      const code = v1Text.split(':')[1]
      console.log('   ✅ SMS TROUVÉ VIA V1!')
      console.log('   📨 Code:', code)
    } else if (v1Text === 'STATUS_WAIT_CODE') {
      console.log('   ⏳ V1: En attente du SMS...')
    } else {
      console.log('   ⚠️  V1 Status:', v1Text)
    }
  } catch (error) {
    console.error('   ❌ Erreur V1:', error.message)
  }
  
  console.log('')
  
  // TEST HISTORY API
  console.log('   🔹 Test History API (24h)...')
  const historyUrl = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getFullSms&id=${orderId}`
  
  try {
    const historyResponse = await fetch(historyUrl)
    const historyText = await historyResponse.text()
    console.log('   📥 Réponse History:', historyText)
    
    try {
      const historyJson = JSON.parse(historyText)
      console.log('   📊 History JSON:', JSON.stringify(historyJson, null, 2))
      
      if (historyJson.sms && historyJson.sms.length > 0) {
        console.log('   ✅ SMS TROUVÉ VIA HISTORY!')
        historyJson.sms.forEach((msg, i) => {
          console.log(`   📨 SMS ${i+1}:`, msg.text || msg.message || msg.code)
          console.log(`      Date:`, new Date(msg.date * 1000).toLocaleString())
        })
      }
    } catch (e) {
      console.log('   ℹ️  Réponse History n\'est pas du JSON')
    }
  } catch (error) {
    console.error('   ❌ Erreur History:', error.message)
  }
  
  console.log('')

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 4: VÉRIFIER LES LOGS DE POLLING
  // ═══════════════════════════════════════════════════════════════
  console.log('🔄 ÉTAPE 4: ANALYSE DU POLLING AUTOMATIQUE')
  console.log('─────────────────────────────────────────────────────────────\n')
  
  console.log('   Status actuel:', activation.status)
  console.log('   Polling actif pour status:', ['pending', 'waiting'].includes(activation.status) ? '✅ OUI' : '❌ NON')
  
  if (!['pending', 'waiting'].includes(activation.status)) {
    console.log('   ⚠️  PROBLÈME: Le polling ne s\'exécute PAS pour ce status!')
    console.log('   💡 Le polling s\'active uniquement pour status: pending, waiting')
    console.log('   💡 Status actuel:', activation.status)
  }
  
  console.log('')

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 5: VÉRIFIER LA TRANSACTION
  // ═══════════════════════════════════════════════════════════════
  console.log('💳 ÉTAPE 5: VÉRIFICATION DE LA TRANSACTION')
  console.log('─────────────────────────────────────────────────────────────\n')
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('related_activation_id', activation.id)
    .order('created_at', { ascending: false })
  
  if (txError) {
    console.error('   ❌ Erreur transaction:', txError)
  } else if (!transactions || transactions.length === 0) {
    console.log('   ⚠️  Aucune transaction trouvée pour cette activation')
  } else {
    console.log(`   ✅ ${transactions.length} transaction(s) trouvée(s):\n`)
    transactions.forEach((tx, i) => {
      console.log(`   ${i+1}. ID: ${tx.id}`)
      console.log(`      Type: ${tx.type}`)
      console.log(`      Montant: ${tx.amount}`)
      console.log(`      Status: ${tx.status}`)
      console.log(`      Créé: ${new Date(tx.created_at).toLocaleString()}`)
      console.log('')
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // DIAGNOSTIC FINAL
  // ═══════════════════════════════════════════════════════════════
  console.log('🎯 ═══════════════════════════════════════════════════════════════')
  console.log('🎯 DIAGNOSTIC FINAL')
  console.log('🎯 ═══════════════════════════════════════════════════════════════\n')
  
  const problems = []
  const solutions = []
  
  // Problème 1: Pas de SMS
  if (!activation.sms_code) {
    problems.push('❌ Aucun SMS code dans la base de données')
    solutions.push('→ Vérifier si l\'API SMS-Activate a reçu le SMS')
    solutions.push('→ Forcer une vérification manuelle via update-activation-sms')
  }
  
  // Problème 2: Status incorrect
  if (!['pending', 'waiting'].includes(activation.status) && !activation.sms_code) {
    problems.push(`❌ Status "${activation.status}" bloque le polling automatique`)
    solutions.push(`→ Changer le status en "waiting" pour activer le polling`)
  }
  
  // Problème 3: Activation expirée
  if (isExpired) {
    problems.push('❌ Activation expirée')
    solutions.push('→ Annuler l\'activation et rembourser l\'utilisateur')
  }
  
  // Problème 4: Pas chargé
  if (!activation.charged && activation.sms_code) {
    problems.push('❌ SMS reçu mais utilisateur pas chargé')
    solutions.push('→ Mettre à jour charged=true et déduire le solde')
  }
  
  if (problems.length === 0) {
    console.log('✅ AUCUN PROBLÈME DÉTECTÉ')
    console.log('   Le système semble fonctionner correctement')
    if (activation.sms_code) {
      console.log('   📨 SMS Code:', activation.sms_code)
      console.log('   📝 SMS Text:', activation.sms_text)
    }
  } else {
    console.log('🔴 PROBLÈMES DÉTECTÉS:\n')
    problems.forEach((p, i) => console.log(`   ${i+1}. ${p}`))
    console.log('\n💡 SOLUTIONS PROPOSÉES:\n')
    solutions.forEach((s, i) => console.log(`   ${s}`))
  }
  
  console.log('')
  console.log('🎯 ═══════════════════════════════════════════════════════════════\n')
  
  return { activation, problems, solutions }
}

ultraDeepDebug().catch(console.error)
