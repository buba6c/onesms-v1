import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2NTkwMDIsImV4cCI6MjA0NjIzNTAwMn0.6GN0fQCvGrEzm5f8W4k5YqR5bvqQJCQC5YnmBGg9Y4s'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🧪 Test appel set-rent-status pour rental 30658643')

// Simuler l'appel exact du frontend
const testCall = async () => {
  const { data, error } = await supabase.functions.invoke('set-rent-status', {
    body: {
      rentId: '30658643',
      action: 'finish',
      userId: 'f94df4f2-b6a8-4f8f-b0c3-e4a85de8d3e6' // Remplacer par le vrai user_id
    }
  })

  console.log('\n📥 Response:')
  console.log('- data:', JSON.stringify(data, null, 2))
  console.log('- error:', error)

  if (error) {
    console.error('\n❌ Erreur:', error.message)
  } else if (data?.success) {
    console.log('\n✅ Succès!')
  } else {
    console.log('\n⚠️ Échec:', data?.error || 'Unknown error')
  }
}

// Récupérer d'abord le user_id du rental
const { data: rental } = await supabase
  .from('rentals')
  .select('user_id')
  .eq('rent_id', '30658643')
  .single()

if (rental) {
  console.log('👤 User ID:', rental.user_id)
  await testCall()
} else {
  console.error('❌ Rental not found')
}
