import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 Vérification de l\'activation 892f7a03-734a-455b-b269-e7dfafe44387\n')

// Récupérer l'activation
const { data: activation, error } = await supabase
  .from('activations')
  .select('*')
  .eq('id', '892f7a03-734a-455b-b269-e7dfafe44387')
  .single()

if (error) {
  console.error('❌ Erreur:', error)
} else {
  console.log('📋 Activation en DB:')
  console.log(JSON.stringify(activation, null, 2))
  console.log('\n📊 Statut:', activation.status)
  console.log('📱 Téléphone:', activation.phone_number)
  console.log('💬 SMS:', activation.sms_code)
  console.log('💰 Chargé:', activation.charged)
  console.log('🔢 Order ID:', activation.order_id)
  console.log('⏰ Expire à:', activation.expires_at)
}

// Vérifier directement sur 5sim
console.log('\n🌐 Vérification sur 5sim...')
const FIVE_SIM_API_KEY = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjkzMDA1MjYsImlhdCI6MTczNzc2NDUyNiwicmF5IjoiZWRiZmQ2MmM2NWU4NjI0ZmI0ZjYwZmQwYzA3MzkyM2UiLCJzdWIiOjIzMTA4MjJ9.V7mH56jX3TI5M-gUZwxzkk0S1mOHe-n8yVdYH7bT8W3Z9wYPcMwi-U5rTnBHX0J8tP36-wd41kLt6lWSZELXkGBwQnuuGbFQa8uq-IpVUJX1JqtNVQm1-WC-mRuOLSEg2GVXPw5jsBgTxeXv5nT0Fg75k4d7m3hO4R3-Fc5XGBXlXp_90Q3JnuDBFQSj-d-HuhWiH6N8CdO4TQBdMhFxqnGJlIz17Pj53tgPxULzZyHOzn2gCfJCqjGMxzMSUEWHkfTWQ5T-Bpn1z3I-s8QbWXzQDlA-gZgjZpxfRsNZqMgB8-WVZZ8chMlUo_xyvEO7-A4F9A1TrG3o9E9Qlw'

try {
  const response = await fetch(`https://5sim.net/v1/user/check/911052734`, {
    headers: {
      'Authorization': `Bearer ${FIVE_SIM_API_KEY}`,
      'Accept': 'application/json'
    }
  })
  
  const data = await response.json()
  console.log('\n📡 Réponse 5sim:')
  console.log(JSON.stringify(data, null, 2))
} catch (error) {
  console.error('❌ Erreur 5sim:', error.message)
}
