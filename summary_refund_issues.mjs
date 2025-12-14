import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  📊 RÉSUMÉ COMPLET: Problèmes de refund                      ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

console.log('👤 USER:', user.email)
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

// 1. Activations expirées sans refund (anciennes)
const { data: expiredNoRefund } = await sb
  .from('activations')
  .select('id, service_code, status, frozen_amount, price, created_at')
  .eq('user_id', user.id)
  .in('status', ['timeout', 'cancelled', 'expired'])
  .order('created_at', { ascending: false })

let oldFrozenCount = 0
let oldFrozenAmount = 0

for (const act of expiredNoRefund || []) {
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
  
  if (freeze && !refund) {
    oldFrozenCount++
    oldFrozenAmount += freeze.amount
  }
}

console.log(`❌ PROBLÈME 1: Activations expirées sans refund`)
console.log(`   Count: ${oldFrozenCount}`)
console.log(`   Montant: ${oldFrozenAmount}Ⓐ gelés`)
console.log(`   Cause: Cron ancien ne callait pas atomic_refund`)
console.log(`   Fix: ✅ Déployé (cron avec p_amount)`)
console.log(`   Action: Cleanup manuel nécessaire\n`)

// 2. Activations pending qui vont expirer
const { data: pending } = await sb
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['pending', 'waiting'])
  .order('expires_at', { ascending: true })

const now = new Date()
const willExpire = pending?.filter(p => new Date(p.expires_at) < new Date(now.getTime() + 20 * 60000)) || []

console.log(`⏰ PROBLÈME 2: Activations qui vont expirer bientôt`)
console.log(`   Count: ${willExpire.length}`)
console.log(`   Montant: ${willExpire.reduce((sum, p) => sum + p.frozen_amount, 0)}Ⓐ`)
console.log(`   Cause: Attente de SMS`)
console.log(`   Fix: ✅ Cron va les refund automatiquement`)
console.log(`   Action: Attendre le prochain cycle du cron (2 min)\n`)

// 3. Résumé des fixes
console.log('═══════════════════════════════════════════════════════════════')
console.log('\n✅ FIXES DÉPLOYÉS:\n')
console.log('1. ✅ cron-check-pending-sms: Ajoute p_amount à atomic_refund')
console.log('   → Les timeouts futurs seront remboursés automatiquement\n')

console.log('2. ✅ atomic_refund_direct: status="failed" au lieu de "refunded"')
console.log('   → Les NO_NUMBERS ne gèlent plus les fonds\n')

console.log('═══════════════════════════════════════════════════════════════')
console.log('\n⏳ ACTIONS NÉCESSAIRES:\n')

if (oldFrozenCount > 0) {
  console.log(`1. 🧹 CLEANUP MANUEL: ${oldFrozenCount} activations (${oldFrozenAmount}Ⓐ)`)
  console.log('   Commande: node fix_kawdpc_refund.mjs\n')
}

console.log('2. 🧪 TEST NO_NUMBERS:')
console.log('   - Acheter une activation avec un pays sans numéro')
console.log('   - Vérifier que frozen_balance ne change pas')
console.log('   - Vérifier balance_operations: freeze + refund\n')

console.log('3. ⏰ TEST TIMEOUT:')
console.log(`   - Attendre ${Math.ceil((new Date(willExpire[0]?.expires_at) - now) / 60000)} min`)
console.log('   - Vérifier que le cron refund automatiquement')
console.log('   - frozen_balance devrait diminuer de', willExpire[0]?.frozen_amount, 'Ⓐ\n')

console.log('═══════════════════════════════════════════════════════════════')
