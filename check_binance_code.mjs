import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Recherche Binance dans la DB\n')

const { data: services } = await supabase
  .from('services')
  .select('code, name, icon, active')
  .ilike('name', '%binance%')

console.log('Services trouvés:')
services?.forEach(s => {
  console.log(`  Name: "${s.name}"`)
  console.log(`  Code: "${s.code}"`)
  console.log(`  Icon: "${s.icon}"`)
  console.log(`  Active: ${s.active}`)
  console.log(`  Logo URL généré: https://img.logo.dev/${s.code}.com?token=pk_acOeajbNRKGsSDnJvJrcfw&size=200`)
  console.log()
})

console.log(`\n💡 Si le code n'est pas "binance", il faut ajouter un mapping!`)
