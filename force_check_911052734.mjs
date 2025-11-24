// Forcer la vérification du SMS pour l'order 911052734
const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
const ORDER_ID = '911052734'

console.log('🔍 Appel de check-5sim-sms pour order', ORDER_ID, '\n')

// Option 1: Avec orderId (l'ancienne méthode)
const requestBody = {
  orderId: ORDER_ID,
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
      
      if (data.data.sms && data.data.sms.length > 0) {
        console.log('\n💬 CODE SMS:', data.data.sms[0].code)
      }
    } else {
      console.log('\n❌ Échec:', data.error)
    }
  } catch (e) {
    console.error('⚠️ Réponse non-JSON')
  }
} catch (error) {
  console.error('❌ Erreur:', error.message)
}
