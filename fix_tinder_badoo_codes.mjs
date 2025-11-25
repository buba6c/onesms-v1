import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 Correction des codes SMS-Activate pour Tinder & Badoo\n')

// 1. Corriger Tinder: 'tinder' → 'oi'
console.log('1️⃣  Tinder: Changer code "tinder" → "oi"')
const { error: tinderError } = await supabase
  .from('services')
  .update({ code: 'oi' })
  .eq('name', 'Tinder')
  .eq('active', true)

if (tinderError) {
  console.error('   ❌', tinderError)
} else {
  console.log('   ✅ Tinder mis à jour')
}

// 2. Désactiver le mauvais Badoo (code: 'badoo')
console.log('\n2️⃣  Badoo: Désactiver le mauvais (code: "badoo")')
const { error: badooBadError } = await supabase
  .from('services')
  .update({ active: false })
  .eq('name', 'Badoo')
  .eq('code', 'badoo')

if (badooBadError) {
  console.error('   ❌', badooBadError)
} else {
  console.log('   ✅ Mauvais Badoo désactivé')
}

// 3. Activer le bon Badoo (code: 'qv')
console.log('\n3️⃣  Badoo: Activer le bon (code: "qv")')
const { error: badooGoodError } = await supabase
  .from('services')
  .update({ active: true })
  .eq('name', 'Badoo')
  .eq('code', 'qv')

if (badooGoodError) {
  console.error('   ❌', badooGoodError)
} else {
  console.log('   ✅ Bon Badoo activé')
}

// 4. Vérifier le résultat
console.log('\n4️⃣  Vérification finale:')
const { data: services } = await supabase
  .from('services')
  .select('name, code, active, category, popularity_score, total_available')
  .in('name', ['Tinder', 'Badoo'])
  .order('name')

services?.forEach(s => {
  const status = s.active ? '✅ ACTIF' : '❌ INACTIF'
  console.log(`\n   ${s.name} (${s.code}): ${status}`)
  console.log(`      Catégorie: ${s.category}`)
  console.log(`      Popularité: ${s.popularity_score}`)
  console.log(`      Disponible: ${s.total_available}`)
})

// 5. Test Edge Function
console.log('\n\n5️⃣  Test Edge Function avec codes corrigés:')

for (const service of services?.filter(s => s.active) || []) {
  console.log(`\n   📱 ${service.name} (code: ${service.code})`)
  
  try {
    const { data, error } = await supabase.functions.invoke('get-top-countries-by-service', {
      body: { service: service.code }
    })
    
    if (error) {
      console.log(`      ❌ Erreur:`, error.message)
    } else if (data.countries && data.countries.length > 0) {
      console.log(`      ✅ ${data.countries.length} pays disponibles`)
      console.log(`      Top 3: ${data.countries.slice(0, 3).map(c => c.countryName).join(', ')}`)
    } else {
      console.log(`      ⚠️  Aucun pays disponible`)
    }
  } catch (err) {
    console.log(`      ❌ Exception:`, err.message)
  }
}

console.log('\n\n✅ CORRECTION TERMINÉE')
console.log('Les services Tinder et Badoo utilisent maintenant les bons codes SMS-Activate')
console.log('Vous pouvez tester dans la plateforme: http://localhost:3002')
