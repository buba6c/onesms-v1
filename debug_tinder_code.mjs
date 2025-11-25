import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 ANALYSE: Quel code est envoyé à getServiceLogo()?\n')

// Vérifier EXACTEMENT ce que contient services.code
const { data: services } = await supabase
  .from('services')
  .select('id, name, code, icon, active')
  .eq('name', 'Tinder')
  .order('active', { ascending: false })

console.log('📊 Services Tinder dans la DB:')
services?.forEach(s => {
  console.log(`  Name: "${s.name}"`)
  console.log(`  Code: "${s.code}"`)
  console.log(`  Code length: ${s.code.length} caractères`)
  console.log(`  Code bytes: ${JSON.stringify([...s.code].map(c => c.charCodeAt(0)))}`)
  console.log(`  Icon: "${s.icon}"`)
  console.log(`  Active: ${s.active}`)
  console.log()
})

// Tester la fonction de mapping
console.log('🧪 Test mapping dans SERVICE_DOMAINS:')
const testCodes = ['oi', 'Oi', 'OI', ' oi ', 'oi ', ' oi']
testCodes.forEach(code => {
  const trimmed = code.toLowerCase().trim()
  const mapping = {
    'oi': 'tinder.com',
    'qv': 'badoo.com',
  }
  const domain = mapping[trimmed] || `${trimmed}.com`
  console.log(`  "${code}" → trim+lower → "${trimmed}" → domain: ${domain}`)
})
