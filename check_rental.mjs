import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ1NDUyNywiZXhwIjoyMDQ4MDMwNTI3fQ.3lkFiSGca6GYxrWhXCquYgXMkdpVHpkEeeORfLwKWtI'
)

const { data, error } = await supabase
  .from('rentals')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(5)

console.log('Active rentals:')
data?.forEach(r => {
  const now = new Date()
  const end = new Date(r.end_date)
  const diffMs = end - now
  const diffH = Math.floor(diffMs / 3600000)
  const diffM = Math.floor((diffMs % 3600000) / 60000)
  
  console.log(`\nRental ID: ${r.id}`)
  console.log(`  Phone: ${r.phone}`)
  console.log(`  Created: ${r.created_at}`)
  console.log(`  End date (DB): ${r.end_date}`)
  console.log(`  Now: ${now.toISOString()}`)
  console.log(`  Remaining: ${diffH}h ${diffM}m`)
  console.log(`  Duration stored: ${r.rent_hours}h`)
})
