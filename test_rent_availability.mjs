const SMS_ACTIVATE_API_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY;

console.log('🌍 Test de disponibilité RENT par pays...\n');

const countries = [
  { id: 0, name: 'Russie' },
  { id: 1, name: 'Ukraine' },
  { id: 15, name: 'Pologne' },
  { id: 22, name: 'Inde' },
  { id: 6, name: 'Indonésie' },
  { id: 10, name: 'Vietnam' },
  { id: 187, name: 'USA' }
];

for (const country of countries) {
  try {
    const url = `https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentNumber&service=full&country=${country.id}&rent_time=4`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'success') {
      console.log(`✅ ${country.name}: SUCCESS!`);
      console.log(`   Phone: ${data.phone?.number}`);
      console.log(`   ID: ${data.phone?.id}`);
      console.log(`   Expires: ${data.phone?.endDate}`);
      
      // Cancel immediately to not waste money
      const cancelUrl = `https://api.sms-activate.org/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${data.phone.id}&status=2`;
      await fetch(cancelUrl);
      console.log(`   🔄 Annulé pour test\n`);
      break; // Stop at first success
    } else if (data.message === 'NO_BALANCE') {
      console.log(`💰 ${country.name}: NO_BALANCE`);
    } else if (data.message === 'NO_NUMBERS') {
      console.log(`❌ ${country.name}: NO_NUMBERS`);
    } else {
      console.log(`⚠️  ${country.name}: ${data.message}`);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (error) {
    console.log(`❌ ${country.name}: ERROR -`, error.message);
  }
}

console.log('\n📊 Test terminé');
