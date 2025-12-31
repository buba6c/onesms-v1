console.log('🔍 ANALYSE TRANSACTION BUBA6C - 71149a7d');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const transactionData = {
  id: '71149a7d-0db...',
  user: 'buba6c (buba6c@gmail.com)',
  user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
  amount: 500,
  activations: 5,
  status: 'En attente',
  provider: 'PayDunya',
  date: 'lundi 15 décembre 2025 à 14:00',
  paydunya_token: 'Dbm7kuNTe8Vo1fzcFeD2',
  paydunya_url: 'https://paydunya.com/checkout/invoice/Dbm7kuNTe8Vo1fzcFeD2'
};

console.log('📊 DONNÉES TRANSACTION:');
console.log(`   🆔 ID: ${transactionData.id}`);
console.log(`   👤 Utilisateur: ${transactionData.user}`);
console.log(`   💰 Montant: ${transactionData.amount} FCFA`);
console.log(`   💳 Activations: ${transactionData.activations}`);
console.log(`   📱 Status: ${transactionData.status}`);
console.log(`   📅 Date: ${transactionData.date}`);
console.log(`   🎫 Token PayDunya: ${transactionData.paydunya_token}`);

console.log('\n🎯 DIAGNOSTIC:');
console.log('   📋 Status "En attente" = Webhook PayDunya non reçu');
console.log('   ⏰ Créé il y a environ 15 minutes');
console.log('   🚨 DÉLAI ANORMALEMENT LONG (> 10 minutes)');

console.log('\n🧪 TEST TOKEN PAYDUNYA:');

async function testPaydunyaToken() {
  try {
    console.log(`\n   �� Vérification token: ${transactionData.paydunya_token}`);
    
    const response = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${transactionData.paydunya_token}`, {
      method: 'GET',
      headers: {
        'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
        'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
        'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   📊 API Status: ${result.response_code} - ${result.response_text}`);
      
      if (result.response_code === '00' && result.invoice) {
        const invoice = result.invoice;
        
        console.log('\n   📋 DÉTAILS PAIEMENT PAYDUNYA:');
        console.log(`      💰 Montant: ${invoice.total_amount} (attendu: 500)`);
        console.log(`      📱 Status: ${invoice.status || 'N/A'}`);
        console.log(`      📅 Créé: ${invoice.created_at ? new Date(invoice.created_at).toLocaleString() : 'N/A'}`);
        console.log(`      🏷️  Description: ${invoice.description || 'N/A'}`);
        
        // Analyser le statut PayDunya
        if (invoice.status === 'completed') {
          console.log('\n   ✅ PAIEMENT CONFIRMÉ CÔTÉ PAYDUNYA!');
          console.log('   🚨 PROBLÈME: Webhook non envoyé ou non reçu');
          
          if (invoice.receipt_url) {
            console.log(`   🧾 Reçu: ${invoice.receipt_url}`);
          }
          
          return 'completed';
        } else if (invoice.status === 'pending') {
          console.log('\n   ⏰ PAIEMENT EN ATTENTE CÔTÉ PAYDUNYA');
          console.log('   💡 Utilisateur n\'a peut-être pas finalisé le paiement');
          return 'pending';
        } else {
          console.log(`\n   ⚠️  STATUT PAYDUNYA: ${invoice.status}`);
          return invoice.status;
        }
      } else {
        console.log(`\n   ❌ ERREUR PAYDUNYA: ${result.response_text}`);
        return 'error';
      }
    } else {
      console.log(`   ❌ Erreur HTTP: ${response.status}`);
      return 'http_error';
    }
  } catch (error) {
    console.log(`   🚨 Erreur requête: ${error.message}`);
    return 'network_error';
  }
}

// Tester le token
const paydunyaStatus = await testPaydunyaToken();

console.log('\n🎯 SOLUTIONS BASÉES SUR LE DIAGNOSTIC:');

if (paydunyaStatus === 'completed') {
  console.log('\n✅ SOLUTION #1: CRÉDIT MANUEL IMMÉDIAT');
  console.log('   🎯 Paiement confirmé mais webhook manqué');
  console.log('   💳 Créditer manuellement via RPC');
  console.log('   🔧 Transaction ID: 71149a7d-0db...');
  console.log('   🎫 Token: Dbm7kuNTe8Vo1fzcFeD2');
  console.log('   👤 User: e108c02a-2012-4043-bbc2-fb09bb11f824');
  console.log('   💰 Crédits: 5 activations');
  
  console.log('\n🚀 COMMANDE CRÉDIT MANUEL:');
  console.log('   1. Accéder au dashboard Supabase');
  console.log('   2. SQL Editor → Nouvelle requête');
  console.log('   3. Exécuter RPC secure_moneyfusion_credit_v2');
  
} else if (paydunyaStatus === 'pending') {
  console.log('\n⏰ SOLUTION #2: ATTENDRE FINALISATION');
  console.log('   📱 Paiement pas encore confirmé côté PayDunya');
  console.log('   👤 Utilisateur doit compléter le paiement');
  console.log('   🔗 URL paiement: ' + transactionData.paydunya_url);
  console.log('   💡 Renvoyer le lien à l\'utilisateur si nécessaire');
  
} else {
  console.log('\n🚨 SOLUTION #3: INVESTIGATION APPROFONDIE');
  console.log('   ❌ Problème technique détecté');
  console.log('   📊 Vérifier logs PayDunya côté merchant');
  console.log('   🔍 Contacter support PayDunya si nécessaire');
}

console.log('\n🔄 WEBHOOK ANALYSIS:');
console.log('   🔗 Webhook URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook');
console.log('   📋 URLs redirection: ✅ Corrigées (onesms-sn.com)');
console.log('   ⏰ Délai anormal: > 10 minutes');

if (paydunyaStatus === 'completed') {
  console.log('\n💡 THÉORIES WEBHOOK MANQUÉ:');
  console.log('   1. 📡 PayDunya n\'a pas envoyé le webhook');
  console.log('   2. 🌐 Problème réseau temporaire');
  console.log('   3. ⚡ Fonction Supabase indisponible momentanément');
  console.log('   4. 🔧 Erreur interne dans le webhook handler');
}

console.log('\n📝 ACTIONS IMMÉDIATES:');
console.log('   1. �� Confirmer statut PayDunya ci-dessus');
console.log('   2. 💳 Crédit manuel si paiement confirmé');
console.log('   3. 📊 Vérifier balance utilisateur après crédit');
console.log('   4. 🔍 Investiguer pourquoi webhook manqué');
console.log('   5. 📈 Monitoring renforcé pour futures transactions');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
