import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.JRITMgYb5R0lnBKGt1DVLtxiQl7jJxI8FZ_GZEWRyVA'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🧪 TEST DIRECT: Problème 999 et activations\n')
console.log('='.repeat(60))

async function deepTest() {
  // 1. Vérifier la structure de la table activations
  console.log('\n1️⃣  Structure table activations:\n')
  
  const { error: schemaError } = await supabase
    .from('activations')
    .select('*')
    .limit(0)
  
  if (schemaError) {
    console.error('❌ Erreur schéma:', schemaError)
  } else {
    console.log('✅ Table activations accessible')
  }
  
  // 2. Essayer d'insérer une activation de test
  console.log('\n2️⃣  Test d\'insertion directe:\n')
  
  const testActivation = {
    user_id: 'ea4eb96d-5ab1-48ee-aec0-a0f2cb09c388', // admin@onesms.test
    order_id: 'test_' + Date.now(),
    phone: '+62123456789',
    service_code: 'google',
    country_code: 'indonesia',
    operator: 'any',
    price: 13.92,
    status: 'pending',
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    provider: 'sms-activate'
  }
  
  console.log('Données:', testActivation)
  
  const { data: inserted, error: insertError } = await supabase
    .from('activations')
    .insert(testActivation)
    .select()
    .single()
  
  if (insertError) {
    console.error('\n❌ ÉCHEC insertion:', insertError.message)
    console.error('   Code:', insertError.code)
    console.error('   Details:', insertError.details)
    console.error('   Hint:', insertError.hint)
  } else {
    console.log('\n✅ Activation insérée:', inserted.id)
    
    // Suppression du test
    await supabase
      .from('activations')
      .delete()
      .eq('id', inserted.id)
    
    console.log('✅ Test supprimé')
  }
  
  // 3. Vérifier les colonnes manquantes
  console.log('\n\n3️⃣  Colonnes de la table activations:\n')
  
  const { data: sample } = await supabase
    .from('activations')
    .select('*')
    .limit(1)
  
  if (sample && sample.length > 0) {
    console.log('Colonnes disponibles:')
    Object.keys(sample[0]).forEach((col, i) => {
      console.log(`   ${i + 1}. ${col}`)
    })
  }
  
  // 4. Vérifier le problème du "999"
  console.log('\n\n4️⃣  Problème "999 numéros":\n')
  
  // Vérifier le code frontend qui affiche "999"
  console.log('Le "999" vient probablement de:')
  console.log('   - Services hardcodés avec count: 999')
  console.log('   - Fallback quand l\'API échoue')
  console.log('   - Placeholder dans HomePage.tsx')
  
  // Vérifier les services avec total_available
  const { data: topServices } = await supabase
    .from('services')
    .select('code, name, total_available')
    .eq('active', true)
    .order('total_available', { ascending: false })
    .limit(5)
  
  console.log('\nTop 5 services (DB):')
  topServices?.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name}: ${s.total_available}`)
  })
  
  // 5. Vérifier si pricing_rules est utilisé correctement
  console.log('\n\n5️⃣  Utilisation des pricing_rules:\n')
  
  const { data: pricingCheck } = await supabase
    .from('pricing_rules')
    .select('service_code, country_code, activation_price, available_count')
    .eq('country_code', 'indonesia')
    .eq('active', true)
    .gt('available_count', 0)
    .limit(3)
  
  console.log('Pricing rules Indonesia (3 premiers):')
  pricingCheck?.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.service_code}: ${r.activation_price} FCFA (${r.available_count} dispos)`)
  })
  
  // 6. Vérifier le flow d'activation complet
  console.log('\n\n6️⃣  DIAGNOSTIC FLOW ACTIVATION:\n')
  
  console.log('Frontend → Backend:')
  console.log('   1. User clique service → appelle handleServiceSelect()')
  console.log('   2. User sélectionne pays → appelle handleCountrySelect()')
  console.log('   3. User clique Activate → appelle handleActivate()')
  console.log('   4. handleActivate() appelle buy-sms-activate-number')
  console.log('   5. buy-sms-activate-number insère dans activations')
  console.log('')
  console.log('❓ Problème possible:')
  console.log('   - handleActivate() échoue silencieusement ?')
  console.log('   - buy-sms-activate-number ne reçoit jamais la requête ?')
  console.log('   - Erreur CORS ou authentification ?')
  console.log('   - Insertion DB échoue à cause d\'une contrainte ?')
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Diagnostic terminé')
}

deepTest().catch(console.error)
