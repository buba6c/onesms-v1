import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const testId = '7628e7cc-43ae-49aa-97ca-01e966320d86'
const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('🔧 DIAGNOSTIC: Pourquoi le atomic-timeout-processor ignore notre test?\n')

// 1. Vérifier l'état exact de l'activation
const { data: activation } = await sb
  .from('activations')
  .select('*')
  .eq('id', testId)
  .single()

console.log('📱 ACTIVATION STATE:')
console.log(`   ID: ${activation.id}`)
console.log(`   Status: ${activation.status}`)
console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)
console.log(`   expires_at: ${activation.expires_at}`)
console.log(`   Maintenant: ${new Date().toISOString()}`)
console.log(`   Expiré: ${new Date(activation.expires_at) < new Date() ? 'OUI' : 'NON'}`)

// 2. Vérifier la query exacte utilisée par atomic-timeout-processor
const { data: matches, error } = await sb
  .from('activations')
  .select('id, user_id, price, frozen_amount, service_code, order_id, expires_at, status')
  .in('status', ['pending', 'waiting'])
  .lt('expires_at', new Date().toISOString())
  .gt('frozen_amount', 0)
  .order('expires_at', { ascending: true })
  .limit(50)

console.log('\n🎯 QUERY ATOMIC-TIMEOUT-PROCESSOR:')
console.log(`   Critères: status IN ['pending', 'waiting'], expires_at < NOW, frozen_amount > 0`)
console.log(`   Résultat: ${matches?.length || 0} activations trouvées`)

if (matches?.length > 0) {
  matches.forEach(act => {
    console.log(`     - ${act.id}: ${act.status}, ${act.frozen_amount}Ⓐ, expires ${act.expires_at}`)
  })
} else {
  console.log(`     ❌ AUCUNE activation trouvée!`)
}

// 3. Le problème: notre test est status='timeout' mais frozen_amount > 0!
console.log('\n🚨 PROBLÈME IDENTIFIÉ:')
console.log('   Notre test: status=timeout, frozen_amount=0')  
console.log('   Query cherche: status IN [pending, waiting]')
console.log('   ❌ Donc il ignore notre test déjà marqué timeout!')

console.log('\n💡 SOLUTION:')
console.log('   1. Soit remettre status=pending pour le test')
console.log('   2. Soit modifier atomic-timeout-processor pour gérer status=timeout avec frozen > 0')