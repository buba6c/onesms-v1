import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testPriceFlow() {
  console.log('🧪 TEST DU FLUX COMPLET DE PRIX\n')
  console.log('='.repeat(80))
  
  try {
    // 1. Simuler un appel frontend pour WhatsApp
    console.log('\n1️⃣ SIMULATION: RÉCUPÉRATION DES PRIX WHATSAPP\n')
    
    const { data: countriesData, error: countriesError } = await supabase.functions.invoke('get-top-countries-by-service', {
      body: { service: 'wa' } // WhatsApp
    })
    
    if (countriesError) {
      console.error('❌ Erreur get-top-countries:', countriesError)
      return
    }
    
    const countries = countriesData?.countries || []
    console.log(`📊 Trouvé ${countries.length} pays pour WhatsApp\n`)
    
    // Afficher les 5 premiers pays avec leurs prix
    console.log('Top 5 pays (prix affiché au frontend):')
    console.log('Country\t\tPrice\tCount\tSuccess Rate')
    console.log('─'.repeat(80))
    
    const top5 = countries.slice(0, 5)
    top5.forEach((c) => {
      console.log(`${c.countryName}\t${c.price}Ⓐ\t${c.count}\t${c.successRate || 'N/A'}`)
    })
    
    // 2. Prendre le premier pays et simuler un achat
    if (top5.length > 0) {
      const testCountry = top5[0]
      
      console.log('\n' + '='.repeat(80))
      console.log(`\n2️⃣ SIMULATION D'ACHAT: ${testCountry.countryName}\n`)
      
      console.log('📊 DONNÉES DU FRONTEND:')
      console.log(`   Service: wa (WhatsApp)`)
      console.log(`   Country ID: ${testCountry.countryId}`)
      console.log(`   Prix affiché: ${testCountry.price} Ⓐ`)
      console.log(`   Quantité dispo: ${testCountry.count}`)
      
      console.log('\n💡 CE QUI SERAIT ENVOYÉ AU BACKEND:')
      console.log(`   {`)
      console.log(`     country: "${testCountry.countryId}",`)
      console.log(`     product: "wa",`)
      console.log(`     expectedPrice: ${testCountry.price}`)
      console.log(`   }`)
      
      // 3. Vérifier ce que le backend fait avec ce prix
      console.log('\n' + '='.repeat(80))
      console.log('\n3️⃣ TRAITEMENT BACKEND\n')
      
      console.log('📋 ÉTAPES buy-sms-activate-number:')
      console.log('   1. Reçoit expectedPrice = ' + testCountry.price + ' Ⓐ')
      console.log('   2. Récupère le prix API SMS-Activate')
      console.log('   3. Si expectedPrice existe, l\'utilise (ignore le prix API)')
      console.log('   4. Crée transaction avec amount = -' + testCountry.price + ' Ⓐ')
      console.log('   5. Gèle les crédits: frozen_balance += ' + testCountry.price + ' Ⓐ')
      console.log('   6. Crée activation avec price = ' + testCountry.price + ', frozen_amount = ' + testCountry.price + ' Ⓐ')
      
      // 4. Vérifier si le prix API est différent
      console.log('\n' + '='.repeat(80))
      console.log('\n4️⃣ VÉRIFICATION DES PRIX API\n')
      
      // Simuler l'appel API getPrices
      const SMS_ACTIVATE_API_KEY = 'Ac66db79d46cdd15A89e31db2d68e2A6'
      const priceUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=wa&country=${testCountry.countryId}`
      
      try {
        const response = await fetch(priceUrl)
        const apiPriceData = await response.json()
        
        console.log('📊 RÉPONSE API getPrices:')
        console.log(JSON.stringify(apiPriceData, null, 2))
        
        // Parser le prix
        let apiPrice = null
        if (apiPriceData && apiPriceData[testCountry.countryId.toString()]) {
          const countryData = apiPriceData[testCountry.countryId.toString()]
          if (countryData.wa && countryData.wa.cost) {
            apiPrice = parseFloat(countryData.wa.cost)
          } else if (countryData.cost) {
            apiPrice = parseFloat(countryData.cost)
          }
        }
        
        console.log(`\n🔍 COMPARAISON:`)
        console.log(`   Prix affiché (frontend): ${testCountry.price} Ⓐ`)
        console.log(`   Prix API (temps réel): ${apiPrice} Ⓐ`)
        
        if (apiPrice && Math.abs(testCountry.price - apiPrice) > 0.01) {
          console.log(`   ❌ DIFFÉRENCE: ${(testCountry.price - apiPrice).toFixed(2)} Ⓐ`)
          console.log(`\n⚠️  PROBLÈME POTENTIEL:`)
          console.log(`   Le prix affiché au frontend peut être différent du prix API`)
          console.log(`   Mais le backend utilise expectedPrice du frontend, donc cohérence OK`)
        } else {
          console.log(`   ✅ PRIX COHÉRENTS`)
        }
        
      } catch (error) {
        console.error('❌ Erreur appel API:', error.message)
      }
    }
    
    // 5. Vérifier les dernières activations pour voir s'il y a des incohérences
    console.log('\n' + '='.repeat(80))
    console.log('\n5️⃣ VÉRIFICATION DES ACTIVATIONS RÉCENTES\n')
    
    const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
    
    const { data: recentActivations } = await supabase
      .from('activations')
      .select('id, service_code, country_code, price, frozen_amount, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('10 dernières activations:')
    console.log('Service\tCountry\tPrice\tFrozen\tStatus\t\tDate')
    console.log('─'.repeat(80))
    
    recentActivations?.forEach(act => {
      const match = Math.abs(act.price - act.frozen_amount) < 0.01 ? '✅' : '❌'
      const date = new Date(act.created_at).toLocaleString()
      console.log(`${act.service_code}\t${act.country_code}\t${act.price}\t${act.frozen_amount}\t${act.status}\t${date.slice(0, 16)} ${match}`)
    })
    
    // Compter les incohérences
    const inconsistent = recentActivations?.filter(act => 
      Math.abs(act.price - act.frozen_amount) > 0.01
    ) || []
    
    console.log(`\n📊 RÉSULTAT:`)
    console.log(`   Total activations: ${recentActivations?.length || 0}`)
    console.log(`   Incohérences price ≠ frozen_amount: ${inconsistent.length}`)
    
    if (inconsistent.length > 0) {
      console.log(`\n❌ PROBLÈME DÉTECTÉ!`)
      console.log(`   ${inconsistent.length} activations ont price ≠ frozen_amount`)
      console.log(`   Cela peut causer des déductions incorrectes lors des remboursements`)
    } else {
      console.log(`\n✅ TOUT EST COHÉRENT`)
      console.log(`   Toutes les activations ont price = frozen_amount`)
    }
    
    // 6. Résumé final
    console.log('\n' + '='.repeat(80))
    console.log('\n🎯 RÉSUMÉ FINAL\n')
    
    console.log('🔍 FLOW ACTUEL:')
    console.log('   1. Frontend affiche le prix depuis get-top-countries-by-service')
    console.log('   2. Frontend envoie expectedPrice au backend')
    console.log('   3. Backend utilise expectedPrice (pas le prix API temps réel)')
    console.log('   4. Backend crée activation avec price = expectedPrice')
    console.log('   5. Backend gèle frozen_amount = expectedPrice')
    console.log('   6. Transaction déduit amount = -expectedPrice')
    
    console.log('\n✅ AVANTAGES:')
    console.log('   - Le prix déduit correspond au prix affiché')
    console.log('   - Cohérence entre frontend et backend')
    console.log('   - Pas de surprise pour l\'utilisateur')
    
    console.log('\n⚠️  RISQUES POTENTIELS:')
    console.log('   - Si le prix API change entre l\'affichage et l\'achat')
    console.log('   - Si le cache du frontend est obsolète')
    console.log('   - Si une marge est ajoutée à un endroit mais pas un autre')
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

// Exécuter le test
testPriceFlow()
