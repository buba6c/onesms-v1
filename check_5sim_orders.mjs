#!/usr/bin/env node

// Script pour vérifier les commandes 5sim et rechercher le numéro +44 7429215087

const FIVE_SIM_API_KEY = process.env.FIVE_SIM_API_KEY;

if (!FIVE_SIM_API_KEY) {
  console.error('❌ Erreur: La variable FIVE_SIM_API_KEY n\'est pas définie');
  console.log('\n💡 Pour exécuter ce script:');
  console.log('   export FIVE_SIM_API_KEY=votre_cle');
  console.log('   node check_5sim_orders.mjs');
  console.log('\n📝 Obtenez votre clé API sur: https://5sim.net/settings/api\n');
  process.exit(1);
}

console.log('🔍 Vérification des commandes 5sim pour le numéro +44 7429215087\n');

async function check5simOrders() {
  try {
    // 1. Vérifier le profil
    console.log('📊 1. Vérification du profil...');
    const profileRes = await fetch('https://5sim.net/v1/user/profile', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    if (!profileRes.ok) {
      console.error(`❌ Erreur profil: ${profileRes.status} ${profileRes.statusText}`);
      const errorText = await profileRes.text();
      console.error(errorText);
      return;
    }
    
    const profile = await profileRes.json();
    console.log(`✅ Balance: ${profile.balance} ${profile.currency}`);
    console.log(`   Email: ${profile.email || 'N/A'}`);
    console.log('');

    // 2. Récupérer les commandes récentes
    console.log('📱 2. Récupération des commandes récentes...');
    const ordersRes = await fetch('https://5sim.net/v1/user/orders', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    if (!ordersRes.ok) {
      console.error(`❌ Erreur commandes: ${ordersRes.status} ${ordersRes.statusText}`);
      return;
    }
    
    const orders = await ordersRes.json();
    const ordersList = Array.isArray(orders) ? orders : orders.data || [];
    
    console.log(`✅ ${ordersList.length} commande(s) trouvée(s)\n`);

    // 3. Rechercher le numéro spécifique
    const targetNumber = '7429215087';
    const matchingOrders = ordersList.filter(order => 
      order.phone && order.phone.includes(targetNumber)
    );

    if (matchingOrders.length === 0) {
      console.log(`⚠️  Aucune commande trouvée pour le numéro contenant ${targetNumber}`);
      console.log('\n📋 Les 10 dernières commandes:');
      ordersList.slice(0, 10).forEach((order, i) => {
        console.log(`   ${i + 1}. ID: ${order.id} | Phone: ${order.phone} | Status: ${order.status} | Product: ${order.product}`);
      });
    } else {
      console.log(`🎯 ${matchingOrders.length} commande(s) trouvée(s) pour ${targetNumber}:\n`);
      
      for (const order of matchingOrders) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📱 Commande #${order.id}`);
        console.log(`   Téléphone: ${order.phone}`);
        console.log(`   Service: ${order.product}`);
        console.log(`   Pays: ${order.country}`);
        console.log(`   Opérateur: ${order.operator}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Prix: ${order.price} RUB`);
        console.log(`   Créée: ${order.created_at || 'N/A'}`);
        console.log(`   Expire: ${order.expires || 'N/A'}`);
        
        // Vérifier les SMS reçus
        if (order.sms && order.sms.length > 0) {
          console.log(`\n   📨 ${order.sms.length} SMS reçu(s):`);
          order.sms.forEach((sms, idx) => {
            console.log(`      SMS ${idx + 1}:`);
            console.log(`         Texte: ${sms.text || sms.message || 'N/A'}`);
            console.log(`         Code: ${sms.code || 'N/A'}`);
            console.log(`         Date: ${sms.date || sms.created_at || 'N/A'}`);
          });
        } else {
          console.log(`\n   ⏳ Aucun SMS reçu pour cette commande`);
        }
        
        // Vérifier le statut détaillé via check endpoint
        console.log(`\n   🔍 Vérification détaillée...`);
        const checkRes = await fetch(`https://5sim.net/v1/user/check/${order.id}`, {
          headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
        });
        
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          console.log(`   Status API: ${checkData.status}`);
          if (checkData.sms && checkData.sms.length > 0) {
            console.log(`   SMS via Check: ${checkData.sms[checkData.sms.length - 1].text}`);
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

check5simOrders();
