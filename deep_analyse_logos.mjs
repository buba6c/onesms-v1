import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEEP ANALYSE: Logos Tinder & Badoo\n')

// 1. Vérifier dans services table
console.log('1️⃣ TABLE services:')
const { data: services } = await supabase
  .from('services')
  .select('code, name, icon')
  .in('name', ['Tinder', 'Badoo'])

services?.forEach(s => {
  console.log(`   ${s.name} (${s.code}): icon="${s.icon}"`)
})

// 2. Vérifier dans service_icons table
console.log('\n2️⃣ TABLE service_icons:')
const { data: icons } = await supabase
  .from('service_icons')
  .select('*')
  .in('service_code', ['oi', 'qv', 'tinder', 'badoo'])

icons?.forEach(icon => {
  console.log(`   ${icon.service_code}: ${icon.icon_url || 'NO URL'}`)
})

// 3. Test des URLs Logo.dev
console.log('\n3️⃣ TEST Logo.dev:')
const token = 'pk_acOeajbNRKGsSDnJvJrcfw'
const tests = [
  { code: 'oi', domain: 'oi.com', name: 'Tinder (code: oi)' },
  { code: 'tinder', domain: 'tinder.com', name: 'Tinder (nom)' },
  { code: 'qv', domain: 'qv.com', name: 'Badoo (code: qv)' },
  { code: 'badoo', domain: 'badoo.com', name: 'Badoo (nom)' },
]

for (const test of tests) {
  const url = `https://img.logo.dev/${test.domain}?token=${token}&size=200`
  console.log(`   ${test.name}:`)
  console.log(`      ${url}`)
  
  try {
    const response = await fetch(url)
    console.log(`      Status: ${response.status} ${response.status === 200 ? '✅' : '❌'}`)
  } catch (err) {
    console.log(`      Error: ${err.message}`)
  }
}

console.log('\n4️⃣ CONCLUSION:')
console.log('   - Logo.dev utilise les NOMS de domaines (tinder.com, badoo.com)')
console.log('   - Les CODES SMS-Activate (oi, qv) ne fonctionnent PAS avec Logo.dev')
console.log('   - Solution: Ajouter mapping dans SERVICE_DOMAINS')
console.log('      oi → tinder.com')
console.log('      qv → badoo.com')
