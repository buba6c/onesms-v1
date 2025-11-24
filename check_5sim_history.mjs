#!/usr/bin/env node

const FIVE_SIM_API_KEY = process.env.FIVE_SIM_API_KEY;

if (!FIVE_SIM_API_KEY) {
  console.error('❌ Erreur: FIVE_SIM_API_KEY non définie');
  process.exit(1);
}

console.log('🔍 Vérification de l\'historique 5sim pour +44 7429215087\n');

async function checkHistory() {
  try {
    // 1. Profil
    console.log('📊 Balance du compte...');
    const profileRes = await fetch('https://5sim.net/v1/user/profile', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    if (profileRes.ok) {
      const profile = await profileRes.json();
      console.log(`✅ Balance: ${profile.balance} RUB`);
      console.log(`   Email: ${profile.email}\n`);
    }

    // 2. Historique des achats
    console.log('📱 Récupération de l\'historique des achats...');
    const historyRes = await fetch('https://5sim.net/v1/user/buy/history', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    if (!historyRes.ok) {
      console.log(`⚠️  Erreur historique: ${historyRes.status}`);
      const errorText = await historyRes.text();
      console.log(`   ${errorText}\n`);
    } else {
      const history = await historyRes.json();
      const historyList = Array.isArray(history) ? history : (history.data || []);
      console.log(`✅ ${historyList.length} entrée(s) trouvée(s)\n`);
      
      // Chercher le numéro
      const targetNumber = '7429215087';
      const matches = historyList.filter(h => h.phone && h.phone.includes(targetNumber));
      
      if (matches.length > 0) {
        console.log(`🎯 ${matches.length} commande(s) trouvée(s):\n`);
        matches.forEach(order => {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`📱 Order #${order.id}`);
          console.log(`   Phone: ${order.phone}`);
          console.log(`   Service: ${order.product}`);
          console.log(`   Country: ${order.country}`);
          console.log(`   Status: ${order.status}`);
          console.log(`   Price: ${order.price} RUB`);
          console.log(`   Created: ${order.created_at}`);
          console.log(`   Expires: ${order.expires}`);
          if (order.sms && order.sms.length > 0) {
            console.log(`\n   📨 SMS reçus:`);
            order.sms.forEach((sms, i) => {
              console.log(`      ${i+1}. ${sms.text || sms.message}`);
              console.log(`         Code: ${sms.code || 'N/A'}`);
            });
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        });
      } else {
        console.log(`⚠️  Numéro non trouvé dans l'historique`);
        console.log(`\n📋 Dernières commandes:`);
        historyList.slice(0, 5).forEach((h, i) => {
          console.log(`   ${i+1}. ID:${h.id} | ${h.phone} | ${h.product} | ${h.status}`);
        });
      }
    }

    // 3. Tenter de chercher directement par plusieurs méthodes
    console.log('\n🔍 Recherche étendue...');
    
    // Essayer l'endpoint purchases
    const purchasesRes = await fetch('https://5sim.net/v1/user/purchases', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    if (purchasesRes.ok) {
      console.log('✅ Accès purchases réussi');
      const purchases = await purchasesRes.json();
      console.log(`   ${JSON.stringify(purchases).substring(0, 200)}...`);
    } else {
      console.log(`⚠️  Purchases: ${purchasesRes.status}`);
    }

    // Liste des activations actives
    const activationsRes = await fetch('https://5sim.net/v1/user/activations', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    if (activationsRes.ok) {
      console.log('✅ Accès activations réussi');
      const activations = await activationsRes.json();
      const actList = Array.isArray(activations) ? activations : (activations.data || []);
      console.log(`   ${actList.length} activation(s) active(s)`);
      
      const matches = actList.filter(a => a.phone && a.phone.includes('7429215087'));
      if (matches.length > 0) {
        console.log('\n🎯 TROUVÉ dans les activations actives!');
        matches.forEach(act => {
          console.log(`   ID: ${act.id}`);
          console.log(`   Phone: ${act.phone}`);
          console.log(`   Status: ${act.status}`);
        });
      }
    } else {
      console.log(`⚠️  Activations: ${activationsRes.status}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkHistory();
