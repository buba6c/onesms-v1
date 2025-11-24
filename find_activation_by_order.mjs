import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Recherche de l\'activation avec order_id 911052734\n')

// Récupérer l'activation par order_id
const { data: activation, error } = await supabase
  .from('activations')
  .select('*')
  .eq('order_id', '911052734')
  .single()

if (error) {
  console.error('❌ Erreur:', error.message)
  console.log('\n🔍 Recherche de toutes les activations récentes...')
  
  // Si pas trouvé, chercher les 10 dernières activations
  const { data: recent, error: recentError } = await supabase
    .from('activations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (recentError) {
    console.error('❌ Erreur:', recentError.message)
  } else {
    console.log('\n📋 Dernières activations:')
    recent.forEach(act => {
      console.log(`\n- ID: ${act.id}`)
      console.log(`  Order ID: ${act.order_id}`)
      console.log(`  Phone: ${act.phone}`)
      console.log(`  Status: ${act.status}`)
      console.log(`  Créé: ${act.created_at}`)
    })
  }
} else {
  console.log('✅ Activation trouvée:')
  console.log(JSON.stringify(activation, null, 2))
}
