import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('🧪 CRÉATION: Activation test qui expire dans 1 minute\n')

const now = new Date()
const expiresIn1Min = new Date(now.getTime() + 60 * 1000) // +1 minute

// Créer une activation fictive pour test
const activationData = {
  id: crypto.randomUUID(),
  user_id: userId,
  service_code: 'test',
  country_code: 'FR',
  phone: '33123456789',
  order_id: Math.floor(Math.random() * 1000000).toString(),
  price: 5,
  frozen_amount: 5,
  status: 'pending',
  expires_at: expiresIn1Min.toISOString(),
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
  charged: false
}

console.log('📱 ACTIVATION À CRÉER:')
console.log(`   ID: ${activationData.id}`)
console.log(`   Service: ${activationData.service_code}`)
console.log(`   Prix: ${activationData.price}Ⓐ`)
console.log(`   Expire à: ${expiresIn1Min.toLocaleTimeString()} (dans 1 min)`)

// 1. Créer l'activation
const { error: activationError } = await sb
  .from('activations')
  .insert([activationData])

if (activationError) {
  console.error('❌ Erreur création activation:', activationError)
  process.exit(1)
}

console.log('✅ Activation créée!')

// 2. Créer l'opération freeze correspondante
const freezeOp = {
  user_id: userId,
  activation_id: activationData.id,
  operation_type: 'freeze',
  amount: activationData.price,
  balance_before: 55,
  balance_after: 55,
  frozen_before: 10, // Assurons-nous d'avoir assez
  frozen_after: 15,
  reason: 'Test activation freeze',
  created_at: now.toISOString()
}

const { error: freezeError } = await sb
  .from('balance_operations')
  .insert([freezeOp])

if (freezeError) {
  console.error('❌ Erreur création freeze:', freezeError)
  // Supprimer l'activation créée
  await sb.from('activations').delete().eq('id', activationData.id)
  process.exit(1)
}

console.log('✅ Balance operation (freeze) créée!')

// 3. Vérifier l'état utilisateur
const { data: user } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('\n📊 ÉTAT UTILISATEUR:')
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ (devrait avoir +5Ⓐ frozen)`)

console.log('\n⏰ ATTENTE:')
console.log('   1️⃣  Activation expire dans 60 secondes')
console.log('   2️⃣  Cron tourne toutes les 2 minutes (*/2 * * * *)')
console.log('   3️⃣  Prochaine exécution: dans max 2 minutes')
console.log('   4️⃣  Le cron devrait détecter l\'expiration et refund automatiquement')

console.log('\n🔍 POUR VÉRIFIER:')
console.log('   Dans 3 minutes, vérifier que:')
console.log('   - Activation status = "timeout"')
console.log('   - frozen_amount = 0')
console.log('   - Balance operations contient freeze + refund')
console.log('   - User frozen_balance a diminué de 5Ⓐ')

console.log(`\n📋 ACTIVATION ID POUR SUIVI: ${activationData.id}`)