import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🧪 TEST: Création activation manuelle + Synchronisation\n')

async function testManualActivation() {
  // 1. Créer une activation de test
  console.log('1️⃣  Création activation test...\n')
  
  const testActivation = {
    user_id: 'ea4eb96d-5ab1-48ee-aec0-a0f2cb09c388', // admin@onesms.test
    order_id: '123456789',
    phone: '+6289518249636',
    service_code: 'whatsapp',
    country_code: 'indonesia',
    operator: 'any',
    price: 15.5,
    status: 'pending',
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    provider: 'sms-activate',
    sms_code: null,
    sms_text: null
  }
  
  console.log('Données:', testActivation)
  
  const { data: created, error: createError } = await supabase
    .from('activations')
    .insert(testActivation)
    .select()
    .single()
  
  if (createError) {
    console.error('\n❌ ÉCHEC création:', createError.message)
    console.error('   Code:', createError.code)
    console.error('   Details:', createError.details)
    console.error('   Hint:', createError.hint)
    
    console.log('\n🔍 Analyse de l\'erreur:')
    
    if (createError.code === '42501') {
      console.log('   → Problème RLS (Row Level Security)')
      console.log('   → Les policies bloquent l\'insertion')
    } else if (createError.code === '23503') {
      console.log('   → Foreign key violation')
      console.log('   → user_id ou autre référence invalide')
    } else if (createError.code === '23505') {
      console.log('   → Duplicate key')
      console.log('   → order_id déjà existant')
    }
    
    return null
  }
  
  console.log('\n✅ Activation créée:', created.id)
  
  // 2. Simuler réception SMS
  console.log('\n\n2️⃣  Simulation réception SMS...\n')
  
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const { error: updateError } = await supabase
    .from('activations')
    .update({
      status: 'received',
      sms_code: '358042',
      sms_text: 'Your WhatsApp code is 358042',
      updated_at: new Date().toISOString()
    })
    .eq('id', created.id)
  
  if (updateError) {
    console.error('❌ Échec update:', updateError.message)
  } else {
    console.log('✅ SMS ajouté (code: 358042)')
    console.log('   WebSocket devrait notifier le frontend...')
  }
  
  // 3. Vérifier que l'activation est visible
  console.log('\n\n3️⃣  Vérification visibilité...\n')
  
  const { data: visible, error: readError } = await supabase
    .from('activations')
    .select('*')
    .eq('id', created.id)
    .single()
  
  if (readError) {
    console.error('❌ Impossible de lire:', readError.message)
  } else {
    console.log('✅ Activation visible:')
    console.log(`   ID: ${visible.id}`)
    console.log(`   Phone: ${visible.phone}`)
    console.log(`   Status: ${visible.status}`)
    console.log(`   SMS: ${visible.sms_code}`)
  }
  
  // 4. Tester la requête du frontend
  console.log('\n\n4️⃣  Test requête frontend...\n')
  
  const { data: frontendView, error: frontendError } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', testActivation.user_id)
    .in('status', ['pending', 'waiting', 'received'])
    .order('created_at', { ascending: false })
  
  if (frontendError) {
    console.error('❌ Erreur frontend query:', frontendError.message)
  } else {
    console.log(`✅ Frontend verrait ${frontendView?.length || 0} activation(s)`)
    if (frontendView && frontendView.length > 0) {
      frontendView.forEach((a, i) => {
        console.log(`\n   ${i + 1}. ${a.phone} - ${a.status}`)
        console.log(`      SMS: ${a.sms_code || 'NULL'}`)
      })
    }
  }
  
  // 5. Nettoyer
  console.log('\n\n5️⃣  Nettoyage...\n')
  
  const { error: deleteError } = await supabase
    .from('activations')
    .delete()
    .eq('id', created.id)
  
  if (deleteError) {
    console.error('❌ Échec suppression:', deleteError.message)
  } else {
    console.log('✅ Test activation supprimée')
  }
  
  return created.id
}

testManualActivation().catch(console.error)
