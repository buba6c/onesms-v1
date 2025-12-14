import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('🚀 CRÉATION: Test activation qui expire dans 3 minutes\n')

const now = new Date()
const expiresIn3Min = new Date(now.getTime() + 3 * 60 * 1000) // +3 minutes

// Utiliser une activation existante comme template
const { data: template } = await sb
  .from('activations')
  .select('*')
  .limit(1)
  .single()

if (!template) {
  console.error('❌ Pas de template trouvé')
  process.exit(1)
}

const activationData = {
  ...template,
  id: crypto.randomUUID(),
  user_id: userId,
  phone: '33' + Math.floor(Math.random() * 1000000000),
  order_id: Math.floor(Math.random() * 10000000).toString(),
  service_code: 'test3min',
  price: 7,
  frozen_amount: 7,
  status: 'pending',
  expires_at: expiresIn3Min.toISOString(),
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
  charged: false,
  sms_text: null,
  sms_code: null,
  cancelled_at: null
}

console.log('📱 NOUVELLE ACTIVATION TEST:')
console.log(`   ID: ${activationData.id}`)
console.log(`   Service: ${activationData.service_code}`)
console.log(`   Prix: ${activationData.price}Ⓐ`)
console.log(`   Maintenant: ${now.toLocaleTimeString()}`)
console.log(`   Expire à: ${expiresIn3Min.toLocaleTimeString()} (dans 3 minutes)`)

// 1. Créer l'activation
const { error: activationError } = await sb
  .from('activations')
  .insert([activationData])

if (activationError) {
  console.error('❌ Erreur création:', activationError)
  process.exit(1)
}

console.log('✅ Activation créée!')

// 2. Créer freeze operation
const freezeOp = {
  user_id: userId,
  activation_id: activationData.id,
  operation_type: 'freeze',
  amount: 7,
  balance_before: 55,
  balance_after: 55,
  frozen_before: 20, // État actuel
  frozen_after: 27,  // +7Ⓐ
  reason: 'Test 3min activation freeze',
  created_at: now.toISOString()
}

const { error: freezeError } = await sb
  .from('balance_operations')
  .insert([freezeOp])

if (freezeError) {
  console.error('❌ Erreur freeze:', freezeError)
} else {
  console.log('✅ Balance operation créée!')
}

// 3. Update user frozen_balance
const { error: userError } = await sb
  .from('users')
  .update({ frozen_balance: 27 }) // 20 + 7
  .eq('id', userId)

if (!userError) {
  console.log('✅ User frozen_balance: 20 → 27Ⓐ')
}

// 4. État final
const { data: finalUser } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('\n📊 ÉTAT UTILISATEUR:')
console.log(`   Balance: ${finalUser.balance}Ⓐ`)
console.log(`   Frozen: ${finalUser.frozen_balance}Ⓐ`)
console.log(`   Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ`)

console.log('\n⏰ TIMELINE DE TEST:')
console.log(`   🟢 Créé: ${now.toLocaleTimeString()}`)
console.log(`   🔴 Expire: ${expiresIn3Min.toLocaleTimeString()}`)
console.log('   📡 Cron: Toutes les 2 minutes (prochain cycle dans max 2 min)')
console.log('   🎯 Test: Dans ~4 minutes maximum')

console.log('\n🕐 ATTENTE AUTOMATIQUE...')
console.log('   Je vais attendre 4 minutes puis vérifier automatiquement')

// Attendre 4 minutes puis vérifier
setTimeout(async () => {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 VÉRIFICATION AUTOMATIQUE (après 4 minutes)')
  console.log('='.repeat(60))
  
  try {
    // Vérifier l'activation
    const { data: finalAct } = await sb
      .from('activations')
      .select('status, frozen_amount, updated_at')
      .eq('id', activationData.id)
      .single()

    // Vérifier balance operations
    const { data: ops } = await sb
      .from('balance_operations')
      .select('operation_type, amount, created_at')
      .eq('activation_id', activationData.id)
      .order('created_at')

    // Vérifier user
    const { data: finalUserCheck } = await sb
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    console.log('📱 ACTIVATION FINALE:')
    console.log(`   Status: ${finalAct?.status}`)
    console.log(`   frozen_amount: ${finalAct?.frozen_amount}Ⓐ`)
    console.log(`   Updated: ${finalAct?.updated_at ? new Date(finalAct.updated_at).toLocaleTimeString() : 'N/A'}`)

    console.log('\n💰 BALANCE OPERATIONS:')
    ops?.forEach(op => {
      const time = new Date(op.created_at).toLocaleTimeString()
      console.log(`   [${time}] ${op.operation_type.toUpperCase()} | ${op.amount}Ⓐ`)
    })

    console.log('\n👤 USER FINAL:')
    console.log(`   Balance: ${finalUserCheck?.balance}Ⓐ`)
    console.log(`   Frozen: ${finalUserCheck?.frozen_balance}Ⓐ (était 27Ⓐ)`)

    const hasFreeze = ops?.some(o => o.operation_type === 'freeze')
    const hasRefund = ops?.some(o => o.operation_type === 'refund')
    const frozenReduced = (finalUserCheck?.frozen_balance || 0) < 27

    console.log('\n🎯 RÉSULTAT FINAL:')
    if (finalAct?.status === 'timeout' && finalAct?.frozen_amount === 0 && hasRefund && frozenReduced) {
      console.log('   🎉 SUCCÈS TOTAL! Auto-refund 100% fiable fonctionne!')
      console.log('   ✅ Status: timeout')
      console.log('   ✅ frozen_amount: 0Ⓐ') 
      console.log('   ✅ Balance operations: freeze + refund')
      console.log('   ✅ User frozen réduit de 7Ⓐ')
      console.log('\n🏆 LE CRON 100% FIABLE MARCHE PARFAITEMENT!')
    } else {
      console.log('   ⚠️ Résultat partiel:')
      console.log(`      Status timeout: ${finalAct?.status === 'timeout' ? '✅' : '❌'} (${finalAct?.status})`)
      console.log(`      frozen_amount=0: ${finalAct?.frozen_amount === 0 ? '✅' : '❌'} (${finalAct?.frozen_amount})`)
      console.log(`      Has refund: ${hasRefund ? '✅' : '❌'}`)
      console.log(`      Frozen reduced: ${frozenReduced ? '✅' : '❌'}`)
      
      if (!hasRefund && finalAct?.status === 'timeout') {
        console.log('\n🔧 DIAGNOSTIC: Timeout sans refund - cron bug persistant')
      } else if (finalAct?.status === 'pending') {
        console.log('\n⏳ DIAGNOSTIC: Pas encore expiré - attendre plus')
      }
    }

  } catch (error) {
    console.error('❌ Erreur vérification:', error)
  }
  
  console.log('\n📋 ACTIVATION ID POUR RÉFÉRENCE:')
  console.log(`   ${activationData.id}`)
  
}, 4 * 60 * 1000) // 4 minutes

console.log(`\n📋 ACTIVATION TEST ID: ${activationData.id}`)
console.log('⏳ Script en attente... Résultat dans 4 minutes')
console.log('💡 Gardez ce terminal ouvert!')