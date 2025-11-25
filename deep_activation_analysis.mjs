import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEEP ANALYSIS: Problème d\'activation et SMS\n')
console.log('='.repeat(60))

async function deepAnalysis() {
  // 1. Vérifier les activations récentes (dernières 24h)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  console.log('\n📊 ÉTAPE 1: Activations des dernières 24h\n')
  
  const { data: recentActivations, error: activationsError } = await supabase
    .from('activations')
    .select('*')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
  
  if (activationsError) {
    console.error('❌ Erreur:', activationsError)
    return
  }
  
  console.log(`Total activations: ${recentActivations.length}`)
  
  if (recentActivations.length === 0) {
    console.log('⚠️  AUCUNE activation trouvée dans les dernières 24h')
    console.log('\nVérifions toutes les activations...\n')
    
    const { data: allActivations } = await supabase
      .from('activations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    console.log(`Total activations (all time): ${allActivations?.length || 0}`)
    
    if (allActivations && allActivations.length > 0) {
      console.log('\n📋 Dernières 5 activations:\n')
      allActivations.slice(0, 5).forEach((a, i) => {
        console.log(`${i + 1}. Activation ID: ${a.id}`)
        console.log(`   Phone: ${a.phone}`)
        console.log(`   Status: ${a.status}`)
        console.log(`   Service: ${a.service_code}`)
        console.log(`   Provider: ${a.provider}`)
        console.log(`   External ID: ${a.external_id}`)
        console.log(`   SMS Code: ${a.sms_code || 'NULL'}`)
        console.log(`   Created: ${a.created_at}`)
        console.log(`   Updated: ${a.updated_at}`)
        console.log('')
      })
    }
  } else {
    // Analyse des statuts
    const statusCounts = {}
    recentActivations.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1
    })
    
    console.log('\n📊 Répartition par statut:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`)
    })
    
    // Activations en attente
    const pending = recentActivations.filter(a => 
      a.status === 'pending' || a.status === 'waiting'
    )
    
    console.log(`\n⏳ Activations en attente/waiting: ${pending.length}`)
    
    if (pending.length > 0) {
      console.log('\n📋 Détails des activations en attente:\n')
      pending.slice(0, 10).forEach((a, i) => {
        console.log(`${i + 1}. Activation ID: ${a.id}`)
        console.log(`   Phone: ${a.phone}`)
        console.log(`   Status: ${a.status}`)
        console.log(`   Service: ${a.service_code}`)
        console.log(`   Provider: ${a.provider}`)
        console.log(`   External ID: ${a.external_id}`)
        console.log(`   Created: ${a.created_at}`)
        const age = Math.round((Date.now() - new Date(a.created_at)) / 1000 / 60)
        console.log(`   Age: ${age} minutes`)
        console.log('')
      })
      
      // Vérifier le statut réel sur SMS-Activate pour les 3 premiers
      console.log('🔍 Vérification statut réel sur SMS-Activate:\n')
      
      for (const activation of pending.slice(0, 3)) {
        if (activation.provider === 'sms-activate' && activation.external_id) {
          console.log(`Checking ${activation.phone} (${activation.external_id})...`)
          
          try {
            // V1 API
            const v1Response = await fetch(
              `https://api.sms-activate.org/stubs/handler_api.php?api_key=cA23cf06fA8b8c17e2cb35d6c116e12e&action=getStatus&id=${activation.external_id}`
            )
            const v1Text = await v1Response.text()
            console.log(`   V1 API: ${v1Text}`)
            
            // V2 API
            const v2Response = await fetch(
              `https://api.sms-activate.org/api/v2/getStatus?apiKey=cA23cf06fA8b8c17e2cb35d6c116e12e&activationId=${activation.external_id}`
            )
            const v2Data = await v2Response.json()
            console.log(`   V2 API: ${JSON.stringify(v2Data)}`)
            console.log('')
          } catch (error) {
            console.error(`   ❌ Error: ${error.message}\n`)
          }
        }
      }
    }
    
    // Activations avec SMS reçu
    const received = recentActivations.filter(a => 
      a.status === 'received' || a.status === 'completed' || a.sms_code
    )
    
    console.log(`\n✅ Activations avec SMS: ${received.length}`)
    
    if (received.length > 0) {
      console.log('\n📋 Détails des SMS reçus:\n')
      received.slice(0, 5).forEach((a, i) => {
        console.log(`${i + 1}. Phone: ${a.phone}`)
        console.log(`   SMS Code: ${a.sms_code}`)
        console.log(`   Status: ${a.status}`)
        console.log(`   Received at: ${a.updated_at}`)
        console.log('')
      })
    }
  }
  
  // 2. Vérifier les services disponibles
  console.log('\n📊 ÉTAPE 2: Services avec count=999\n')
  
  const { data: services999 } = await supabase
    .from('services')
    .select('code, name, total_available')
    .eq('active', true)
    .order('total_available', { ascending: false })
    .limit(20)
  
  console.log('Top 20 services:')
  services999?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.code}): ${s.total_available}`)
  })
  
  // 3. Vérifier le cron job
  console.log('\n\n📊 ÉTAPE 3: Vérifier le cron job\n')
  
  try {
    const cronResponse = await fetch(
      'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    const cronResult = await cronResponse.json()
    console.log('Cron result:', JSON.stringify(cronResult, null, 2))
  } catch (error) {
    console.error('❌ Cron error:', error.message)
  }
  
  // 4. Vérifier les pricing rules
  console.log('\n\n📊 ÉTAPE 4: Pricing rules pour les services populaires\n')
  
  const popularServices = ['tinder', 'badoo', 'whatsapp', 'telegram', 'facebook']
  
  for (const serviceCode of popularServices) {
    const { data: rules } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('service_code', serviceCode)
      .eq('active', true)
    
    if (rules && rules.length > 0) {
      console.log(`✅ ${serviceCode}: ${rules.length} règles actives`)
      rules.forEach(r => {
        console.log(`   Country ${r.country_id}: ${r.price} FCFA`)
      })
    } else {
      console.log(`❌ ${serviceCode}: AUCUNE règle de prix active`)
    }
  }
  
  // 5. Vérifier la fonction rent-sms-activate-number
  console.log('\n\n📊 ÉTAPE 5: Test de location de numéro\n')
  
  console.log('Test avec Tinder (Indonesia)...')
  
  try {
    const rentResponse = await fetch(
      'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/rent-sms-activate-number',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceCode: 'tinder',
          countryId: 6, // Indonesia
          userId: 'test-user-id'
        })
      }
    )
    
    const rentResult = await rentResponse.json()
    console.log('Rent result:', JSON.stringify(rentResult, null, 2))
  } catch (error) {
    console.error('❌ Rent error:', error.message)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Analyse terminée')
}

deepAnalysis().catch(console.error)
