// Test direct API SMS-Activate
const apiKey = 'd29edd5e1d04c3127d5253d5eAe70de8';
const baseUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';

// Services populaires à tester
const services = [
  { code: 'wa', name: 'WhatsApp' },
  { code: 'tg', name: 'Telegram' },
  { code: 'go', name: 'Google' },
  { code: 'ig', name: 'Instagram' },
  { code: 'fb', name: 'Facebook' }
];

// Pays populaires à tester
const countries = [
  { id: 6, name: 'Indonesia' },
  { id: 22, name: 'India' },
  { id: 187, name: 'USA' },
  { id: 12, name: 'England' },
  { id: 15, name: 'Poland' },
  { id: 0, name: 'Russia' },
  { id: 4, name: 'Philippines' }
];

async function checkAvailability() {
  console.log('🔍 VÉRIFICATION DISPONIBILITÉ API SMS-ACTIVATE\n');
  console.log('='.repeat(70));
  
  for (const service of services) {
    console.log(`\n📱 ${service.name} (${service.code}):`);
    console.log('-'.repeat(50));
    
    for (const country of countries) {
      const url = `${baseUrl}?api_key=${apiKey}&action=getNumbersStatus&country=${country.id}&service=${service.code}`;
      
      try {
        const res = await fetch(url);
        const text = await res.text();
        
        let count = 0;
        try {
          const data = JSON.parse(text);
          // Format: { "wa_0": 1234 } ou { "wa": 1234 }
          count = data[`${service.code}_0`] || data[service.code] || 0;
        } catch {
          // Réponse non-JSON
          if (text.includes('NO_NUMBERS')) count = 0;
        }
        
        const status = count > 0 ? '✅' : '❌';
        console.log(`   ${status} ${country.name.padEnd(15)} : ${count} numéros`);
        
      } catch (e) {
        console.log(`   ⚠️ ${country.name.padEnd(15)} : Erreur - ${e.message}`);
      }
    }
  }
  
  // Test achat simulé (sans vraiment acheter)
  console.log('\n\n🧪 TEST PRIX EN TEMPS RÉEL:');
  console.log('='.repeat(70));
  
  const priceUrl = `${baseUrl}?api_key=${apiKey}&action=getPrices&service=wa&country=6`;
  const priceRes = await fetch(priceUrl);
  const priceData = await priceRes.json();
  console.log('\nPrix WhatsApp Indonesia:', JSON.stringify(priceData, null, 2));
}

checkAvailability();
