import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDY1OTAwMiwiZXhwIjoyMDQ2MjM1MDAyfQ.s2rYzgLa1FIlPBxp2P0rJGHmYIvlhUTw7vCFoFhqGjc'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

console.log('🔍 Vérification rental 30658643\n')

const { data, error } = await supabase
  .from('rentals')
  .select('*')
  .or('rent_id.eq.30658643,rental_id.eq.30658643')
  .single()

if (error) {
  console.error('❌ Erreur:', error.message)
} else if (data) {
  console.log('✅ Rental trouvé:')
  console.log('- ID:', data.id)
  console.log('- rent_id:', data.rent_id)
  console.log('- rental_id:', data.rental_id)
  console.log('- user_id:', data.user_id)
  console.log('- status:', data.status)
  console.log('- frozen_amount:', data.frozen_amount)
  console.log('- phone:', data.phone)
  console.log('- created_at:', data.created_at)
  console.log('- updated_at:', data.updated_at)
} else {
  console.log('⚠️ Rental non trouvé')
}
