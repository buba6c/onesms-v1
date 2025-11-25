import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2Nzg3NTksImV4cCI6MjA0NzI1NDc1OX0.1qUF2YzJKYN2FxVU61bEFpU2xJh0-FS0Gok_f3nPTd4'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Test de tous les services avec get-top-countries-by-service\n')

// Tous les services depuis service-codes.ts
const allServices = [
  'whatsapp', 'telegram', 'google', 'instagram', 'facebook', 'twitter',
  'tiktok', 'viber', 'wechat', 'vk', 'microsoft', 'yahoo', 'mailru',
  'aol', 'yandex', 'snapchat', 'discord', 'reddit', 'linkedin', 'line',
  'uber', 'bolt', 'careem', 'lyft', 'grab', 'amazon', 'ebay', 'aliexpress',
  'shopee', 'lazada', 'paypal', 'skrill', 'neteller', 'revolut', 'wise',
  'binance', 'coinbase', 'kraken', 'okx', 'bybit', 'tinder', 'badoo',
  'bumble', 'hinge', 'okcupid', 'pof', 'match', 'meetic', 'signal',
  'threema', 'telegram_premium', 'imo', 'kakaotalk', 'zalo', 'momo'
]

const errors = []
const successes = []
const empty = []

for (const service of allServices) {
  try {
    const { data, error } = await supabase.functions.invoke('get-top-countries-by-service', {
      body: { service }
    })
    
    if (error) {
      errors.push({ service, error: error.message })
      console.log(`❌ ${service}: ${error.message}`)
    } else if (data.countries && data.countries.length === 0) {
      empty.push(service)
      console.log(`⚠️  ${service}: No countries available`)
    } else {
      successes.push(service)
      console.log(`✅ ${service}: ${data.countries.length} pays`)
    }
  } catch (err) {
    errors.push({ service, error: err.message })
    console.log(`❌ ${service}: ${err.message}`)
  }
  
  // Pause pour ne pas surcharger l'API
  await new Promise(resolve => setTimeout(resolve, 500))
}

console.log('\n📊 RÉSUMÉ:')
console.log(`✅ Succès: ${successes.length}/${allServices.length}`)
console.log(`⚠️  Vides: ${empty.length}/${allServices.length}`)
console.log(`❌ Erreurs: ${errors.length}/${allServices.length}`)

if (errors.length > 0) {
  console.log('\n❌ SERVICES EN ERREUR:')
  errors.forEach(({ service, error }) => {
    console.log(`   - ${service}: ${error}`)
  })
}

if (empty.length > 0) {
  console.log('\n⚠️  SERVICES VIDES (pas de pays disponibles):')
  empty.forEach(service => console.log(`   - ${service}`))
}
