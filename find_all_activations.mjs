import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getAllActivations() {
  console.log('🔍 Recherche de toutes les activations pour buba6c@gmail.com...\n')

  // Get user ID
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'buba6c@gmail.com')
    .limit(1)

  if (!users || users.length === 0) {
    console.log('❌ Utilisateur non trouvé')
    return
  }

  const userId = users[0].id
  console.log('✅ Utilisateur trouvé:', users[0].email, '(ID:', userId, ')\n')

  // Get all activations
  const { data: activations, error } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Erreur:', error)
    return
  }

  console.log(`📊 ${activations.length} activation(s) trouvée(s):\n`)

  activations.forEach((act, i) => {
    console.log(`${i + 1}. ID: ${act.id}`)
    console.log(`   Phone: ${act.phone}`)
    console.log(`   Order: ${act.order_id}`)
    console.log(`   Service: ${act.service}`)
    console.log(`   Status: ${act.status}`)
    console.log(`   sms_code: ${act.sms_code}`)
    console.log(`   sms_text: ${act.sms_text}`)
    console.log(`   Created: ${act.created_at}`)
    console.log('')
  })

  // Find the specific one
  const target = activations.find(a => a.phone === '6283187992499' || a.order_id === '4450751126')
  if (target) {
    console.log('🎯 Activation cible trouvée!')
    console.log('   sms_text actuel:', target.sms_text)
    
    if (target.sms_text === target.sms_code) {
      console.log('   ⚠️  Le texte n\'est pas formaté (juste le code)')
    } else if (target.sms_text && target.sms_text.includes('Votre code')) {
      console.log('   ✅ Le texte est bien formaté en français!')
    }
  }
}

getAllActivations()
