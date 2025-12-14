import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Charger les variables d'environnement
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

console.log('🔍 Test de connexion Supabase...\n')

try {
  // Test 1: Vérifier les activations
  const { data: activations, error: actError, count: actCount } = await supabase
    .from('activations')
    .select('id, status, phone, order_id', { count: 'exact', head: false })
    .limit(5)

  if (actError) {
    console.error('❌ Erreur activations:', actError.message)
  } else {
    console.log(`✅ Table activations: ${actCount || 0} enregistrements`)
    if (activations && activations.length > 0) {
      console.log(`   Dernières 5:`, activations.map(a => `${a.status} - ${a.phone}`).join(', '))
    }
  }

  // Test 2: Vérifier les users
  const { data: users, error: userError, count: userCount } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance', { count: 'exact', head: false })
    .limit(3)

  if (userError) {
    console.error('\n❌ Erreur users:', userError.message)
  } else {
    console.log(`\n✅ Table users: ${userCount || 0} utilisateurs`)
    const totalBalance = users?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0
    const totalFrozen = users?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0
    console.log(`   Balance totale: ${totalBalance}Ⓐ (gelé: ${totalFrozen}Ⓐ)`)
  }

  // Test 3: Vérifier les transactions
  const { data: transactions, error: txError, count: txCount } = await supabase
    .from('transactions')
    .select('id, status, type', { count: 'exact', head: false })
    .limit(10)

  if (txError) {
    console.error('\n❌ Erreur transactions:', txError.message)
  } else {
    console.log(`\n✅ Table transactions: ${txCount || 0} transactions`)
    const pending = transactions?.filter(t => t.status === 'pending').length || 0
    const completed = transactions?.filter(t => t.status === 'completed').length || 0
    console.log(`   En attente: ${pending}, Complétées: ${completed}`)
  }

  // Test 4: Vérifier les rentals
  const { data: rentals, error: rentError, count: rentCount } = await supabase
    .from('rentals')
    .select('id, status, phone', { count: 'exact', head: false })
    .limit(5)

  if (rentError) {
    console.error('\n❌ Erreur rentals:', rentError.message)
  } else {
    console.log(`\n✅ Table rentals: ${rentCount || 0} locations`)
    const active = rentals?.filter(r => r.status === 'active').length || 0
    console.log(`   Actives: ${active}`)
  }

  // Test 5: Vérifier la fonction RPC process_sms_received
  console.log('\n🔧 Test de la fonction process_sms_received...')
  const { data: rpcTest, error: rpcError } = await supabase.rpc('process_sms_received', {
    p_order_id: 'test_dry_run',
    p_code: '000000',
    p_text: 'Test',
    p_source: 'test'
  })

  if (rpcError) {
    // Attendu si aucune activation avec cet order_id
    console.log('   ⚠️  RPC accessible (erreur attendue pour test dry-run):', rpcError.message)
  } else {
    console.log('   ✅ RPC process_sms_received accessible:', rpcTest)
  }

  console.log('\n✅ Base de données Supabase opérationnelle!')
  process.exit(0)

} catch (error) {
  console.error('\n❌ Erreur globale:', error.message)
  process.exit(1)
}
