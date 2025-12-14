#!/usr/bin/env node
/**
 * 🧪 TEST DIRECT PAYDUNYA API
 * Teste l'API PayDunya directement sans passer par Supabase
 */

const PAYDUNYA_CONFIG = {
  master_key: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
  private_key: 'test_private_c7KkCGiFSBjGGlK59kaM87dUXKa',
  token: 'w8wLEciWYNOm6tmWNEDI',
  mode: 'test'
};

console.log('🚀 TEST DIRECT API PAYDUNYA\n');
console.log('Mode:', PAYDUNYA_CONFIG.mode);
console.log('Master Key:', PAYDUNYA_CONFIG.master_key.substring(0, 10) + '...\n');

async function testPayDunyaAPI() {
  // Préparer les données de paiement
  const paymentData = {
    invoice: {
      total_amount: 1000,
      description: 'Test ONE SMS - 1000 FCFA'
    },
    store: {
      name: 'ONE SMS',
      tagline: 'Réception SMS en ligne',
      phone: '+221 77 123 45 67',
      logo_url: 'https://onesms-sn.com/logo.png',
      website_url: 'https://onesms-sn.com'
    },
    custom_data: {
      transaction_id: 'TEST-' + Date.now(),
      user_id: 'test-user'
    },
    actions: {
      cancel_url: 'https://onesms-sn.com/topup?payment=cancel',
      return_url: 'https://onesms-sn.com/dashboard?payment=success',
      callback_url: 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook'
    }
  };

  console.log('📝 Données de paiement:');
  console.log(JSON.stringify(paymentData, null, 2));
  console.log('');

  // URL de l'API selon le mode
  const apiUrl = PAYDUNYA_CONFIG.mode === 'live'
    ? 'https://app.paydunya.com/api/v1/checkout-invoice/create'
    : 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create';

  console.log('🔗 Appel API:', apiUrl);
  console.log('');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_CONFIG.master_key,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_CONFIG.private_key,
        'PAYDUNYA-TOKEN': PAYDUNYA_CONFIG.token
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📊 Status:', response.status, response.statusText);
    console.log('');

    const result = await response.json();

    console.log('📨 Réponse PayDunya:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (result.response_code === '00') {
      console.log('✅ SUCCÈS! Paiement créé');
      console.log('');
      console.log('🎫 Token:', result.token);
      console.log('🔗 URL de paiement:', result.response_text);
      console.log('');
      console.log('📝 Pour tester le paiement:');
      console.log('1. Ouvre cette URL dans ton navigateur:');
      console.log('   ' + result.response_text);
      console.log('');
      console.log('2. Utilise un compte client test PayDunya');
      console.log('   (voir documentation PayDunya pour créer un client fictif)');
      console.log('');
    } else {
      console.error('❌ ERREUR PayDunya:');
      console.error('Code:', result.response_code);
      console.error('Message:', result.response_text);
      console.log('');
      console.log('💡 Vérifications:');
      console.log('- Les clés API sont-elles correctes?');
      console.log('- Le mode test est-il activé sur PayDunya?');
      console.log('- L\'application est-elle bien configurée?');
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error);
  }
}

testPayDunyaAPI();
