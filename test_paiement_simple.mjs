console.log('🔍 VÉRIFICATION PAIEMENT PAYDUNYA (TEST SIMPLE)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n📝 INFORMATIONS IMPORTANTES DÉCOUVERTES:');
console.log('   ⚠️  Montant minimum PayDunya: 200 FCFA');
console.log('   ✅ PayDunya API répond (status 200)');
console.log('   ❌ Notre test précédent: 100 FCFA (trop bas)');

console.log('\n🧪 TEST AVEC MONTANT CORRECT (500 FCFA):');

try {
  const testResponse = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
      'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
      'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
    },
    body: JSON.stringify({
      invoice: {
        total_amount: 500, // Montant valide (≥ 200 FCFA)
        description: "Test paiement OneSMS - 500 FCFA",
      },
      store: {
        name: "OneSMS",
        tagline: "Service SMS Premium"
      },
      actions: {
        cancel_url: "https://google.com",
        return_url: "https://google.com",
        callback_url: "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook"
      }
    })
  });

  const result = await testResponse.json();
  
  console.log(`   📊 Status HTTP: ${testResponse.status}`);
  console.log(`   🔍 Code PayDunya: ${result.response_code}`);
  
  if (testResponse.ok && result.response_code === "00") {
    console.log('\n🎉 SUCCÈS ! PAIEMENT CRÉÉ !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📄 Token PayDunya: ${result.token}`);
    console.log(`   🔗 URL de paiement: ${result.response_text}`);
    console.log('   ✅ Vous pouvez tester ce paiement avec l\'URL ci-dessus');
    console.log('   ⚠️  Les redirections mèneront vers Google (temporaire)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('\n❌ ÉCHEC DU PAIEMENT');
    console.log(`   🚨 Code erreur: ${result.response_code}`);
    console.log(`   💬 Message: ${result.response_text}`);
    
    // Codes d'erreur courants
    if (result.response_code === "4003") {
      console.log('   💡 Montant trop bas (minimum 200 FCFA)');
    } else if (result.response_code === "1001") {
      console.log('   💡 Master Key invalide');
    } else if (result.response_code === "1002") {
      console.log('   💡 Private Key invalide');
    }
  }

} catch (error) {
  console.error('\n🚨 ERREUR RÉSEAU:', error.message);
}

console.log('\n📋 INFORMATIONS POUR VOS TESTS:');
console.log('   💰 Montant minimum: 200 FCFA');
console.log('   💰 Montant recommandé pour tests: 500+ FCFA');
console.log('   🔗 Redirections: Google (temporaire)');
console.log('   🪝 Webhook: Configuré sur Supabase');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
