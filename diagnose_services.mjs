import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 ═══════════════════════════════════════════════════════════════')
console.log('🔍 DIAGNOSTIC - Services Badoo & Tinder')
console.log('🔍 ═══════════════════════════════════════════════════════════════\n')

async function diagnoseServices() {
  console.log('📊 ÉTAPE 1: Vérification dans la DB\n')
  
  // Chercher Badoo et Tinder
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .in('code', ['qv', 'oi']) // qv = Badoo, oi = Tinder
    .order('name')
  
  if (error) {
    console.error('❌ Erreur DB:', error)
    return
  }
  
  console.log(`✅ Services trouvés: ${services.length}\n`)
  
  if (services.length === 0) {
    console.log('⚠️  PROBLÈME: Badoo et Tinder ne sont PAS dans la DB!')
    console.log('   Code Badoo: qv')
    console.log('   Code Tinder: oi')
    console.log('\n💡 SOLUTION: Insérer ces services dans la table services\n')
  } else {
    services.forEach((svc, i) => {
      console.log(`${i + 1}. ${svc.name} (${svc.code})`)
      console.log(`   ID: ${svc.id}`)
      console.log(`   Catégorie: ${svc.category}`)
      console.log(`   Total disponible: ${svc.total_available}`)
      console.log(`   Actif: ${svc.is_active ? '✅' : '❌'}`)
      console.log('')
      
      if (svc.total_available === 999) {
        console.log(`   ⚠️  PROBLÈME: ${svc.name} affiche 999 numéros`)
        console.log(`      Cela indique que le cron n'a pas mis à jour les quantités réelles`)
      }
    })
  }
  
  console.log('\n📊 ÉTAPE 2: Vérification API SMS-Activate\n')
  
  // Test direct de l'API pour ces services
  const SMS_ACTIVATE_API_KEY = 'd29edd5e1d04c3127d5253d5eAe70de8'
  
  for (const serviceCode of ['qv', 'oi']) {
    const serviceName = serviceCode === 'qv' ? 'Badoo' : 'Tinder'
    console.log(`🌐 Test ${serviceName} (${serviceCode})...`)
    
    try {
      // Test avec l'Indonésie (country 6)
      const url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=6&operator=any`
      const response = await fetch(url)
      const text = await response.text()
      
      try {
        const data = JSON.parse(text)
        
        if (data[serviceCode + '_0']) {
          const count = data[serviceCode + '_0']
          console.log(`   ✅ ${serviceName}: ${count} numéros disponibles en Indonésie`)
        } else {
          console.log(`   ⚠️  ${serviceName}: Service non disponible en Indonésie`)
          console.log(`      Clé cherchée: ${serviceCode}_0`)
        }
      } catch (e) {
        console.log(`   ❌ Erreur de parsing pour ${serviceName}`)
      }
    } catch (error) {
      console.error(`   ❌ Erreur API pour ${serviceName}:`, error.message)
    }
    console.log('')
  }
  
  console.log('\n📊 ÉTAPE 3: Vérification des Services Actifs\n')
  
  const { data: allServices } = await supabase
    .from('services')
    .select('code, name, total_available, is_active')
    .order('total_available', { ascending: false })
    .limit(20)
  
  console.log('Top 20 services par disponibilité:\n')
  allServices?.forEach((svc, i) => {
    const status = svc.is_active ? '✅' : '❌'
    const availability = svc.total_available === 999 ? '⚠️  999 (non mis à jour)' : `${svc.total_available}`
    console.log(`${i + 1}. ${status} ${svc.name} (${svc.code}): ${availability}`)
  })
  
  console.log('\n🎯 ═══════════════════════════════════════════════════════════════')
  console.log('🎯 RÉSUMÉ DES PROBLÈMES')
  console.log('🎯 ═══════════════════════════════════════════════════════════════\n')
  
  console.log('PROBLÈME 1: Services manquants')
  console.log('   - Badoo et Tinder peuvent ne pas être dans la DB')
  console.log('   - Solution: INSERT INTO services\n')
  
  console.log('PROBLÈME 2: Quantités = 999')
  console.log('   - Indique que le cron update-services-counts ne fonctionne pas')
  console.log('   - Solution: Vérifier et exécuter le cron\n')
  
  console.log('PROBLÈME 3: Services non actifs')
  console.log('   - is_active = false empêche l\'affichage')
  console.log('   - Solution: UPDATE services SET is_active = true\n')
}

diagnoseServices().catch(console.error)
