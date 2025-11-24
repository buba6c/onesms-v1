// Vérifier directement avec l'API 5sim
import fetch from 'node-fetch';

const API_KEY = process.env.FIVE_SIM_API_KEY || 'your_5sim_api_key_here';

async function test5simAPI() {
  console.log('🔍 Test direct de l\'API 5sim...\n');
  
  if (API_KEY === 'your_5sim_api_key_here') {
    console.log('❌ Erreur: Clé API 5sim non configurée');
    console.log('   Veuillez définir FIVE_SIM_API_KEY dans l\'environnement');
    console.log('\nUsage:');
    console.log('   export FIVE_SIM_API_KEY=votre_cle');
    console.log('   node test_5sim_api.mjs');
    return;
  }

  try {
    // 1. Vérifier le profil
    console.log('1️⃣  Vérification du profil...');
    const profileRes = await fetch('https://5sim.net/v1/user/profile', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!profileRes.ok) {
      throw new Error(`Erreur API: ${profileRes.status} - ${await profileRes.text()}`);
    }
    
    const profile = await profileRes.json();
    console.log('   ✅ Profil OK - Balance:', profile.balance, 'RUB\n');

    // 2. Récupérer l'historique des commandes récentes
    console.log('2️⃣  Récupération de l\'historique des commandes...');
    const ordersRes = await fetch('https://5sim.net/v1/user/orders?category=activation&limit=10&order=id&reverse=true', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!ordersRes.ok) {
      throw new Error(`Erreur API orders: ${ordersRes.status}`);
    }
    
    const ordersData = await ordersRes.json();
    const orders = ordersData.Data || [];
    
    console.log(`   ✅ ${orders.length} commandes récentes trouvées\n`);

    // 3. Chercher le numéro +44 7429215087
    console.log('3️⃣  Recherche du numéro +44 7429215087...');
    const targetNumber = orders.find(o => o.phone === '+447429215087' || o.phone.includes('7429215087'));
    
    if (!targetNumber) {
      console.log('   ⚠️  Numéro non trouvé dans les 10 dernières commandes');
      console.log('\n📋 Liste des dernières commandes:');
      orders.forEach((order, i) => {
        console.log(`\n   ${i+1}. Order ID: ${order.id}`);
        console.log(`      Phone: ${order.phone}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Product: ${order.product}`);
        console.log(`      Created: ${order.created_at}`);
      });
      return;
    }

    // 4. Afficher les détails de la commande
    console.log('\n📱 COMMANDE TROUVÉE !');
    console.log(`   Order ID: ${targetNumber.id}`);
    console.log(`   Phone: ${targetNumber.phone}`);
    console.log(`   Status: ${targetNumber.status}`);
    console.log(`   Product: ${targetNumber.product}`);
    console.log(`   Operator: ${targetNumber.operator}`);
    console.log(`   Price: ${targetNumber.price} RUB`);
    console.log(`   Created: ${targetNumber.created_at}`);
    console.log(`   Expires: ${targetNumber.expires}`);
    
    // 5. Vérifier les SMS reçus
    console.log('\n4️⃣  Vérification des SMS...');
    if (targetNumber.sms && targetNumber.sms.length > 0) {
      console.log(`   ✅ ${targetNumber.sms.length} SMS reçu(s) !\n`);
      targetNumber.sms.forEach((sms, i) => {
        console.log(`   SMS #${i+1}:`);
        console.log(`   - Sender: ${sms.sender || 'N/A'}`);
        console.log(`   - Text: ${sms.text}`);
        console.log(`   - Code: ${sms.code || 'N/A'}`);
        console.log(`   - Date: ${sms.date}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  Aucun SMS reçu sur ce numéro\n');
    }

    // 6. Vérifier le statut actuel via l'API check
    console.log('5️⃣  Vérification du statut actuel...');
    const checkRes = await fetch(`https://5sim.net/v1/user/check/${targetNumber.id}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (!checkRes.ok) {
      throw new Error(`Erreur API check: ${checkRes.status}`);
    }
    
    const checkData = await checkRes.json();
    console.log(`   Status actuel: ${checkData.status}`);
    console.log(`   SMS count: ${checkData.sms?.length || 0}\n`);

    // Diagnostic
    console.log('🔍 DIAGNOSTIC:');
    if (checkData.sms && checkData.sms.length > 0) {
      console.log('   ✅ SMS bien reçu sur 5sim');
      console.log('   ❌ Problème: Le SMS n\'apparaît pas sur votre plateforme');
      console.log('\n   CAUSES POSSIBLES:');
      console.log('   1. Le système de polling ne fonctionne pas');
      console.log('   2. L\'Edge Function check-5sim-sms a une erreur');
      console.log('   3. La mise à jour de la base de données échoue');
      console.log('   4. Le webhook n\'est pas configuré');
    } else {
      console.log('   ℹ️  Aucun SMS reçu sur 5sim non plus');
      console.log('   Status:', checkData.status);
      if (checkData.status === 'TIMEOUT' || checkData.status === 'CANCELED') {
        console.log('   ⚠️  La commande a expiré ou été annulée');
      } else if (checkData.status === 'PENDING') {
        console.log('   ℹ️  En attente de SMS');
      }
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

test5simAPI();
