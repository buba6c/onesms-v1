const SMS_API_KEY = '93b8A0d90d8A72f27f5ce65A9d5e60f7';
const RENT_ID = '30918188';

async function check() {
  console.log('🔍 Vérification API SMS-Activate...\n');
  
  // Test continueRentInfo
  const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=continueRentInfo&id=${RENT_ID}&hours=4`;
  const res = await fetch(url);
  const text = await res.text();
  console.log('Response:', text);
  
  try {
    const json = JSON.parse(text);
    console.log('Parsed:', JSON.stringify(json, null, 2));
    console.log('\nMessage:', json.message);
  } catch {
    console.log('Non-JSON response');
  }
}

check();
