console.log('🧪 TEST PAYDUNYA AVEC URLS GOOGLE TEMPORAIRES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n🎯 OBJECTIF DU TEST:');
console.log('   💡 Isoler le problème: URLs vs Clés API');
console.log('   �� URLs simplifiées: google.com (domaine fiable)');
console.log('   💡 Si ça marche = problème était les URLs');
console.log('   💡 Si ça échoue = problème sont les clés API');

console.log('\n🔧 CONFIGURATION ACTUELLE:');
console.log('   🔗 cancel_url: https://google.com');
console.log('   🔗 return_url: https://google.com'); 
console.log('   🔗 callback_url: webhook Supabase (inchangé)');

try {
  console.log('\n🚀 Test direct des clés PayDunya...');
  
  const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
      'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
      'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
    },
    body: JSON.stringify({
      invoice: {
        total_amount: 500,
        description: "Test URLs Google - OneSMS",
      },
      store: {
        name: "OneSMS Test",
        tagline: "Test avec URLs Google"
      },
      actions: {
        cancel_url: "https://google.com",
        return_url: "https://google.com",
        callback_url: "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook"
      }
    })
  });

  const result = await response.json();
  
  console.log(`\n📊 Status HTTP: ${response.status}`);
  console.log(`🔍 Code PayDunya: ${result.response_code}`);
  
  if (response.ok && result.response_code === "00") {
    console.log('\n🎉 SUCCÈS AVEC URLs GOOGLE !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📄 Token: ${result.token}`);
    console.log(`   🔗 URL: ${result.response_text}`);
    console.log('   💡 DIAGNOSTIC: Le problème était probablement les URLs de votre site');
    console.log('   🎯 SOLUTION: Vérifier la configuration des URLs dans PayDunya');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('\n❌ ÉCHEC MÊME AVEC Google URLs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   🚨 Code erreur: ${result.response_code}`);
    console.log(`   💬 Message: ${result.response_text}`);
    console.log('   �� DIAGNOSTIC: Le problème sont definitiment les clés API');
    console.log('   🎯 SOLUTION: Contacter tech@paydunya.com URGEMMENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

} catch (error) {
  console.error('\n🚨 ERREUR RÉSEAU:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
