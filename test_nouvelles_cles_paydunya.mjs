console.log('�� TEST DES NOUVELLES CLÉS PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Nouvelles clés fournies par l'utilisateur
const NOUVELLES_CLES_PAYDUNYA = {
  master_key: "NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW",
  public_key: "live_public_rbPkH6aQ9epok05sb2k2nGvvqR2", 
  private_key: "live_private_MptaDaAADwpfmUi5rIhi2tP5wFc",
  token: "igh8jsikXdOst2oY85NT"
};

console.log('\n📋 NOUVELLES CLÉS REÇUES:');
console.log(`   🔑 Master Key: ${NOUVELLES_CLES_PAYDUNYA.master_key}`);
console.log(`   🌐 Public Key: ${NOUVELLES_CLES_PAYDUNYA.public_key}`);
console.log(`   🗝️ Private Key: ${NOUVELLES_CLES_PAYDUNYA.private_key}`);
console.log(`   🎫 Token: ${NOUVELLES_CLES_PAYDUNYA.token}`);

console.log('\n🧪 TEST DE VALIDATION...');

try {
  const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': NOUVELLES_CLES_PAYDUNYA.master_key,
      'PAYDUNYA-PRIVATE-KEY': NOUVELLES_CLES_PAYDUNYA.private_key,
      'PAYDUNYA-TOKEN': NOUVELLES_CLES_PAYDUNYA.token,
    },
    body: JSON.stringify({
      invoice: {
        total_amount: 1000,
        description: "Test validation nouvelles clés API - One SMS",
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
  
  console.log(`\n📊 Status HTTP: ${response.status}`);
  console.log(`🔍 Code réponse PayDunya: ${result.response_code}`);
  
  if (response.ok && result.response_code === "00") {
    console.log('\n✅ SUCCÈS ! LES NOUVELLES CLÉS FONCTIONNENT !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📄 Invoice Token: ${result.token}`);
    console.log(`   🔗 URL de paiement: ${result.response_text}`);
    console.log('   🎯 Statut: PayDunya accepte vos nouvelles clés API');
    console.log('   ✅ Prêt pour la mise à jour de la base de données');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('\n❌ ÉCHEC - Problème avec les nouvelles clés');
    console.log(`   🚨 Code erreur: ${result.response_code}`);
    console.log(`   💬 Message: ${result.response_text}`);
    
    if (result.response_code === "1001") {
      console.log('   ⚠️ Master Key toujours invalide');
    } else if (result.response_code === "1002") {
      console.log('   ⚠️ Private Key invalide');
    } else if (result.response_code === "1003") {
      console.log('   ⚠️ Token invalide');
    }
    
    console.log('\n📝 Réponse complète:');
    console.log(JSON.stringify(result, null, 2));
  }

} catch (error) {
  console.error('\n🚨 ERREUR RÉSEAU:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
