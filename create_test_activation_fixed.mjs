import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('🧪 CRÉATION: Activation test qui expire dans 1 minute\n')

const now = new Date()
const expiresIn1Min = new Date(now.getTime() + 60 * 1000) // +1 minute

// Créer une activation fictive pour test avec tous les champs requis
const activationData = {
  id: crypto.randomUUID(),
  user_id: userId,
  service_code: 'fb',
  country_code: 'FR',
  operator: 'Orange',
  phone: '33123456789',
  order_id: Math.floor(Math.random() * 1000000).toString(),
  price: 5,
  frozen_amount: 5,
  status: 'pending',
  expires_at: expiresIn1Min.toISOString(),
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
  charged: false,
  platform: 'sms-activate'
}

console.log('📱 ACTIVATION À CRÉER:')
console.log(`   ID: ${activationData.id}`)
console.log(`   Service: ${activationData.service_code} (${activationData.operator})`)
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
  frozen_before: 15, 
  frozen_after: 20,  // +5 frozen
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

// 3. Mettre à jour le frozen_balance de l'utilisateur pour correspondre
const { error: userError } = await sb
  .from('users')
  .update({ frozen_balance: 20 }) // 15 + 5 = 20
  .eq('id', userId)

if (userError) {
  console.error('❌ Erreur mise à jour user:', userError)
} else {
  console.log('✅ User frozen_balance mis à jour!')
}

// 4. Vérifier l'état final
const { data: user } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('\n📊 ÉTAT UTILISATEUR:')
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ`)

console.log('\n⏰ TIMING:')
console.log(`   Créé à: ${now.toLocaleTimeString()}`)
console.log(`   Expire à: ${expiresIn1Min.toLocaleTimeString()} (dans 60s)`)
console.log('   Cron check: Toutes les 2 minutes')
console.log('   Auto-refund attendu: Dans 2-3 minutes max')

console.log('\n🔍 POUR VÉRIFIER DANS 3 MINUTES:')
console.log(`   node -e "
const sb = require('@supabase/supabase-js').createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);
(async()=>{
  const {data:a} = await sb.from('activations').select('status,frozen_amount').eq('id','${activationData.id}').single();
  const {data:ops} = await sb.from('balance_operations').select('operation_type,amount').eq('activation_id','${activationData.id}');
  const {data:u} = await sb.from('users').select('frozen_balance').eq('id','${userId}').single();
  console.log('Status:', a?.status, '| frozen_amount:', a?.frozen_amount);
  console.log('Ops:', ops?.map(o=>o.operation_type).join(','));
  console.log('User frozen:', u?.frozen_balance);
})()
"`)

console.log(`\n📋 ACTIVATION ID: ${activationData.id}`)
console.log('🚀 Test en cours! Le cron va traiter cette activation automatiquement.')