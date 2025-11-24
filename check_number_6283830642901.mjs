import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const USER_EMAIL = 'buba6c@gmail.com'
const TARGET_PHONE = '+6283830642901'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Recherche du numéro', TARGET_PHONE, '\n')

// Tenter de se connecter (si le mot de passe est correct)
console.log('🔐 Tentative d\'authentification...')
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: USER_EMAIL,
  password: 'temp123' // Remplacer si nécessaire
})

if (authError) {
  console.log('⚠️ Auth échouée (on continue sans auth):', authError.message)
} else {
  console.log('✅ Authentifié:', authData.user.email, '\n')
}

// Chercher par numéro de téléphone
console.log('📋 Recherche de l\'activation...')
const { data: activations, error } = await supabase
  .from('activations')
  .select('*')
  .eq('phone', TARGET_PHONE)

if (error) {
  console.error('❌ Erreur:', error.message)
  console.log('\n🔍 Recherche des dernières activations...')
  
  const { data: recent, error: recentError } = await supabase
    .from('activations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (!recentError && recent) {
    console.log(`\n📋 ${recent.length} dernières activations:`)
    recent.forEach((act, i) => {
      console.log(`\n${i + 1}. Phone: ${act.phone}`)
      console.log(`   Order ID: ${act.order_id}`)
      console.log(`   Status: ${act.status}`)
      console.log(`   SMS Code: ${act.sms_code || '(aucun)'}`)
      console.log(`   Chargé: ${act.charged}`)
      console.log(`   Créé: ${act.created_at}`)
    })
  }
} else if (!activations || activations.length === 0) {
  console.log('❌ Activation NON TROUVÉE')
  console.log('\n🔍 Recherche des dernières activations...')
  
  const { data: recent } = await supabase
    .from('activations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (recent) {
    console.log(`\n📋 ${recent.length} dernières activations:`)
    recent.forEach((act, i) => {
      console.log(`\n${i + 1}. Phone: ${act.phone}`)
      console.log(`   Order ID: ${act.order_id}`)
      console.log(`   Status: ${act.status}`)
      console.log(`   SMS Code: ${act.sms_code || '(aucun)'}`)
      console.log(`   Chargé: ${act.charged}`)
      console.log(`   Créé: ${act.created_at}`)
    })
  }
} else {
  const activation = activations[0]
  console.log('✅ ACTIVATION TROUVÉE!\n')
  console.log('ID:', activation.id)
  console.log('Order ID:', activation.order_id)
  console.log('Phone:', activation.phone)
  console.log('Service:', activation.service_code)
  console.log('Country:', activation.country_code)
  console.log('Status:', activation.status)
  console.log('SMS Code:', activation.sms_code || '(aucun)')
  console.log('SMS Text:', activation.sms_text || '(aucun)')
  console.log('Chargé:', activation.charged)
  console.log('Prix:', activation.price, 'Ⓐ')
  console.log('Expire:', activation.expires_at)
  console.log('Créé:', activation.created_at)
  
  // Si SMS reçu, afficher en grand
  if (activation.sms_code) {
    console.log('\n' + '='.repeat(50))
    console.log('💬 CODE SMS:', activation.sms_code)
    console.log('='.repeat(50))
  } else {
    console.log('\n⏳ En attente du SMS...')
    
    // Tester la récupération manuelle
    console.log('\n🔍 Vérification sur 5sim...')
    try {
      const checkResponse = await supabase.functions.invoke('check-5sim-sms', {
        body: {
          orderId: activation.order_id,
          userId: activation.user_id
        }
      })
      
      if (checkResponse.data) {
        console.log('📡 Réponse 5sim:', JSON.stringify(checkResponse.data, null, 2))
      }
      if (checkResponse.error) {
        console.error('❌ Erreur check:', checkResponse.error)
      }
    } catch (e) {
      console.error('❌ Exception:', e.message)
    }
  }
}
