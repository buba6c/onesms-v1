import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 TEST: Activation complète avec un utilisateur réel\n')

async function testActivation() {
  // 1. Se connecter avec un utilisateur de test
  console.log('1️⃣  Connexion utilisateur...\n')
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@onesms.test',
    password: 'admin123'
  })
  
  if (authError) {
    console.error('❌ Échec connexion:', authError.message)
    return
  }
  
  console.log('✅ Connecté:', authData.user.email)
  console.log('   User ID:', authData.user.id)
  console.log('   Session token:', authData.session.access_token.slice(0, 20) + '...')
  
  // 2. Vérifier le solde
  const { data: userData } = await supabase
    .from('users')
    .select('balance')
    .eq('id', authData.user.id)
    .single()
  
  console.log(`\n💰 Solde: ${userData?.balance || 0} FCFA`)
  
  if (!userData || userData.balance < 20) {
    console.log('\n⚠️  Solde insuffisant, ajout de 1000 FCFA...')
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: 1000 })
      .eq('id', authData.user.id)
    
    if (updateError) {
      console.error('❌ Échec mise à jour solde:', updateError.message)
      return
    }
    
    console.log('✅ Solde mis à jour: 1000 FCFA')
  }
  
  // 3. Chercher un service disponible en Indonesia
  console.log('\n\n2️⃣  Recherche service disponible en Indonesia...\n')
  
  const { data: rules } = await supabase
    .from('pricing_rules')
    .select('service_code, country_code, activation_price, available_count')
    .eq('country_code', 'indonesia')
    .eq('active', true)
    .gt('available_count', 0)
    .order('available_count', { ascending: false })
    .limit(5)
  
  if (!rules || rules.length === 0) {
    console.error('❌ Aucun service disponible en Indonesia')
    return
  }
  
  console.log('Services disponibles:')
  rules.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.service_code}: ${r.activation_price} FCFA (${r.available_count} dispos)`)
  })
  
  const selectedRule = rules[0]
  console.log(`\n✅ Sélectionné: ${selectedRule.service_code} (${selectedRule.activation_price} FCFA)`)
  
  // 4. Appeler la fonction buy-sms-activate-number
  console.log('\n\n3️⃣  Activation du numéro...\n')
  
  const requestBody = {
    country: selectedRule.country_code,
    operator: 'any',
    product: selectedRule.service_code,
    userId: authData.user.id
  }
  
  console.log('Request:', requestBody)
  
  try {
    const { data: buyData, error: buyError } = await supabase.functions.invoke('buy-sms-activate-number', {
      body: requestBody,
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    })
    
    console.log('\n📥 Réponse:')
    console.log('   Data:', JSON.stringify(buyData, null, 2))
    console.log('   Error:', buyError)
    
    if (buyError) {
      console.error('\n❌ ERREUR:', buyError.message)
      
      // Essayer de lire le body de l'erreur
      if (buyError.context) {
        console.log('\n📋 Context:', buyError.context)
      }
      
      return
    }
    
    if (!buyData || !buyData.success) {
      console.error('\n❌ Activation échouée:', buyData?.error || 'Unknown error')
      return
    }
    
    console.log('\n✅ SUCCÈS ! Numéro activé:')
    console.log(`   Phone: ${buyData.data.phone}`)
    console.log(`   Activation ID: ${buyData.data.activation_id}`)
    console.log(`   Status: ${buyData.data.status}`)
    console.log(`   Expires: ${buyData.data.expires}`)
    
    // 5. Vérifier que l'activation est dans la DB
    console.log('\n\n4️⃣  Vérification dans la DB...\n')
    
    const { data: activations } = await supabase
      .from('activations')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (activations && activations.length > 0) {
      console.log('✅ Activation trouvée dans la DB:')
      console.log(`   ID: ${activations[0].id}`)
      console.log(`   Phone: ${activations[0].phone}`)
      console.log(`   Status: ${activations[0].status}`)
      console.log(`   Service: ${activations[0].service_code}`)
    } else {
      console.log('❌ Activation NON trouvée dans la DB')
    }
    
  } catch (error) {
    console.error('\n❌ EXCEPTION:', error)
  }
  
  // 6. Déconnexion
  console.log('\n\n5️⃣  Déconnexion...\n')
  await supabase.auth.signOut()
  console.log('✅ Déconnecté')
}

testActivation().catch(console.error)
