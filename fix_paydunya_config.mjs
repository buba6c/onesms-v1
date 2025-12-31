// !! ATTENTION: Ce script utilise une clé SERVICE_ROLE pour écrire dans la base
console.log('🔧 CORRECTION CONFIGURATION PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// On va d'abord simuler la configuration sans modifier la base
const PAYDUNYA_CONFIG_CORRECT = {
  master_key: "vtupNxWs-2078-HpbK-9JNo-4U3y0v8g0r1v",
  private_key: "live_private_m7xmzSrVcGu3SYMpwb2z7BbUdft", 
  token: "W0uQdlpM2EQLqb3tA33fDJSt7Wk",
  mode: "live"
};

console.log('\n🔍 DIAGNOSTIC DES CLÉS PAYDUNYA:');
console.log('   📋 Configuration actuellement utilisée:');
console.log(`   🔑 Master Key: ${PAYDUNYA_CONFIG_CORRECT.master_key}`);
console.log(`   🗝️ Private Key: ${PAYDUNYA_CONFIG_CORRECT.private_key}`);
console.log(`   🎫 Token: ${PAYDUNYA_CONFIG_CORRECT.token}`);
console.log(`   🌐 Mode: ${PAYDUNYA_CONFIG_CORRECT.mode}`);

console.log('\n🧪 Test avec ces clés...');

try {
  const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': PAYDUNYA_CONFIG_CORRECT.master_key,
      'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_CONFIG_CORRECT.private_key,
      'PAYDUNYA-TOKEN': PAYDUNYA_CONFIG_CORRECT.token,
    },
    body: JSON.stringify({
      invoice: {
        total_amount: 500,
        description: "Test validation des clés API",
      },
      store: {
        name: "One SMS Test",
        tagline: "Validation API"
      },
      actions: {
        cancel_url: "https://onesms-sn.com/dashboard?payment=failed",
        return_url: "https://onesms-sn.com/dashboard?payment=success", 
        callback_url: "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook"
      }
    })
  });

  const result = await response.json();
  
  console.log(`\n📊 Status HTTP: ${response.status}`);
  
  if (response.ok && result.response_code === "00") {
    console.log('✅ CLÉS VALIDES - PayDunya fonctionne !');
    console.log(`   📄 Token généré: ${result.token}`);
    console.log(`   🔗 URL paiement: ${result.response_text}`);
    console.log('\n💡 CONCLUSION: Les clés sont correctes, le problème vient de la base de données');
  } else {
    console.log('❌ CLÉS INVALIDES');
    console.log(`   🚨 Code erreur PayDunya: ${result.response_code}`);
    console.log(`   💬 Message: ${result.response_text}`);
    
    if (result.response_code === "1001") {
      console.log('\n🔥 PROBLÈME IDENTIFIÉ: Master Key invalide');
      console.log('   ➡️ Vérifiez votre compte PayDunya');
      console.log('   ➡️ Les clés ont peut-être expiré');
      console.log('   ➡️ Ou le compte est en mode sandbox/live incorrect');
    }
  }

} catch (error) {
  console.error('🚨 ERREUR RÉSEAU:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
