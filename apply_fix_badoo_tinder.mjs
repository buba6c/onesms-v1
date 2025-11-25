import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.JRITMgYb5R0lnBKGt1DVLtxiQl7jJxI8FZ_GZEWRyVA'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 APPLICATION DU FIX Badoo & Tinder\n')

async function applyFix() {
  // 1. Corriger Badoo
  console.log('1️⃣  Correction Badoo (code: badoo)...')
  const { error: badooError } = await supabase
    .from('services')
    .update({
      name: 'Badoo',
      category: 'dating',
      popularity_score: 850,
      updated_at: new Date().toISOString()
    })
    .eq('code', 'badoo')
  
  if (badooError) {
    console.error('   ❌ Erreur:', badooError.message)
  } else {
    console.log('   ✅ Badoo mis à jour')
  }
  
  // 2. Corriger Tinder
  console.log('\n2️⃣  Correction Tinder (code: tinder)...')
  const { error: tinderError } = await supabase
    .from('services')
    .update({
      name: 'Tinder',
      category: 'dating',
      popularity_score: 900,
      updated_at: new Date().toISOString()
    })
    .eq('code', 'tinder')
  
  if (tinderError) {
    console.error('   ❌ Erreur:', tinderError.message)
  } else {
    console.log('   ✅ Tinder mis à jour')
  }
  
  // 3. Désactiver les doublons
  console.log('\n3️⃣  Désactivation des doublons (qv, oi)...')
  const { error: duplicatesError } = await supabase
    .from('services')
    .update({
      active: false,
      updated_at: new Date().toISOString()
    })
    .in('code', ['qv', 'oi'])
  
  if (duplicatesError) {
    console.error('   ❌ Erreur:', duplicatesError.message)
  } else {
    console.log('   ✅ Doublons désactivés')
  }
  
  // 4. Vérification
  console.log('\n📊 VÉRIFICATION FINALE:\n')
  const { data: verification } = await supabase
    .from('services')
    .select('code, name, active, total_available, category, popularity_score')
    .in('code', ['badoo', 'tinder', 'qv', 'oi'])
    .order('popularity_score', { ascending: false })
  
  verification?.forEach(s => {
    const status = s.active && s.total_available > 0 ? '✅' : '❌'
    console.log(`${status} ${s.name} (${s.code}):`)
    console.log(`   Active: ${s.active}`)
    console.log(`   Available: ${s.total_available}`)
    console.log(`   Category: ${s.category}`)
    console.log(`   Popularity: ${s.popularity_score}`)
    console.log('')
  })
  
  // 5. Test de la requête Dashboard
  console.log('🧪 TEST: Requête Dashboard (active=true, total>0):\n')
  const { data: dashboardTest } = await supabase
    .from('services')
    .select('code, name, total_available, category, popularity_score')
    .eq('active', true)
    .gt('total_available', 0)
    .in('code', ['badoo', 'tinder'])
    .order('popularity_score', { ascending: false })
  
  if (dashboardTest && dashboardTest.length > 0) {
    console.log('✅ Services qui apparaîtront dans le Dashboard:')
    dashboardTest.forEach(s => {
      console.log(`   - ${s.name} (${s.code}): ${s.total_available} numéros`)
    })
  } else {
    console.log('❌ Aucun service ne passe le filtre')
  }
}

applyFix().catch(console.error)
