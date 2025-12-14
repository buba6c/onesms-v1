// Test avec la clé locale
const apiKey = 'd29edd5e1d04c3127d5253d5eAe70de8';

async function test() {
  console.log('🔍 Test avec clé SMS-Activate locale\n');
  
  // 1. Test balance
  console.log('1️⃣ Test solde...');
  const balanceUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getBalance`;
  
  try {
    const res = await fetch(balanceUrl);
    const text = await res.text();
    console.log(`   Résultat: ${text}`);
  } catch (e) {
    console.log(`   ❌ Erreur:`, e.message);
  }
  
  // 2. Test disponibilité WhatsApp Indonesia (6)
  console.log('\n2️⃣ Test disponibilité WhatsApp Indonesia (6)...');
  const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getNumbersStatus&country=6&service=wa`;
  
  try {
    const res = await fetch(statusUrl);
    const text = await res.text();
    // Parser JSON si possible
    try {
      const data = JSON.parse(text);
      console.log(`   Résultat:`, JSON.stringify(data, null, 2).substring(0, 300));
    } catch {
      console.log(`   Résultat brut:`, text.substring(0, 200));
    }
  } catch (e) {
    console.log(`   ❌ Erreur:`, e.message);
  }
  
  // 3. Test achat direct (SIMULATION - ne pas exécuter réellement)
  console.log('\n3️⃣ Test getNumberV2 (WhatsApp, Indonesia)...');
  const buyUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getNumberV2&service=wa&country=6`;
  
  console.log(`   URL: ${buyUrl.replace(apiKey, 'KEY_HIDDEN')}`);
  
  try {
    const res = await fetch(buyUrl);
    const text = await res.text();
    console.log(`   Réponse API:`, text.substring(0, 500));
  } catch (e) {
    console.log(`   ❌ Erreur:`, e.message);
  }
}

test();
