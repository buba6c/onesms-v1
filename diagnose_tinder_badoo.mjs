import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2Nzg3NTksImV4cCI6MjA0NzI1NDc1OX0.1qUF2YzJKYN2FxVU61bEFpU2xJh0-FS0Gok_f3nPTd4'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Diagnostic Tinder/Badoo\n')

// Test avec le code correct
const tests = [
  { displayName: 'Tinder', frontendCode: 'tinder', smsActivateCode: 'oi' },
  { displayName: 'Badoo', frontendCode: 'badoo', smsActivateCode: 'bd' }
]

for (const test of tests) {
  console.log(`\n📱 ${test.displayName}`)
  console.log(`   Frontend code: ${test.frontendCode}`)
  console.log(`   SMS-Activate code: ${test.smsActivateCode}`)
  
  // Test 1: API SMS-Activate directement
  console.log(`\n   🧪 Test API SMS-Activate (code: ${test.smsActivateCode})...`)
  try {
    const apiKey = 'Ac19c4c1e68ec8bcAd5cbe0c42c3b56Ad'
    const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getTopCountriesByServiceRank&service=${test.smsActivateCode}&freePrice=true`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error || Object.keys(data).length === 0) {
      console.log(`   ❌ API retourne vide/erreur:`, data)
    } else {
      console.log(`   ✅ API retourne ${Object.keys(data).length} pays`)
      console.log(`   Premier pays:`, Object.values(data)[0])
    }
  } catch (error) {
    console.log(`   ❌ Erreur API:`, error.message)
  }
  
  // Test 2: Edge Function avec le code SMS-Activate
  console.log(`\n   🧪 Test Edge Function (code: ${test.smsActivateCode})...`)
  try {
    const { data, error } = await supabase.functions.invoke('get-top-countries-by-service', {
      body: { service: test.smsActivateCode }
    })
    
    if (error) {
      console.log(`   ❌ Edge Function erreur:`, error)
    } else if (data.countries && data.countries.length > 0) {
      console.log(`   ✅ Edge Function retourne ${data.countries.length} pays`)
    } else {
      console.log(`   ⚠️  Edge Function retourne 0 pays`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur Edge Function:`, error.message)
  }
  
  // Test 3: Edge Function avec le code frontend (celui utilisé actuellement)
  console.log(`\n   🧪 Test Edge Function (code frontend: ${test.frontendCode})...`)
  try {
    const { data, error } = await supabase.functions.invoke('get-top-countries-by-service', {
      body: { service: test.frontendCode }
    })
    
    if (error) {
      console.log(`   ❌ Edge Function erreur:`, error)
    } else if (data.countries && data.countries.length > 0) {
      console.log(`   ✅ Edge Function retourne ${data.countries.length} pays`)
    } else {
      console.log(`   ⚠️  Edge Function retourne 0 pays`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur Edge Function:`, error.message)
  }
}

console.log('\n\n📋 CONCLUSION:')
console.log('Le problème est dans DashboardPage.tsx ligne 263-278')
console.log('Le serviceCodeMapping ne contient pas les codes pour tinder et badoo')
console.log('Quand on clique sur tinder, il envoie "tinder" au lieu de "oi"')
console.log('L\'API SMS-Activate ne connaît pas "tinder", seulement "oi"')
