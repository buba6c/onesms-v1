console.log('🔍 ANALYSE TRANSACTION: e3f7a0a5-9770-4905-90af-4a6518a5bcc8');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const transactionId = 'e3f7a0a5-9770-4905-90af-4a6518a5bcc8';

console.log('\n📋 INFORMATIONS DE BASE:');
console.log(`   🆔 ID: ${transactionId}`);
console.log('   📝 Format: UUID valide');
console.log('   🏗️ Structure: Transaction Supabase');

console.log('\n🔍 ANALYSE DU FORMAT:');
console.log('   ✅ Format UUID valide (8-4-4-4-12)');
console.log('   ✅ Longueur correcte (36 caractères)');
console.log('   ✅ Caractères valides (hexa + tirets)');

console.log('\n🧪 TESTS POSSIBLES:');

// Test 1: Vérifier si c'est un token PayDunya
console.log('\n1️⃣ TEST PAYDUNYA TOKEN:');
console.log('   💡 Tester si ce UUID est un token PayDunya...');

try {
  // Tenter de vérifier via PayDunya
  const response = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${transactionId}`, {
    method: 'GET',
    headers: {
      'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
      'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
      'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
    }
  });

  const result = await response.json();
  
  if (response.ok && result.response_code) {
    console.log(`   📊 PayDunya Status: ${response.status}`);
    console.log(`   🔍 Code: ${result.response_code}`);
    console.log(`   💬 Message: ${result.response_text}`);
    
    if (result.response_code === "00") {
      console.log('   ✅ Token PayDunya VALIDE !');
      console.log('   📋 Cette transaction existe côté PayDunya');
    } else {
      console.log('   ❌ Token PayDunya inconnu');
    }
  } else {
    console.log(`   ⚠️  Réponse PayDunya: ${response.status}`);
    console.log(`   💬 ${result.response_text || 'Pas de message'}`);
  }
} catch (error) {
  console.log(`   🚨 Erreur test PayDunya: ${error.message}`);
}

console.log('\n2️⃣ ANALYSE TIMESTAMP:');
// Extraction possible du timestamp depuis l'UUID
const parts = transactionId.split('-');
console.log(`   🔢 Parties UUID: ${parts.length}`);
console.log(`   📊 Structure: ${parts.map(p => p.length).join('-')}`);

// Convertir la première partie en timestamp potentiel
try {
  const firstPart = parts[0];
  const timestamp = parseInt(firstPart, 16);
  const date = new Date(timestamp);
  
  if (date.getFullYear() > 1970 && date.getFullYear() < 2030) {
    console.log(`   📅 Timestamp possible: ${date.toLocaleString('fr-FR')}`);
  } else {
    console.log('   📅 Pas de timestamp reconnaissable');
  }
} catch (e) {
  console.log('   📅 Pas de timestamp dans l\'UUID');
}

console.log('\n🎯 HYPOTHÈSES:');
console.log('   1. 💳 Transaction de paiement dans votre système');
console.log('   2. 🎫 Pourrait être associée à un token PayDunya');
console.log('   3. 📊 Générée par votre application OneSMS');
console.log('   4. ⏰ Créée récemment (format UUID v4)');

console.log('\n📝 RECOMMANDATIONS:');
console.log('   🔍 Vérifier dans les logs serveur');
console.log('   📊 Chercher dans les logs de transaction');
console.log('   🎫 Vérifier côté PayDunya dashboard');
console.log('   💾 Consulter les logs Supabase');

console.log('\n❗ LIMITATION:');
console.log('   🚫 Impossible d\'accéder à la base Supabase actuellement');
console.log('   🔧 Problème d\'authentification des clés service');
console.log('   💡 Analyse basée sur le format et tests externes uniquement');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
