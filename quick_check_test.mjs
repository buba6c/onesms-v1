import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const testId = '7628e7cc-43ae-49aa-97ca-01e966320d86'

console.log(`🔍 CHECK RAPIDE: ${testId.substring(0, 8)}...\n`)

const { data: act } = await sb
  .from('activations')
  .select('status, frozen_amount, expires_at, updated_at')
  .eq('id', testId)
  .single()

const { data: ops } = await sb
  .from('balance_operations')
  .select('operation_type, amount, created_at')
  .eq('activation_id', testId)

const { data: user } = await sb
  .from('users')
  .select('frozen_balance')
  .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
  .single()

const now = new Date()
const expires = new Date(act.expires_at)
const expired = now > expires
const minutesLeft = Math.round((expires - now) / 60000)

console.log(`🕐 Maintenant: ${now.toLocaleTimeString()}`)
console.log(`⏰ Expire: ${expires.toLocaleTimeString()} ${expired ? '(EXPIRÉ)' : `(dans ${minutesLeft}min)`}`)
console.log(`📱 Status: ${act.status}`)
console.log(`🔒 frozen_amount: ${act.frozen_amount}Ⓐ`)
console.log(`💰 User frozen: ${user.frozen_balance}Ⓐ`)
console.log(`📊 Balance ops: ${ops?.map(o => o.operation_type).join(', ')}`)

if (expired && act.status === 'pending') {
  console.log('\n⚠️  EXPIRÉ mais status=pending - Cron pas encore passé')
} else if (expired && act.status === 'timeout' && ops?.some(o => o.operation_type === 'refund')) {
  console.log('\n✅ PARFAIT! Auto-refund a marché!')
} else if (expired && act.status === 'timeout' && !ops?.some(o => o.operation_type === 'refund')) {
  console.log('\n❌ PROBLÈME: timeout sans refund')
}