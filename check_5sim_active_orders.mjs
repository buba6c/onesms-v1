// Vérifier les commandes actives sur 5sim et récupérer les SMS reçus

const API_KEY = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Njk0NDQ5NDksImlhdCI6MTczNzkwODk0OSwicmF5IjoiYjEyYmU1YjE1M2FiOTNiMjBkZmFjNzZkMTUzMzVjODEiLCJzdWIiOjM2MTM4MDl9.hBiWgjYhwEj9xYfBa0sCKKaLcZMqQwzshF-cXWYfH1wOaQWQtVBZNYjVQB6aF4A-NpLG-p1nMFfVE0-pYYQgj28kCgYLdM__zTRkKNBWZTOZRJ1DWgdBGmBj3OdcVm_R3QRbzmcxoGGlIQZ1C1-VGQJgxqB-lV8Q7GWK-uGDSLRpNWcKIj76C19R6-VYOgAp6p84q7g1SY-YY16oqEgzLBcxLcbH-lj-_K_FwRcMO0DPKr_Ku3iFzKR1Xm_Y_TS4JHBLeTR9eZmEq1N4n04kGc5o1XaOmjfYHzY3YIX_pTPxwmpbmUaD3uRJGkSCc3J3jE0_RdQZJEqjWs2IqQ';

console.log('🔍 Récupération des commandes actives sur 5sim...\n');

try {
  // Récupérer le profil pour voir les commandes actives
  const profileResponse = await fetch('https://5sim.net/v1/user/profile', {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!profileResponse.ok) {
    console.error('❌ Erreur profil:', profileResponse.status, profileResponse.statusText);
    process.exit(1);
  }

  const profile = await profileResponse.json();
  console.log('👤 Profil:');
  console.log('  Email:', profile.email);
  console.log('  Solde:', profile.balance, 'RUB');
  console.log('  Commandes actives:', profile.total_active_orders);
  console.log('  Dernières commandes:', profile.last_top_orders);
  console.log('');

  if (profile.total_active_orders === 0) {
    console.log('⚠️ Aucune commande active');
    process.exit(0);
  }

  // Parser les IDs des dernières commandes
  // Format: "{england:google:virtual51:98132:28.00}"
  const ordersText = profile.last_top_orders;
  const orderMatches = ordersText.matchAll(/(\d+):/g);
  const orderIds = [...orderMatches].map(m => m[1]);

  console.log('📋 IDs de commandes trouvés:', orderIds);
  console.log('');

  // Vérifier chaque commande
  for (const orderId of orderIds) {
    console.log(`🔍 Vérification de la commande ${orderId}...`);
    
    const checkResponse = await fetch(`https://5sim.net/v1/user/check/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!checkResponse.ok) {
      console.log(`  ❌ Erreur: ${checkResponse.status} ${checkResponse.statusText}`);
      const errorText = await checkResponse.text();
      console.log(`  Détails:`, errorText);
      console.log('');
      continue;
    }

    const order = await checkResponse.json();
    console.log(`  ✅ Commande trouvée:`);
    console.log(`  ID:`, order.id);
    console.log(`  Téléphone:`, order.phone);
    console.log(`  Service:`, order.product);
    console.log(`  Pays:`, order.country);
    console.log(`  Opérateur:`, order.operator);
    console.log(`  Status:`, order.status);
    console.log(`  Prix:`, order.price, 'RUB');
    console.log(`  Créé:`, order.created_at);
    console.log(`  Expire:`, order.expires);
    
    if (order.sms && order.sms.length > 0) {
      console.log(`  📨 SMS reçus (${order.sms.length}):`);
      order.sms.forEach((sms, i) => {
        console.log(`    ${i + 1}. Code: ${sms.code || 'N/A'}`);
        console.log(`       Texte: ${sms.text || 'N/A'}`);
        console.log(`       Date: ${sms.created_at}`);
      });
    } else {
      console.log(`  ⏳ Aucun SMS reçu`);
    }
    console.log('');
  }

  // Essayer aussi avec les numéros spécifiques mentionnés
  const specificNumbers = ['447455944076', '447429215087'];
  console.log('🔍 Recherche des numéros spécifiques...\n');

  for (const number of specificNumbers) {
    console.log(`Recherche de +${number}...`);
    
    // Essayer de trouver via l'historique (limité à 100 dernières)
    const historyResponse = await fetch('https://5sim.net/v1/user/orders', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (historyResponse.ok) {
      const history = await historyResponse.json();
      const found = history.data?.find(order => order.phone.replace(/\D/g, '') === number);
      
      if (found) {
        console.log(`  ✅ Trouvé dans l'historique:`);
        console.log(`  ID:`, found.id);
        console.log(`  Status:`, found.status);
        if (found.sms && found.sms.length > 0) {
          console.log(`  📨 SMS: Code = ${found.sms[0].code}`);
        }
      } else {
        console.log(`  ⚠️ Non trouvé dans l'historique`);
      }
    }
    console.log('');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.error(error.stack);
}
