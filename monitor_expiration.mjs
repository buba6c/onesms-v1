import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('⏰ MONITORING: Activations qui vont expirer bientôt\n')

const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

const now = new Date()

// Activations pending
const { data: pending } = await sb
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['pending', 'waiting'])
  .order('expires_at', { ascending: true })

console.log(`📱 ${pending?.length || 0} activations pending:\n`)

for (const act of pending || []) {
  const expiresAt = new Date(act.expires_at)
  const timeLeft = Math.floor((expiresAt - now) / 1000 / 60) // minutes
  const expired = timeLeft < 0
  
  console.log(`${act.id.slice(0, 8)} | ${act.service_code} | ${act.frozen_amount}Ⓐ`)
  console.log(`   expires_at: ${act.expires_at}`)
  console.log(`   ${expired ? '❌ DÉJÀ EXPIRÉ!' : `⏰ Expire dans ${timeLeft} min`}`)
  console.log('')
}

console.log('💡 PLAN DE TEST:')
console.log('1. Attendre que la plus proche expire (dans quelques minutes)')
console.log('2. Le cron tourne toutes les 2 min')
console.log('3. Vérifier si atomic_refund est appelé automatiquement')
console.log('4. Vérifier si frozen_balance diminue\n')

console.log('🔍 Pour vérifier après expiration:')
console.log('   node analyze_kawdpc_refund.mjs')
