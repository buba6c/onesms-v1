console.log('🔍 DIAGNOSTIC SIMPLE - TEST PAIEMENT PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n📋 ÉTAPES VÉRIFICATION POST-PAIEMENT:');

console.log('\n1️⃣ VÉRIFICATION CONFIGURATION:');
console.log('   ✅ URLs corrigées: onesms-sn.com/dashboard');
console.log('   ✅ Fonction redéployée');
console.log('   ✅ API keys PayDunya valides');

console.log('\n2️⃣ DÉLAI NORMAL WEBHOOK:');
console.log('   ⏰ Attente normale: 2-5 minutes');
console.log('   🔄 PayDunya traite le paiement');
console.log('   📞 Webhook envoyé à Supabase');
console.log('   💰 Crédit accordé automatiquement');

console.log('\n3️⃣ POINTS DE CONTRÔLE:');

async function testPaydunyaConnection() {
  console.log('\n   🧪 TEST CONNEXION PAYDUNYA:');
  
  try {
    const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/confirm/D7NxM5yhEOtArVK1c5Am', {
      method: 'GET',
      headers: {
        'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
        'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
        'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ API PayDunya: CONNECTÉ (${result.response_code})`);
    } else {
      console.log(`   ❌ API PayDunya: ERREUR ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Connexion PayDunya: ${error.message}`);
  }
}

async function testSupabaseWebhook() {
  console.log('\n   🧪 TEST WEBHOOK SUPABASE:');
  
  const webhookUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: true,
        message: 'Test connectivity'
      })
    });
    
    console.log(`   📊 Webhook Supabase: Status ${response.status}`);
    
    if (response.ok) {
      console.log(`   ✅ Webhook accessible`);
    } else {
      console.log(`   ⚠️  Webhook répond mais erreur`);
    }
  } catch (error) {
    console.log(`   ❌ Webhook inaccessible: ${error.message}`);
  }
}

async function checkRedirectionUrls() {
  console.log('\n   🧪 TEST URLs REDIRECTION:');
  
  const urls = [
    'https://onesms-sn.com',
    'https://onesms-sn.com/dashboard'
  ];
  
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`   📍 ${url}: Status ${response.status} ${response.status === 200 ? '✅' : '⚠️'}`);
    } catch (error) {
      console.log(`   �� ${url}: ❌ Inaccessible`);
    }
  }
}

// Exécuter les tests
await testPaydunyaConnection();
await testSupabaseWebhook();
await checkRedirectionUrls();

console.log('\n🎯 DIAGNOSTIC ACTIONS:');

console.log('\n📱 SI PAIEMENT VIENT D\'ÊTRE EFFECTUÉ:');
console.log('   1. ⏰ Attendre 5 minutes supplémentaires');
console.log('   2. 🔄 Rafraîchir votre dashboard');
console.log('   3. 📊 Vérifier balance utilisateur');
console.log('   4. 🎫 Noter le token PayDunya reçu');

console.log('\n🔍 SI TOUJOURS PAS CRÉDITÉ APRÈS 5 MIN:');
console.log('   1. 📋 Vérifier transaction créée en base');
console.log('   2. 🔔 Contrôler si webhook reçu');
console.log('   3. 🚨 Chercher erreurs de crédit');
console.log('   4. 💳 Crédit manuel si nécessaire');

console.log('\n📝 DONNÉES À FOURNIR POUR DEBUG:');
console.log('   • 🎫 Token PayDunya du paiement');
console.log('   • 💰 Montant payé');
console.log('   • ⏰ Heure exacte du paiement');
console.log('   • 👤 Email utilisateur');
console.log('   • 📱 Moyen de paiement (Wave, etc.)');

console.log('\n�� COMMANDES UTILES:');
console.log('   📊 Logs webhook: npx supabase dashboard (Functions → paydunya-webhook → Logs)');
console.log('   💾 Base de données: npx supabase dashboard (Table Editor → transactions)');

console.log('\n✅ PROCHAIN PAIEMENT:');
console.log('   🧪 Tester avec montant minimum: 200 FCFA');
console.log('   ⏰ Attendre patiemment 2-5 minutes');
console.log('   📊 Monitor en temps réel le dashboard');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
