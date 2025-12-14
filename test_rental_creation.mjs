// TEST CRÉATION RENTAL - Vérifier que les erreurs de colonnes sont résolues
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRentalCreation() {
  console.log('🧪 TEST CRÉATION RENTAL')

  try {
    // 1. Obtenir un utilisateur avec balance
    console.log('👤 Recherche utilisateur avec balance...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, balance, frozen_balance')
      .gt('balance', 10)
      .limit(1)

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      throw new Error('Aucun utilisateur avec balance suffisante trouvé')
    }

    const testUser = users[0]
    console.log('✅ Utilisateur test:', testUser)

    // 2. Tester l'API directement avec des données valides
    console.log('🚀 Test API buy-sms-activate-rent...')
    
    const testData = {
      country: 'indonesia', // ID = 6 dans COUNTRY_CODE_MAP
      product: 'whatsapp',  // Mappé vers 'wa' dans SERVICE_CODE_MAP
      userId: testUser.id,
      duration: '4hours',   // Mappé vers 4 dans RENT_DURATIONS
      expectedPrice: 0.50   // Prix modéré pour test
    }

    console.log('📨 Données test:', testData)

    // Créer un token d'auth simulé (pas requis pour service_role mais structure complète)
    const response = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/buy-sms-activate-rent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-client-info': 'test-script'
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ Erreur API:', result)
      
      // Analyser les détails d'erreur
      if (result.details && result.details.includes('null value')) {
        console.error('🔍 COLONNE NULL DÉTECTÉE:', result.details)
        
        // Extraire le nom de colonne
        const match = result.details.match(/"([^"]+)" of relation "rentals" violates not-null constraint/)
        if (match) {
          console.error(`🎯 COLONNE PROBLÉMATIQUE: ${match[1]}`)
        }
      }
    } else {
      console.log('✅ Rental créé avec succès:', result.data)
      
      // Vérifier que l'enregistrement existe bien en DB
      console.log('🔍 Vérification en base...')
      const { data: rental, error: checkError } = await supabase
        .from('rentals')
        .select('*')
        .eq('id', result.data.id)
        .single()

      if (checkError) {
        console.error('❌ Erreur vérification:', checkError)
      } else {
        console.log('✅ Rental vérifié en DB:', {
          id: rental.id,
          user_id: rental.user_id,
          rent_id: rental.rent_id,
          phone: rental.phone,
          service_code: rental.service_code,
          country_code: rental.country_code,
          rent_hours: rental.rent_hours,
          end_date: rental.end_date,
          status: rental.status,
          frozen_amount: rental.frozen_amount
        })
      }
    }

  } catch (error) {
    console.error('❌ Erreur test:', error)
    console.error('Stack:', error.stack)
  }
}

testRentalCreation()