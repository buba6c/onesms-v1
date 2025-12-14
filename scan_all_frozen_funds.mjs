import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🔍 SCAN: Tous les utilisateurs avec fonds gelés             ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// 1. Tous les utilisateurs avec frozen_balance > 0
const { data: users } = await sb
  .from('users')
  .select('*')
  .gt('frozen_balance', 0)
  .order('frozen_balance', { ascending: false })

console.log(`👥 UTILISATEURS AVEC FONDS GELÉS: ${users?.length || 0}\n`)

const affectedUsers = []

for (const user of users || []) {
  // Chercher activations timeout/cancelled avec freeze sans refund
  const { data: activations } = await sb
    .from('activations')
    .select('id, service_code, status, frozen_amount, price, created_at')
    .eq('user_id', user.id)
    .in('status', ['timeout', 'cancelled', 'expired'])
  
  let frozenCount = 0
  let frozenAmount = 0
  
  for (const act of activations || []) {
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
      frozenCount++
      frozenAmount += freeze.amount
    }
  }
  
  if (frozenCount > 0) {
    affectedUsers.push({
      email: user.email,
      id: user.id,
      balance: user.balance,
      frozen: user.frozen_balance,
      frozenCount,
      frozenAmount
    })
    
    console.log(`📧 ${user.email}`)
    console.log(`   Balance: ${user.balance}Ⓐ | Frozen: ${user.frozen_balance}Ⓐ`)
    console.log(`   ❌ ${frozenCount} activations sans refund (${frozenAmount}Ⓐ gelés)\n`)
  }
}

console.log('═══════════════════════════════════════════════════════════════')
console.log('\n📊 RÉSUMÉ:\n')

const totalAffected = affectedUsers.length
const totalActivations = affectedUsers.reduce((sum, u) => sum + u.frozenCount, 0)
const totalFrozen = affectedUsers.reduce((sum, u) => sum + u.frozenAmount, 0)

console.log(`👥 Utilisateurs affectés: ${totalAffected}`)
console.log(`📱 Activations sans refund: ${totalActivations}`)
console.log(`💰 Total gelé à tort: ${totalFrozen}Ⓐ\n`)

console.log('🎯 ACTION:')
console.log('   Créer un script de cleanup global pour tous les utilisateurs\n')

console.log('═══════════════════════════════════════════════════════════════')
