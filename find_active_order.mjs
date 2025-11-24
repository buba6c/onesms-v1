#!/usr/bin/env node

const FIVE_SIM_API_KEY = process.env.FIVE_SIM_API_KEY;

if (!FIVE_SIM_API_KEY) {
  console.error('❌ FIVE_SIM_API_KEY non définie');
  process.exit(1);
}

console.log('🔍 Recherche des commandes actives 5sim...\n');

async function searchActiveOrders() {
  try {
    // Selon la doc 5sim, pour voir les commandes il faut utiliser l'endpoint orders avec category
    // Essayons avec category=activation
    console.log('📋 Tentative 1: /user/orders?category=activation');
    let response = await fetch('https://5sim.net/v1/user/orders?category=activation', {
      headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
    });
    
    let html = await response.text();
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      console.log('❌ Échec (probablement Cloudflare)\n');
      
      // Essayons une autre méthode: chercher dans les prix récents
      console.log('📋 Tentative 2: Analyse du profil...');
      const profileRes = await fetch('https://5sim.net/v1/user/profile', {
        headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
      });
      
      if (profileRes.ok) {
        const profile = await profileRes.json();
        console.log('✅ Profil récupéré:');
        console.log(`   Total active orders: ${profile.total_active_orders}`);
        console.log(`   Last order: ${profile.last_order}`);
        console.log(`   Last top orders: ${profile.last_top_orders}`);
        console.log(`   Frozen balance: ${profile.frozen_balance} RUB\n`);
        
        // Extraire l'order_id de last_top_orders
        // Format: "england:google:virtual51:98132:28.00"
        if (profile.last_top_orders) {
          const parts = profile.last_top_orders.replace('{', '').replace('}', '').split(':');
          if (parts.length >= 4) {
            const orderId = parts[3];
            console.log(`🎯 Order ID trouvé: ${orderId}\n`);
            
            // Récupérer les détails de cette commande
            console.log('📱 Récupération des détails de la commande...');
            const orderRes = await fetch(`https://5sim.net/v1/user/check/${orderId}`, {
              headers: { 'Authorization': `Bearer ${FIVE_SIM_API_KEY}` }
            });
            
            if (orderRes.ok) {
              const order = await orderRes.json();
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log(`📱 Commande #${order.id}`);
              console.log(`   Phone: ${order.phone}`);
              console.log(`   Service: ${order.product}`);
              console.log(`   Country: ${order.country}`);
              console.log(`   Operator: ${order.operator}`);
              console.log(`   Status: ${order.status}`);
              console.log(`   Price: ${order.price} RUB`);
              console.log(`   Created: ${order.created_at}`);
              console.log(`   Expires: ${order.expires}`);
              
              if (order.sms && order.sms.length > 0) {
                console.log(`\n   📨 ${order.sms.length} SMS reçu(s):`);
                order.sms.forEach((sms, i) => {
                  console.log(`      ${i+1}. Texte: ${sms.text}`);
                  console.log(`         Code: ${sms.code || 'N/A'}`);
                  console.log(`         Date: ${sms.date}`);
                });
              } else {
                console.log(`\n   ⏳ Aucun SMS reçu pour cette commande`);
              }
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              
              // Vérifier si c'est le bon numéro
              if (order.phone && order.phone.includes('7455944076')) {
                console.log('🎯 TROUVÉ ! C\'est le numéro +447455944076');
                console.log(`\n💡 Vous devez maintenant l'ajouter à votre base de données.`);
                console.log(`   Order ID: ${order.id}`);
                console.log(`   Phone: ${order.phone}`);
              }
            } else {
              console.log(`❌ Impossible de récupérer les détails: ${orderRes.status}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

searchActiveOrders();
