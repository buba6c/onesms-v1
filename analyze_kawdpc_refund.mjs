import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('═══════════════════════════════════════════════════════')
console.log('🔍 ANALYSE: kawdpc@gmail.com - Remboursement Auto')
console.log('═══════════════════════════════════════════════════════\n')

// 1. Trouver l'utilisateur
const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

if (!user) {
  console.log('❌ Utilisateur introuvable')
  process.exit(1)
}

console.log('👤 USER:')
console.log(`   ID: ${user.id}`)
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

// 2. Activations expirées sans refund
const { data: activations } = await sb
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['timeout', 'cancelled', 'expired'])
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`📱 ACTIVATIONS EXPIRÉES: ${activations?.length || 0}\n`)

for (const act of activations || []) {
  const time = act.created_at.slice(11, 19)
  console.log(`[${time}] ${act.id.slice(0, 8)} | ${act.service_code} | ${act.status}`)
  console.log(`   frozen_amount: ${act.frozen_amount}Ⓐ`)
  console.log(`   price: ${act.price}Ⓐ`)
  console.log(`   expires_at: ${act.expires_at}`)
  
  // Chercher freeze et refund
  const { data: freeze } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', act.id)
    .eq('operation_type', 'freeze')
    .single()
  
  const { data: refund } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', act.id)
    .eq('operation_type', 'refund')
    .single()
  
  if (freeze) console.log(`   ✅ FREEZE trouvé: ${freeze.amount}Ⓐ`)
  else console.log('   ❌ PAS DE FREEZE')
  
  if (refund) console.log(`   ✅ REFUND trouvé: ${refund.amount}Ⓐ`)
  else console.log('   ❌ PAS DE REFUND')
  
  console.log('')
}

// 3. Activations PENDING (en cours)
const { data: pending } = await sb
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })

console.log(`\n⏳ ACTIVATIONS PENDING: ${pending?.length || 0}\n`)

for (const act of pending || []) {
  const time = act.created_at.slice(11, 19)
  const expiresAt = new Date(act.expires_at)
  const now = new Date()
  const isExpired = now > expiresAt
  
  console.log(`[${time}] ${act.id.slice(0, 8)} | ${act.service_code} | ${act.status}`)
  console.log(`   frozen_amount: ${act.frozen_amount}Ⓐ`)
  console.log(`   expires_at: ${act.expires_at}`)
  console.log(`   ${isExpired ? '❌ DÉJÀ EXPIRÉ!' : '✅ Pas encore expiré'}`)
  console.log('')
}

// 4. Balance_operations récentes
const { data: ops } = await sb
  .from('balance_operations')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`\n💰 DERNIÈRES OPERATIONS: ${ops?.length || 0}\n`)
for (const op of ops || []) {
  const time = op.created_at.slice(11, 19)
  console.log(`[${time}] ${op.operation_type} | ${op.amount}Ⓐ | frz: ${op.frozen_before}→${op.frozen_after}`)
}

console.log('\n═══════════════════════════════════════════════════════')
console.log('💡 DIAGNOSTIC:\n')

if (user.frozen_balance > 0) {
  console.log(`⚠️  ${user.frozen_balance}Ⓐ encore gelés`)
  console.log('   → Vérifier si le cron tourne')
  console.log('   → Vérifier si atomic_refund est appelé')
}

const expiredPending = pending?.filter(p => new Date() > new Date(p.expires_at)) || []
if (expiredPending.length > 0) {
  console.log(`\n❌ ${expiredPending.length} activation(s) PENDING mais EXPIRÉES!`)
  console.log('   → Le cron ne tourne PAS ou rate ces activations')
  console.log('   → Il faut les refund manuellement')
}
