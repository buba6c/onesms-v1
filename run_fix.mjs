import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🚀 Exécution de fix-badoo-tinder...\n')

async function runFix() {
  const { data, error } = await supabase.functions.invoke('fix-badoo-tinder', {
    body: {}
  })
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log('✅ Résultat:\n')
  console.log(JSON.stringify(data, null, 2))
  
  if (data.results) {
    console.log('\n📊 État des services:\n')
    data.results.forEach((r) => {
      console.log(`${r.visible} ${r.name} (${r.code}):`)
      console.log(`   Active: ${r.active}`)
      console.log(`   Available: ${r.total_available}`)
      console.log(`   Category: ${r.category}`)
      console.log(`   Popularity: ${r.popularity_score}`)
      console.log('')
    })
  }
}

runFix().catch(console.error)
