const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('🧪 Test de check-5sim-sms pour l\'activation 892f7a03-734a-455b-b269-e7dfafe44387\n')

const requestBody = {
  activationId: '892f7a03-734a-455b-b269-e7dfafe44387',
  userId: USER_ID
}

console.log('📤 Requête:', JSON.stringify(requestBody, null, 2))

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-5sim-sms`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  console.log('\n📥 Status:', response.status, response.statusText)
  
  const responseText = await response.text()
  console.log('📥 Raw response:', responseText)
  
  try {
    const data = JSON.parse(responseText)
    console.log('📥 Réponse JSON:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('\n✅ Succès!')
      console.log('Status:', data.data.status)
      console.log('SMS:', data.data.sms)
      console.log('Chargé:', data.data.charged)
    } else {
      console.log('\n❌ Échec:', data.error)
    }
  } catch (e) {
    console.error('⚠️ Réponse non-JSON')
  }
} catch (error) {
  console.error('❌ Erreur:', error.message)
}
