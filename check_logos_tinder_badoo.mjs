import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Vérification logos Tinder & Badoo\n')

// Vérifier service_icons
const { data: icons } = await supabase
  .from('service_icons')
  .select('*')
  .in('service_code', ['oi', 'qv', 'tinder', 'badoo'])

console.log('📊 service_icons:')
icons?.forEach(icon => {
  console.log(`   ${icon.service_code}: ${icon.icon_url || 'NO URL'}`)
})

// Vérifier services
const { data: services } = await supabase
  .from('services')
  .select('code, name, icon, active')
  .in('code', ['oi', 'qv'])

console.log('\n📊 services:')
services?.forEach(s => {
  console.log(`   ${s.code} (${s.name}): icon="${s.icon}", active=${s.active}`)
})

// Compter total services actifs
const { count } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

console.log(`\n📊 Total services actifs: ${count}`)
