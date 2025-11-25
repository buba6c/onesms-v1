import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Vérification des colonnes de la table services\n')

async function checkColumns() {
  // Récupérer un service pour voir les colonnes
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .limit(1)
    .single()
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log('📊 Colonnes disponibles:\n')
  Object.keys(data).forEach((col, i) => {
    console.log(`   ${i + 1}. ${col}: ${typeof data[col]} = ${data[col]}`)
  })
  
  console.log('\n🔍 Recherche colonne "active" vs "is_active"...\n')
  
  if ('active' in data) {
    console.log('   ✅ Colonne "active" existe')
  } else {
    console.log('   ❌ Colonne "active" MANQUANTE')
  }
  
  if ('is_active' in data) {
    console.log('   ✅ Colonne "is_active" existe')
  } else {
    console.log('   ❌ Colonne "is_active" MANQUANTE')
  }
  
  // Vérifier combien de services ont active = true
  const { data: activeServices } = await supabase
    .from('services')
    .select('code, name')
    .eq('active', true)
  
  console.log(`\n📊 Services avec active = true: ${activeServices?.length || 0}`)
  
  // Vérifier combien ont total_available > 0
  const { data: availableServices } = await supabase
    .from('services')
    .select('code, name, total_available')
    .gt('total_available', 0)
  
  console.log(`📊 Services avec total_available > 0: ${availableServices?.length || 0}\n`)
  
  if (availableServices && availableServices.length > 0) {
    console.log('Top 5 services disponibles:')
    availableServices.slice(0, 5).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name} (${s.code}): ${s.total_available}`)
    })
  }
}

checkColumns().catch(console.error)
