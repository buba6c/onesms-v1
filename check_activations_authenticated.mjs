import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const USER_EMAIL = 'buba6c@gmail.com'
const USER_PASSWORD = 'Buba123!' // Remplacer par le vrai mot de passe

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔐 Authentification...\n')

// S'authentifier
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: USER_EMAIL,
  password: USER_PASSWORD
})

if (authError) {
  console.error('❌ Erreur auth:', authError.message)
  process.exit(1)
}

console.log('✅ Authentifié:', authData.user.email)
console.log('User ID:', authData.user.id)

console.log('\n🔍 Recherche des activations...\n')

// Maintenant chercher les activations
const { data: activations, error } = await supabase
  .from('activations')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('❌ Erreur:', error.message)
} else {
  console.log(`📋 ${activations.length} activations trouvées:\n`)
  activations.forEach(act => {
    console.log(`- ID: ${act.id}`)
    console.log(`  Order ID: ${act.order_id}`)
    console.log(`  Phone: ${act.phone}`)
    console.log(`  Status: ${act.status}`)
    console.log(`  SMS Code: ${act.sms_code || '(aucun)'}`)
    console.log(`  Chargé: ${act.charged}`)
    console.log(`  Créé: ${act.created_at}`)
    console.log()
  })
  
  // Chercher spécifiquement l'activation 892f7a03
  console.log('🔍 Recherche de 892f7a03-734a-455b-b269-e7dfafe44387...\n')
  const target = activations.find(a => a.id === '892f7a03-734a-455b-b269-e7dfafe44387')
  if (target) {
    console.log('✅ TROUVÉE!')
    console.log(JSON.stringify(target, null, 2))
  } else {
    console.log('❌ NON TROUVÉE dans les 10 dernières')
  }
}
