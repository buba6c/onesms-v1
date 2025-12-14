import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 VÉRIFICATION CONFIGURATION PAYDUNYA PRODUCTION\n');

// 1. Récupérer la configuration PayDunya
const { data: providers, error: listError } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'paydunya');

if (listError) {
  console.error('❌ Erreur:', listError.message);
  process.exit(1);
}

console.log(`📋 ${providers?.length || 0} PayDunya trouvé(s)\n`);

const paydunya = providers?.[0];
const error = null;

if (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}

if (!paydunya) {
  console.error('❌ PayDunya non trouvé dans payment_providers');
  process.exit(1);
}

console.log('📋 Configuration PayDunya:\n');
console.log(`   Nom: ${paydunya.provider_name}`);
console.log(`   Actif: ${paydunya.is_active ? '✅ OUI' : '❌ NON'}`);
console.log(`   Par défaut: ${paydunya.is_default ? '⭐ OUI' : '❌ NON'}`);

if (!paydunya.config) {
  console.error('\n❌ Aucune configuration trouvée');
  process.exit(1);
}

const { master_key, private_key, token, mode } = paydunya.config;

console.log(`\n🔑 Clés API:`);
console.log(`   Master Key: ${master_key ? '✅ Configuré' : '❌ Manquant'}`);
console.log(`   Private Key: ${private_key ? '✅ Configuré' : '❌ Manquant'}`);
console.log(`   Token: ${token ? '✅ Configuré' : '❌ Manquant'}`);
console.log(`   Mode: ${mode || 'non défini'}`);

if (!master_key || !private_key || !token) {
  console.error('\n❌ Clés API manquantes!');
  process.exit(1);
}

// 2. Tester l'API PayDunya directement
console.log('\n🧪 TEST DIRECT API PAYDUNYA...\n');

const apiUrl = mode === 'live' 
  ? 'https://app.paydunya.com/api/v1/checkout-invoice/create'
  : 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create';

console.log(`📡 Endpoint: ${apiUrl}`);
console.log(`🔐 Mode: ${mode.toUpperCase()}\n`);

const testData = {
  invoice: {
    total_amount: 100,
    description: "Test PayDunya Production - ONE SMS"
  },
  store: {
    name: "ONE SMS",
    tagline: "Réception SMS en ligne",
    phone: "+221771234567",
    logo_url: "https://onesms-sn.com/logo.png",
    website_url: "https://onesms-sn.com"
  },
  custom_data: {
    test: true,
    timestamp: Date.now()
  },
  actions: {
    cancel_url: "https://onesms-sn.com/cancel",
    return_url: "https://onesms-sn.com/success",
    callback_url: "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook"
  }
};

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': master_key,
      'PAYDUNYA-PRIVATE-KEY': private_key,
      'PAYDUNYA-TOKEN': token
    },
    body: JSON.stringify(testData)
  });

  const result = await response.json();

  console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

  if (response.ok) {
    console.log('✅ SUCCÈS! PayDunya répond correctement\n');
    console.log('📨 Réponse PayDunya:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.response_code === '00') {
      console.log('\n🎉 TEST RÉUSSI!');
      console.log(`🔗 URL de paiement: ${result.response_text}`);
      console.log(`🎫 Token: ${result.token}`);
      console.log('\n✅ Les clés PayDunya PRODUCTION sont valides et fonctionnelles!');
    } else {
      console.log('\n⚠️  Réponse inattendue:', result);
    }
  } else {
    console.log('❌ ERREUR API PayDunya\n');
    console.log('📄 Réponse:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.response_text?.includes('invalid') || result.response_text?.includes('credentials')) {
      console.log('\n❌ Les clés API sont INVALIDES!');
      console.log('Vérifie les clés dans ton dashboard PayDunya.');
    }
  }
} catch (err) {
  console.error('\n❌ Erreur lors du test:', err.message);
}
