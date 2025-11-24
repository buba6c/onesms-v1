import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

const { data } = await supabase
  .from('services')
  .select('code, name, display_name')
  .in('code', ['wa', 'whatsapp', 'tg', 'telegram', 'fb', 'facebook'])

console.log('Services populaires:')
data?.forEach(s => {
  console.log(`  ${s.code} → ${s.display_name || s.name}`)
})
