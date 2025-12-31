console.log('🔍 RECHERCHE AVANCÉE TRANSACTION WAVE DANS PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const waveTransactionId = 'WAVE-SENEGAL-TX-zVu7I59BTgxsECeslGZE';
const uniqueId = 'zVu7I59BTgxsECeslGZE';

console.log(`📄 ID Transaction Wave: ${waveTransactionId}`);
console.log(`🎫 ID unique à rechercher: ${uniqueId}`);

// Configuration PayDunya
const config = {
  masterKey: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
  privateKey: 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
  token: 'igh8jsikXdOst2oY85NT'
};

console.log('\n🔍 RECHERCHE DANS L\'HISTORIQUE PAYDUNYA:');

// Fonction pour vérifier un token PayDunya
async function checkPaydunyaToken(token, label = '') {
  try {
    console.log(`\n   📄 Test ${label}: ${token}`);
    
    const response = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`, {
      method: 'GET',
      headers: {
        'PAYDUNYA-MASTER-KEY': config.masterKey,
        'PAYDUNYA-PRIVATE-KEY': config.privateKey,
        'PAYDUNYA-TOKEN': config.token,
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   📊 Status: ${result.response_code} - ${result.response_text}`);
      
      // Afficher les détails de la transaction
      if (result.response_code === '00' && result.invoice) {
        const invoice = result.invoice;
        console.log(`   💰 Montant: ${invoice.total_amount}`);
        console.log(`   📱 Status: ${invoice.status}`);
        console.log(`   📅 Date: ${new Date(invoice.created_at).toLocaleString()}`);
        
        // Chercher des références Wave
        const fullResponse = JSON.stringify(result, null, 2);
        
        // Vérifications multiples
        const checks = [
          { name: 'WAVE complet', found: fullResponse.includes('WAVE-SENEGAL-TX-zVu7I59BTgxsECeslGZE') },
          { name: 'ID unique', found: fullResponse.includes('zVu7I59BTgxsECeslGZE') },
          { name: 'WAVE général', found: fullResponse.includes('WAVE') },
          { name: 'wave minuscule', found: fullResponse.includes('wave') },
          { name: 'SENEGAL', found: fullResponse.includes('SENEGAL') },
          { name: 'Transaction ref', found: fullResponse.includes('transaction_id') }
        ];
        
        let foundMatch = false;
        checks.forEach(check => {
          if (check.found) {
            console.log(`   🎯 ${check.name}: ✅ TROUVÉ`);
            foundMatch = true;
          }
        });
        
        if (foundMatch) {
          console.log('\n   🎉 CORRESPONDANCE POSSIBLE DÉTECTÉE !');
          console.log('   📋 Détails de la réponse:');
          
          // Afficher les parties pertinentes
          if (invoice.receipt_url) {
            console.log(`   🧾 Receipt URL: ${invoice.receipt_url}`);
          }
          
          if (invoice.customer) {
            console.log(`   👤 Client: ${invoice.customer.name || 'N/A'} - ${invoice.customer.phone || 'N/A'}`);
          }
          
          if (invoice.actions) {
            console.log(`   🔄 Actions disponibles: ${Object.keys(invoice.actions).join(', ')}`);
          }
          
          // Chercher dans les custom_data
          if (invoice.custom_data) {
            console.log(`   📊 Custom Data: ${JSON.stringify(invoice.custom_data)}`);
          }
          
          return true;
        }
      }
      
      return false;
    } else {
      console.log(`   ❌ Erreur HTTP: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   🚨 Erreur: ${error.message}`);
    return false;
  }
}

// Liste étendue de tokens récents à vérifier
const tokensToCheck = [
  { token: 'D7NxM5yhEOtArVK1c5Am', label: 'Token récent 1' },
  { token: 'Js7LlgESaAFXjMcBmOjQ', label: 'Token récent 2' },
  // Ajouter d'autres tokens si disponibles
];

// Test avec différents formats possibles de l'ID
const possibleSearchTerms = [
  'zVu7I59BTgxsECeslGZE',
  'WAVE-SENEGAL-TX-zVu7I59BTgxsECeslGZE',
  'zVu7I59BTgxsECeslGZE'.toLowerCase(),
  'wave-senegal-tx-zvu7i59btgxseceslgze'
];

console.log('\n🔍 VÉRIFICATION DES TOKENS RÉCENTS:');

for (const tokenInfo of tokensToCheck) {
  const found = await checkPaydunyaToken(tokenInfo.token, tokenInfo.label);
  if (found) {
    console.log(`\n🎉 TRANSACTION WAVE TROUVÉE DANS LE TOKEN: ${tokenInfo.token}`);
    break;
  }
  
  // Pause entre les requêtes
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n2️⃣ TENTATIVE DE RECHERCHE DIRECTE:');
// Essayer de chercher directement par l'ID Wave (bien que ce ne soit pas standard)
try {
  console.log(`   🔍 Test recherche directe: ${uniqueId}`);
  
  const directResponse = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${uniqueId}`, {
    method: 'GET',
    headers: {
      'PAYDUNYA-MASTER-KEY': config.masterKey,
      'PAYDUNYA-PRIVATE-KEY': config.privateKey,
      'PAYDUNYA-TOKEN': config.token,
    }
  });
  
  console.log(`   📊 Response status: ${directResponse.status}`);
  
  if (directResponse.ok) {
    const result = await directResponse.json();
    console.log(`   📋 Résultat: ${result.response_code} - ${result.response_text}`);
  }
} catch (error) {
  console.log(`   🚨 Erreur recherche directe: ${error.message}`);
}

console.log('\n📝 ANALYSE FINALE:');
console.log('   🎯 Cette transaction Wave a un format standard');
console.log('   💳 Elle devrait apparaître dans les métadonnées PayDunya');
console.log('   🔍 Si non trouvée, vérifier:');
console.log('     • Les webhooks PayDunya récents');
console.log('     • Le dashboard PayDunya directement');
console.log('     • Les logs de votre application');
console.log('     • Les notifications push/email PayDunya');

console.log('\n🚀 ACTIONS RECOMMANDÉES:');
console.log('   1. 📊 Vérifier le dashboard PayDunya pour des transactions récentes');
console.log('   2. 🔔 Chercher des notifications PayDunya avec cette référence');
console.log('   3. 💾 Examiner les logs de webhook de votre serveur');
console.log('   4. 📱 Contacter l\'utilisateur pour confirmer le paiement Wave');
console.log('   5. 🎫 Vérifier si le paiement est en attente de confirmation');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
