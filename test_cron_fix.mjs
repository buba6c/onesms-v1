import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🧪 TEST: Cron fix - Auto-refund après timeout               ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

const now = new Date()

// 1. Chercher activations qui vont expirer dans les 5 prochaines minutes
const { data: soonExpired } = await sb
  .from('activations')
  .select('*')
  .in('status', ['pending', 'waiting'])
  .lt('expires_at', new Date(now.getTime() + 5 * 60000).toISOString())
  .order('expires_at', { ascending: true })
  .limit(5)

console.log(`🔍 ACTIVATIONS QUI EXPIRENT BIENTÔT (< 5 min):\n`)

if (!soonExpired || soonExpired.length === 0) {
  console.log('   ✅ Aucune activation en cours d\'expiration\n')
} else {
  for (const act of soonExpired) {
    const expiresAt = new Date(act.expires_at)
    const minutesLeft = Math.round((expiresAt - now) / 60000)
    
    console.log(`📱 ${act.id.substring(0, 8)}... (${act.service_code})`)
    console.log(`   Status: ${act.status}`)
    console.log(`   Prix: ${act.price}Ⓐ | Frozen: ${act.frozen_amount}Ⓐ`)
    console.log(`   Expire dans: ${minutesLeft} minutes (${expiresAt.toLocaleTimeString()})`)
    
    // User info
    const { data: user } = await sb
      .from('users')
      .select('email, balance, frozen_balance')
      .eq('id', act.user_id)
      .single()
    
    if (user) {
      console.log(`   👤 ${user.email}`)
      console.log(`   💰 Balance: ${user.balance}Ⓐ | Frozen: ${user.frozen_balance}Ⓐ\n`)
    }
  }
}

// 2. Chercher activations récemment expirées (dernières 10 min) pour voir si refund a marché
const { data: recentExpired } = await sb
  .from('activations')
  .select('*')
  .eq('status', 'timeout')
  .gte('updated_at', new Date(now.getTime() - 10 * 60000).toISOString())
  .order('updated_at', { ascending: false })
  .limit(5)

console.log('═══════════════════════════════════════════════════════════════')
console.log('\n⏰ ACTIVATIONS TIMEOUT RÉCENTES (< 10 min):\n')

if (!recentExpired || recentExpired.length === 0) {
  console.log('   ℹ️  Aucun timeout récent\n')
} else {
  for (const act of recentExpired) {
    const timeoutAt = new Date(act.updated_at)
    const minutesAgo = Math.round((now - timeoutAt) / 60000)
    
    console.log(`📱 ${act.id.substring(0, 8)}... (${act.service_code})`)
    console.log(`   Prix: ${act.price}Ⓐ | frozen_amount: ${act.frozen_amount}Ⓐ`)
    console.log(`   Timeout il y a: ${minutesAgo} minutes`)
    
    // Vérifier le refund dans balance_operations
    const { data: ops } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', act.id)
      .order('created_at', { ascending: true })
    
    const freeze = ops?.find(o => o.operation_type === 'freeze')
    const refund = ops?.find(o => o.operation_type === 'refund')
    
    if (freeze && refund) {
      console.log(`   ✅ REFUND OK: ${refund.amount}Ⓐ (${new Date(refund.created_at).toLocaleTimeString()})`)
    } else if (freeze && !refund) {
      console.log(`   ❌ PAS DE REFUND! (freeze: ${freeze.amount}Ⓐ)`)
    }
    console.log()
  }
}

console.log('═══════════════════════════════════════════════════════════════')
console.log('\n📊 COMPORTEMENT ATTENDU:\n')
console.log('1️⃣  Cron tourne toutes les 2 minutes (*/2 * * * *)')
console.log('2️⃣  Détecte les activations expirées (expires_at < now)')
console.log('3️⃣  Lock avec: UPDATE ... SET status=\'timeout\' WHERE status IN (\'pending\',\'waiting\')')
console.log('4️⃣  Appelle atomic_refund (libère frozen_balance)')
console.log('5️⃣  Résultat: frozen_amount=0, balance_operations contient freeze+refund\n')

console.log('⏳ Prochaine exécution du cron: dans max 2 minutes')
console.log('🔄 Pour vérifier: Re-run ce script après 2-3 minutes\n')
