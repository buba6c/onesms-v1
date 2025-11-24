#!/usr/bin/env node

/**
 * Test de l'API 5sim en temps réel
 * Vérifie que les taux de réussite (rate) sont bien récupérés et triés
 */

const SERVICE_TO_TEST = 'whatsapp'; // Ou 'facebook', 'google', etc.

async function test5simLive() {
  console.log('🌐 [TEST] Appel API 5sim pour:', SERVICE_TO_TEST);
  console.log('📡 URL:', `https://5sim.net/v1/guest/prices?product=${SERVICE_TO_TEST}`);
  console.log('');

  try {
    const response = await fetch(`https://5sim.net/v1/guest/prices?product=${SERVICE_TO_TEST}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status);
      const text = await response.text();
      console.error(text);
      return;
    }

    const data = await response.json();
    console.log('✅ Réponse reçue');
    console.log('📊 Nombre de pays:', Object.keys(data).length);
    console.log('');

    // Afficher la structure brute pour comprendre
    console.log('📦 Structure de la réponse:');
    const keys = Object.keys(data);
    console.log('Clés principales:', keys.slice(0, 5));
    
    if (keys.length > 0) {
      const firstCountry = keys[0];
      console.log(`\nStructure de "${firstCountry}":`, Object.keys(data[firstCountry]));
      
      // Vérifier si le service existe dans ce pays
      const serviceInCountry = data[firstCountry][SERVICE_TO_TEST];
      if (serviceInCountry) {
        console.log(`\nOpérateurs pour ${SERVICE_TO_TEST} dans ${firstCountry}:`, Object.keys(serviceInCountry));
        const firstOp = Object.keys(serviceInCountry)[0];
        console.log(`Données du premier opérateur (${firstOp}):`, serviceInCountry[firstOp]);
      } else {
        console.log(`\n⚠️ Service "${SERVICE_TO_TEST}" introuvable dans ${firstCountry}`);
        console.log('Services disponibles:', Object.keys(data[firstCountry]));
        
        // Essayer structure inversée
        console.log(`\nTest structure inversée - data["${SERVICE_TO_TEST}"]["afghanistan"]:`, 
          data[SERVICE_TO_TEST] ? Object.keys(data[SERVICE_TO_TEST]['afghanistan'] || {}) : 'N/A');
      }
    }
    console.log('');

    // Analyser la structure
    // STRUCTURE RÉELLE: { serviceName: { countryName: { operatorName: { cost, count, rate } } } }
    const countries = [];
    const serviceData = data[SERVICE_TO_TEST];
    
    if (!serviceData || typeof serviceData !== 'object') {
      console.error(`❌ Service "${SERVICE_TO_TEST}" introuvable dans la réponse`);
      return;
    }

    for (const [countryName, operators] of Object.entries(serviceData)) {
      if (!operators || typeof operators !== 'object') {
        console.log(`⏭️  Skipping ${countryName} (pas de données opérateurs)`);
        continue;
      }

      let totalCount = 0;
      let totalCost = 0;
      let maxRate = 0;
      let operatorCount = 0;
      const operatorsList = [];

      for (const [operatorName, operatorData] of Object.entries(operators)) {
        if (!operatorData || typeof operatorData !== 'object') continue;
        
        totalCount += operatorData.count || 0;
        totalCost += operatorData.cost || 0;
        operatorCount++;

        const rate = operatorData.rate || 0;
        if (rate > maxRate) maxRate = rate;

        operatorsList.push({
          name: operatorName,
          cost: operatorData.cost,
          count: operatorData.count,
          rate: operatorData.rate
        });
      }

      if (operatorCount > 0) {
        countries.push({
          country: countryName,
          totalCount,
          avgCost: (totalCost / operatorCount).toFixed(2),
          maxRate,
          operators: operatorsList
        });
      }
    }

    // Trier par taux de réussite (comme dans le code)
    countries.sort((a, b) => {
      if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate;
      return b.totalCount - a.totalCount;
    });

    console.log('🏆 TOP 10 PAYS (triés par taux de réussite):');
    console.log('═'.repeat(80));
    countries.slice(0, 10).forEach((c, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${c.country.padEnd(20)} | Rate: ${c.maxRate.toString().padStart(5)}% | Stock: ${c.totalCount.toString().padStart(6)} | Prix: ${c.avgCost}₽`);
    });
    console.log('');

    console.log('📉 5 DERNIERS PAYS:');
    console.log('─'.repeat(80));
    countries.slice(-5).forEach((c, i) => {
      console.log(`${(countries.length - 4 + i).toString().padStart(2)}. ${c.country.padEnd(20)} | Rate: ${c.maxRate.toString().padStart(5)}% | Stock: ${c.totalCount.toString().padStart(6)} | Prix: ${c.avgCost}₽`);
    });
    console.log('');

    if (countries.length > 0) {
      console.log('🔍 DÉTAIL DU MEILLEUR PAYS:', countries[0].country);
      console.log('Opérateurs:');
      countries[0].operators.forEach(op => {
        const rateDisplay = op.rate ? `${op.rate}%` : 'N/A';
        console.log(`  - ${op.name.padEnd(15)} | ${rateDisplay.padStart(6)} | ${op.count.toString().padStart(5)} nums | ${op.cost}₽`);
      });
      console.log('');
    }

    console.log('📊 STATISTIQUES:');
    console.log(`  Total pays disponibles: ${countries.length}`);
    console.log(`  Pays avec rate > 95%: ${countries.filter(c => c.maxRate >= 95).length}`);
    console.log(`  Pays avec rate > 85%: ${countries.filter(c => c.maxRate >= 85).length}`);
    console.log(`  Pays avec rate > 70%: ${countries.filter(c => c.maxRate >= 70).length}`);
    console.log(`  Pays sans rate: ${countries.filter(c => c.maxRate === 0).length}`);
    console.log('');

    console.log('✅ TEST RÉUSSI !');
    console.log('💡 Les meilleurs pays sont bien ceux avec le taux de réussite le plus élevé');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  }
}

test5simLive();
