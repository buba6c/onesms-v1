import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUserLogin() {
  console.log('🔐 Test de connexion pour buba6c@gmail.com...\n')

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'buba6c@gmail.com',
    password: 'Topmind225*' // Utiliser le vrai mot de passe
  })

  if (authError) {
    console.error('❌ Erreur de connexion:', authError.message)
    console.log('\n⚠️  Essai sans authentification...\n')
  } else {
    console.log('✅ Connecté:', authData.user.email)
    console.log('   User ID:', authData.user.id)
    console.log('')
  }

  // Get activations
  const { data: activations, error } = await supabase
    .from('activations')
    .select('id, phone, order_id, service_code, status, sms_code, sms_text, created_at')
    .eq('user_id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Erreur RLS:', error)
    return
  }

  console.log(`📊 ${activations.length} activation(s) trouvée(s):\n`)

  activations.forEach((act, i) => {
    console.log(`${i + 1}. Order: ${act.order_id}`)
    console.log(`   Phone: ${act.phone}`)
    console.log(`   Service: ${act.service_code}`)
    console.log(`   Status: ${act.status}`)
    console.log(`   sms_code: ${act.sms_code || 'N/A'}`)
    console.log(`   sms_text: ${act.sms_text || 'N/A'}`)
    console.log('')
  })

  // Check specific one
  const target = activations.find(a => a.order_id === '4450751126')
  if (target) {
    console.log('🎯 ACTIVATION CIBLE TROUVÉE!')
    console.log('   sms_text:', target.sms_text)
    console.log('   ✅ Cette activation devrait être visible sur la plateforme')
  } else {
    console.log('⚠️  Activation 4450751126 NON TROUVÉE dans les résultats')
    console.log('   Possible que le filtre status ne l\'inclue pas')
  }

  // Sign out
  await supabase.auth.signOut()
}

testUserLogin()
