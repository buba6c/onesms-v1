import { createClient } from '@supabase/supabase-js'
import { formatPhoneNumber } from './src/utils/phoneFormatter.ts'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Test formatage des numéros dans activations\n')

// Récupérer quelques activations
const { data: activations } = await supabase
  .from('activations')
  .select('id, phone, service_code, country_code')
  .limit(5)

console.log(`📊 ${activations?.length || 0} activations trouvées\n`)

activations?.forEach(act => {
  const formatted = formatPhoneNumber(act.phone)
  console.log(`Service: ${act.service_code}`)
  console.log(`  Brut:     ${act.phone}`)
  console.log(`  Formaté:  ${formatted}`)
  console.log(`  Match:    ${formatted.includes('(') && formatted.includes(')') ? '✅' : '❌'}`)
  console.log()
})
