import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const activationId = '8ad31878-1176-4181-ad92-89e5d675378c'

console.log(`🔍 VÉRIFICATION SMS: ${activationId}\n`)

try {
  // 1. Informations de base de l'activation
  console.log('1️⃣ Détails de l\'activation...')
  
  const { data: activation, error: activationError } = await sb
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .single()

  if (activationError) {
    throw new Error(`Activation non trouvée: ${activationError.message}`)
  }

  console.log(`📱 ACTIVATION:`)
  console.log(`   ID: ${activation.id}`)
  console.log(`   Service: ${activation.service_code}`)
  console.log(`   Pays: ${activation.country_code}`)
  console.log(`   Téléphone: ${activation.phone}`)
  console.log(`   Prix: ${activation.price}Ⓐ`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   Order ID: ${activation.order_id}`)
  console.log(`   Provider: ${activation.provider}`)

  const created = new Date(activation.created_at)
  const expires = new Date(activation.expires_at)
  const updated = new Date(activation.updated_at)
  const now = new Date()

  console.log(`\n⏰ TIMELINE:`)
  console.log(`   Créée: ${created.toLocaleTimeString()}`)
  console.log(`   Expire: ${expires.toLocaleTimeString()}`)
  console.log(`   Dernière MAJ: ${updated.toLocaleTimeString()}`)
  console.log(`   Maintenant: ${now.toLocaleTimeString()}`)
  
  const age = Math.round((now - created) / 60000)
  const expired = now > expires
  console.log(`   Âge: ${age} minutes`)
  console.log(`   Expiré: ${expired ? 'OUI' : 'NON'}`)

  // 2. Vérifier les SMS reçus
  console.log(`\n📨 VÉRIFICATION SMS:`)
  
  if (activation.sms_code) {
    console.log(`   ✅ SMS REÇU!`)
    console.log(`   Code: ${activation.sms_code}`)
    console.log(`   Texte: ${activation.sms_text || 'Non disponible'}`)
    if (activation.sms_received_at) {
      const smsTime = new Date(activation.sms_received_at)
      const smsDelay = Math.round((smsTime - created) / 1000) // en secondes
      console.log(`   Reçu à: ${smsTime.toLocaleTimeString()}`)
      console.log(`   Délai: ${smsDelay} secondes après création`)
    }
  } else {
    console.log(`   ❌ Pas de SMS reçu`)
    console.log(`   sms_code: ${activation.sms_code || 'null'}`)
    console.log(`   sms_text: ${activation.sms_text || 'null'}`)
    console.log(`   sms_received_at: ${activation.sms_received_at || 'null'}`)
  }

  // 3. Balance operations
  console.log(`\n💰 BALANCE OPERATIONS:`)
  
  const { data: operations } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', activationId)
    .order('created_at', { ascending: true })

  if (operations && operations.length > 0) {
    operations.forEach((op, i) => {
      const opTime = new Date(op.created_at).toLocaleTimeString()
      console.log(`   ${i+1}. ${op.operation_type}: ${op.amount}Ⓐ (${opTime})`)
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}Ⓐ`)
      console.log(`      Frozen: ${op.frozen_before} → ${op.frozen_after}Ⓐ`)
    })
  } else {
    console.log(`   ❌ Aucune balance operation`)
  }

  // 4. Vérifier auprès de l'API SMS-Activate
  if (activation.order_id && activation.provider === 'sms-activate') {
    console.log(`\n🔎 VÉRIFICATION API SMS-ACTIVATE:`)
    console.log(`   Order ID: ${activation.order_id}`)
    
    try {
      const SMS_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY') || 'API_KEY_PLACEHOLDER'
      const apiUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getStatus&id=${activation.order_id}`
      
      console.log(`   🌐 Appel API: getStatus for ${activation.order_id}`)
      
      const response = await fetch(apiUrl)
      const apiResult = await response.text()
      
      console.log(`   📥 Réponse API: ${apiResult}`)
      
      if (apiResult.startsWith('STATUS_OK:')) {
        const code = apiResult.split(':')[1]
        console.log(`   ✅ SMS disponible sur API: ${code}`)
        
        if (activation.sms_code !== code) {
          console.log(`   ⚠️ Incohérence: DB=${activation.sms_code}, API=${code}`)
        }
      } else if (apiResult === 'STATUS_WAIT_CODE') {
        console.log(`   ⏳ API: En attente du SMS`)
      } else if (apiResult === 'STATUS_CANCEL') {
        console.log(`   ❌ API: Commande annulée`)
      } else {
        console.log(`   ❓ API: Statut inconnu`)
      }
      
    } catch (apiError) {
      console.log(`   ❌ Erreur API: ${apiError.message}`)
    }
  }

  // 5. Analyse finale
  console.log(`\n🎯 ANALYSE:`)
  
  const hasFreeze = operations?.some(op => op.operation_type === 'freeze')
  const hasCommit = operations?.some(op => op.operation_type === 'commit')
  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  if (activation.status === 'received' && activation.sms_code) {
    console.log(`   ✅ SUCCÈS COMPLET: SMS reçu et activation terminée`)
  } else if (activation.status === 'timeout' || activation.status === 'cancelled') {
    console.log(`   ⏰ EXPIRÉ/ANNULÉ: ${activation.status}`)
    if (hasRefund) {
      console.log(`   ✅ Refund effectué`)
    } else {
      console.log(`   ⚠️ Refund manquant - Timeout fantôme possible`)
    }
  } else if (activation.status === 'pending' || activation.status === 'waiting') {
    console.log(`   ⏳ EN COURS: ${activation.status}`)
    if (expired) {
      console.log(`   🚨 Expiré mais pas encore traité par le cron`)
    }
  } else {
    console.log(`   🤔 Status inhabituel: ${activation.status}`)
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}