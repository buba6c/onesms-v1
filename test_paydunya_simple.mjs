// Test simple PayDunya sans passer par Supabase
console.log('🧪 TEST PAYDUNYA DIRECT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const PAYDUNYA_CONFIG = {
  master_key: "vtupNxWs-2078-HpbK-9JNo-4U3y0v8g0r1v",
  private_key: "live_private_m7xmzSrVcGu3SYMpwb2z7BbUdft",
  token: "W0uQdlpM2EQLqb3tA33fDJSt7Wk"
};

try {
  console.log('\n📋 Configuration PayDunya:');
  console.log(`   🔑 Master Key: ${PAYDUNYA_CONFIG.master_key.substring(0, 10)}...`);
  console.log(`   🗝️ Private Key: ${PAYDUNYA_CONFIG.private_key.substring(0, 10)}...`);
  console.log(`   🎫 Token: ${PAYDUNYA_CONFIG.token.substring(0, 10)}...`);

  const testPayment = {
    amount: 1000,
    description: "Test payment - 1000 CFA"
  };

  console.log('\n🚀 Test de création de paiement...');
  
  const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': PAYDUNYA_CONFIG.master_key,
      'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_CONFIG.private_key,
      'PAYDUNYA-TOKEN': PAYDUNYA_CONFIG.token,
    },
    body: JSON.stringify({
      invoice: {
        total_amount: testPayment.amount,
        description: testPayment.description,
      },
      store: {
        name: "One SMS",
        tagline: "Service SMS Premium"
      },
      actions: {
        cancel_url: "https://onesms-sn.com/dashboard?payment=failed",
        return_url: "https://onesms-sn.com/dashboard?payment=success",
        callback_url: "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook"
      }
    })
  });

  const result = await response.json();
  
  console.log(`\n📊 Réponse API Status: ${response.status}`);
  
  if (response.ok && result.response_code === "00") {
    console.log('✅ SUCCÈS - Paiement créé !');
    console.log(`   📄 Invoice Token: ${result.token}`);
    console.log(`   🔗 Payment URL: ${result.response_text}`);
    console.log('\n🎯 CONCLUSION: PayDunya fonctionne correctement !');
  } else {
    console.log('❌ ERREUR - Échec création paiement');
    console.log('   📝 Réponse complète:', JSON.stringify(result, null, 2));
    
    if (result.response_code) {
      console.log(`   🚨 Code erreur: ${result.response_code}`);
    }
    if (result.response_text) {
      console.log(`   💬 Message: ${result.response_text}`);
    }
  }

} catch (error) {
  console.error('🚨 ERREUR GÉNÉRALE:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
