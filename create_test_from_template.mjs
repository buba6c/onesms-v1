import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

// Copier une activation existante pour avoir la bonne structure
const { data: existingActivations } = await sb
  .from('activations')
  .select('*')
  .limit(1)

if (existingActivations && existingActivations.length > 0) {
  const template = existingActivations[0]
  console.log('🔍 STRUCTURE ACTIVATION:')
  
  // Afficher tous les champs
  Object.keys(template).forEach(key => {
    console.log(`   ${key}: ${template[key]}`)
  })
}

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c@gmail.com

console.log('\n🧪 CRÉATION: Activation test basée sur template existant\n')

const now = new Date()
const expiresIn1Min = new Date(now.getTime() + 60 * 1000) // +1 minute

if (existingActivations && existingActivations.length > 0) {
  const template = existingActivations[0]
  
  // Créer une nouvelle activation basée sur le template
  const activationData = {
    ...template,
    id: crypto.randomUUID(),
    user_id: userId,
    phone: '33987654321',
    order_id: Math.floor(Math.random() * 1000000).toString(),
    price: 5,
    frozen_amount: 5,
    status: 'pending',
    expires_at: expiresIn1Min.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    charged: false,
    sms_text: null,
    sms_code: null,
    cancelled_at: null
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

  // 2. Créer l'opération freeze
  const freezeOp = {
    user_id: userId,
    activation_id: activationData.id,
    operation_type: 'freeze',
    amount: 5,
    balance_before: 55,
    balance_after: 55,
    frozen_before: 15,
    frozen_after: 20,
    reason: 'Test activation freeze',
    created_at: now.toISOString()
  }

  const { error: freezeError } = await sb
    .from('balance_operations')
    .insert([freezeOp])

  if (freezeError) {
    console.error('❌ Erreur freeze:', freezeError)
  } else {
    console.log('✅ Freeze créé!')
  }

  // 3. Mettre à jour user frozen_balance
  const { error: userError } = await sb
    .from('users')
    .update({ frozen_balance: 20 })
    .eq('id', userId)

  if (!userError) {
    console.log('✅ User frozen_balance: 15 → 20Ⓐ')
  }

  console.log('\n⏰ TIMELINE:')
  console.log(`   Maintenant: ${now.toLocaleTimeString()}`)
  console.log(`   Expiration: ${expiresIn1Min.toLocaleTimeString()}`)
  console.log('   Cron check: Dans 2 minutes max')
  console.log('   → Refund attendu automatiquement!')

  console.log(`\n📋 ACTIVATION ID: ${activationData.id}`)
  console.log('🚀 Surveillez dans 3 minutes!')
}