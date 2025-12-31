const SMS_API_KEY = '93b8A0d90d8A72f27f5ce65A9d5e60f7';

// ID de la location active connue de l'analyse précédente
const RENT_ID = '30918188';

async function testRentDirect() {
  console.log('🔍 Test direct de l\'API SMS-Activate...\n');
  
  // Test getRentStatus
  console.log(`🔄 Test getRentStatus (ID: ${RENT_ID}):`);
  const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getRentStatus&id=${RENT_ID}`;
  console.log('URL:', statusUrl.replace(SMS_API_KEY, 'XXXX'));
  const statusRes = await fetch(statusUrl);
  const statusText = await statusRes.text();
  console.log(`Response: ${statusText}\n`);
  
  // Test continueRentInfo with 4h
  console.log(`💰 Test continueRentInfo (4h):`);
  const info4Url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=continueRentInfo&id=${RENT_ID}&hours=4`;
  const info4Res = await fetch(info4Url);
  const info4Text = await info4Res.text();
  console.log(`Response: ${info4Text}\n`);
  
  // Test continueRentInfo with 1h
  console.log(`💰 Test continueRentInfo (1h):`);
  const info1Url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=continueRentInfo&id=${RENT_ID}&hours=1`;
  const info1Res = await fetch(info1Url);
  const info1Text = await info1Res.text();
  console.log(`Response: ${info1Text}\n`);
  
  // Get account balance
  console.log(`💵 Vérification solde SMS-Activate:`);
  const balanceUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getBalance`;
  const balanceRes = await fetch(balanceUrl);
  const balanceText = await balanceRes.text();
  console.log(`Response: ${balanceText}\n`);
}

testRentDirect().catch(console.error);
