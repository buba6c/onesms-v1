import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
// Utiliser le SERVICE_ROLE_KEY pour bypasser RLS
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.ysKIyDfRNPkx2JCOuuTUaJOBYANE6_E35VYW6vLwOPk'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('🔍 Recherche TOUTES les activations (avec service_role)\n')

// Récupérer TOUTES les activations (bypass RLS)
const { data: allActivations, error } = await supabase
  .from('activations')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20)

if (error) {
  console.error('❌ Erreur:', error.message)
} else {
  console.log(`📋 ${allActivations.length} activations trouvées:\n`)
  allActivations.forEach(act => {
    console.log(`- ID: ${act.id}`)
    console.log(`  Order ID: ${act.order_id}`)
    console.log(`  Phone: ${act.phone}`)
    console.log(`  User ID: ${act.user_id}`)
    console.log(`  Status: ${act.status}`)
    console.log(`  SMS Code: ${act.sms_code || '(aucun)'}`)
    console.log(`  Chargé: ${act.charged}`)
    console.log(`  Créé: ${act.created_at}`)
    console.log()
  })
  
  // Chercher spécifiquement l'order 911052734
  const target = allActivations.find(a => a.order_id === '911052734')
  if (target) {
    console.log('✅ Order 911052734 TROUVÉ!')
    console.log(JSON.stringify(target, null, 2))
  } else {
    console.log('❌ Order 911052734 NON TROUVÉ')
  }
}
