console.log('🔍 ANALYSE TRANSACTION WAVE SÉNÉGAL');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const waveTransactionId = 'WAVE-SENEGAL-TX-zVu7I59BTgxsECeslGZE';

console.log(`📄 ID Transaction Wave: ${waveTransactionId}`);

console.log('\n📋 ANALYSE DU FORMAT:');
console.log(`   🆔 ID complet: ${waveTransactionId}`);
console.log(`   📝 Longueur: ${waveTransactionId.length} caractères`);

// Décomposer l'ID
const parts = waveTransactionId.split('-');
console.log(`   �� Parties: ${parts.length}`);
console.log(`   📊 Structure: ${parts.map(p => `${p} (${p.length})`).join(' - ')}`);

console.log('\n🔍 DÉCOMPOSITION:');
if (parts.length >= 4) {
  console.log(`   🌊 Service: ${parts[0]} (Wave)`);
  console.log(`   🇸�� Pays: ${parts[1]} (Sénégal)`);
  console.log(`   💳 Type: ${parts[2]} (Transaction)`);
  console.log(`   🎫 ID unique: ${parts[3]} (${parts[3]?.length || 0} caractères)`);
}

console.log('\n🎯 INFORMATIONS DÉTECTÉES:');
console.log('   ✅ Format Wave Mobile Money reconnu');
console.log('   ✅ Pays: Sénégal');
console.log('   ✅ Service: Wave (Mobile Money)');
console.log('   ✅ Type: Transaction (TX)');

console.log('\n🧪 TESTS POSSIBLES:');

// Test 1: Vérifier si c'est dans les métadonnées PayDunya
console.log('\n1️⃣ RECHERCHE DANS LES TRANSACTIONS PAYDUNYA:');
console.log('   💡 Cette transaction pourrait être liée à un paiement PayDunya...');

// Rechercher les tokens PayDunya récents pour voir si cette référence Wave apparaît
try {
  console.log('   🔍 Test avec les derniers tokens PayDunya créés...');
  
  // Liste des derniers tokens de test qu'on a créés
  const recentTokens = ['D7NxM5yhEOtArVK1c5Am', 'Js7LlgESaAFXjMcBmOjQ'];
  
  for (const token of recentTokens) {
    console.log(`\n   📄 Vérification token: ${token}`);
    
    const response = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`, {
      method: 'GET',
      headers: {
        'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
        'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
        'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   📊 Status: ${result.response_code} - ${result.response_text}`);
      
      // Chercher des références à Wave dans la réponse
      const responseText = JSON.stringify(result);
      if (responseText.includes('WAVE') || responseText.includes('wave') || responseText.includes(parts[3])) {
        console.log('   🎯 POSSIBLE CORRESPONDANCE TROUVÉE !');
        console.log(`   📋 Token PayDunya: ${token}`);
        console.log('   💡 Cette transaction Wave pourrait être liée à ce paiement PayDunya');
      }
    }
  }
  
} catch (error) {
  console.log(`   🚨 Erreur recherche: ${error.message}`);
}

console.log('\n2️⃣ ANALYSE DE L\'ID UNIQUE:');
if (parts[3]) {
  const uniqueId = parts[3];
  console.log(`   🎫 ID unique: ${uniqueId}`);
  console.log(`   📏 Longueur: ${uniqueId.length} caractères`);
  console.log(`   🔤 Format: ${/^[a-zA-Z0-9]+$/.test(uniqueId) ? 'Alphanumérique' : 'Contient caractères spéciaux'}`);
  
  // Essayer de détecter un pattern temporel
  if (uniqueId.length > 10) {
    console.log('   ⏰ ID assez long pour contenir un timestamp encodé');
  }
}

console.log('\n🎯 HYPOTHÈSES:');
console.log('   1. 💳 Paiement Wave Mobile Money au Sénégal');
console.log('   2. 🔄 Probablement lié à un paiement via PayDunya');
console.log('   3. 📱 Transaction effectuée depuis l\'app Wave');
console.log('   4. ✅ Paiement possiblement confirmé côté Wave');
console.log('   5. 💰 Montant et détails dans les systèmes Wave/PayDunya');

console.log('\n📝 RECOMMANDATIONS:');
console.log('   🔍 Vérifier dans votre dashboard PayDunya');
console.log('   📊 Chercher cette référence dans les webhook PayDunya');
console.log('   💾 Consulter les logs de notifications PayDunya');
console.log('   🎫 Vérifier les métadonnées des transactions récentes');
console.log('   📱 Confirmer le statut final du paiement');

console.log('\n🌊 SPÉCIFICITÉS WAVE:');
console.log('   📱 Wave: Service de mobile money populaire au Sénégal');
console.log('   💳 Integration: Via PayDunya comme processeur');
console.log('   🔄 Flow: User Wave → PayDunya → Votre système');
console.log('   ✅ Fiabilité: Wave est un moyen de paiement fiable');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
