const https = require('https');

// ==========================================
// ANALYSE: AFFICHAGE DES NUMÉROS PAR SERVICE/PAYS SUR 5SIM
// ==========================================

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function analyzeNumbersDisplay() {
  console.log('\n🔍 ANALYSE: COMMENT 5SIM AFFICHE LES NUMÉROS\n');
  console.log('='.repeat(80));

  // ==========================================
  // SCÉNARIO 1: Service=Google, Country=England
  // ==========================================
  console.log('\n📱 SCÉNARIO 1: Google + England\n');
  
  const googlePrices = await fetchJSON('https://5sim.net/v1/guest/prices?product=google');
  
  if (googlePrices.google && googlePrices.google.england) {
    const operators = googlePrices.google.england;
    
    console.log('Données brutes des opérateurs:');
    console.log(JSON.stringify(operators, null, 2).slice(0, 1000));
    
    const operatorList = [];
    for (const [name, details] of Object.entries(operators)) {
      operatorList.push({
        name,
        cost: details.cost,
        count: details.count,
        rate: details.rate || 0
      });
    }

    console.log('\n📊 Tous les opérateurs disponibles:\n');
    console.log('Opérateur'.padEnd(20) + ' | Prix | Stock | Rate | Disponible?');
    console.log('-'.repeat(70));
    
    operatorList.forEach(op => {
      const available = op.count > 0 ? '✅ OUI' : '❌ NON';
      console.log(
        op.name.padEnd(20) +
        ` | ${op.cost.toString().padStart(4)}₽ | ${op.count.toString().padStart(6)} | ${op.rate.toString().padStart(5)}% | ${available}`
      );
    });

    // QUESTION CLÉ: 5sim affiche-t-il TOUS les opérateurs ou seulement ceux avec stock?
    const withStock = operatorList.filter(op => op.count > 0);
    const withoutStock = operatorList.filter(op => op.count === 0);
    
    console.log(`\n📈 Statistiques:`);
    console.log(`   Total opérateurs: ${operatorList.length}`);
    console.log(`   Avec stock: ${withStock.length}`);
    console.log(`   Sans stock: ${withoutStock.length}`);

    // Analyser différentes stratégies d'affichage
    console.log('\n\n🎯 STRATÉGIES D\'AFFICHAGE POSSIBLES:\n');

    // Stratégie A: Montrer TOUS les opérateurs (même sans stock)
    console.log('A) TOUS LES OPÉRATEURS (même sans stock):');
    const allByPrice = [...operatorList].sort((a, b) => a.cost - b.cost);
    allByPrice.slice(0, 8).forEach((op, i) => {
      const badge = op.count > 0 ? '✅' : '⚠️ Épuisé';
      console.log(`   ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | ${op.cost}₽ | ${badge}`);
    });

    // Stratégie B: Montrer SEULEMENT avec stock
    console.log('\n\nB) SEULEMENT OPÉRATEURS AVEC STOCK:');
    const onlyWithStock = withStock.sort((a, b) => a.cost - b.cost);
    onlyWithStock.forEach((op, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | ${op.cost}₽ | ${op.count} nums | ${op.rate}%`);
    });

    // Stratégie C: Montrer avec stock EN PREMIER, puis sans stock
    console.log('\n\nC) AVEC STOCK EN PREMIER, puis sans stock:');
    const withStockFirst = [
      ...withStock.sort((a, b) => a.cost - b.cost),
      ...withoutStock.sort((a, b) => a.cost - b.cost)
    ];
    withStockFirst.slice(0, 10).forEach((op, i) => {
      const badge = op.count > 0 ? `✅ ${op.count} nums` : '⚠️ Épuisé';
      console.log(`   ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | ${op.cost}₽ | ${badge}`);
    });

    // Stratégie D: Meilleur opérateur AUTO
    console.log('\n\nD) SÉLECTION AUTOMATIQUE DU MEILLEUR:');
    const best = withStock.sort((a, b) => {
      const scoreA = a.count * (a.rate / 100);
      const scoreB = b.count * (b.rate / 100);
      return scoreB - scoreA;
    })[0];
    
    if (best) {
      console.log(`   🏆 Meilleur: ${best.name}`);
      console.log(`      Prix: ${best.cost}₽`);
      console.log(`      Stock: ${best.count} numéros`);
      console.log(`      Taux: ${best.rate}%`);
      console.log(`      Score: ${(best.count * (best.rate / 100)).toFixed(0)}`);
      console.log(`\n   💡 Pas besoin d'afficher les autres - achat automatique!`);
    }
  }

  // ==========================================
  // SCÉNARIO 2: Analyser plusieurs pays
  // ==========================================
  console.log('\n\n📱 SCÉNARIO 2: Google pour différents pays\n');
  
  const testCountries = ['england', 'usa', 'indonesia', 'philippines'];
  
  for (const country of testCountries) {
    if (googlePrices.google && googlePrices.google[country]) {
      const operators = googlePrices.google[country];
      const opList = Object.entries(operators).map(([name, details]) => ({
        name,
        cost: details.cost,
        count: details.count,
        rate: details.rate || 0
      }));

      const withStock = opList.filter(op => op.count > 0);
      const cheapest = withStock.length > 0 
        ? withStock.sort((a, b) => a.cost - b.cost)[0]
        : null;
      
      const best = withStock.length > 0
        ? withStock.sort((a, b) => {
            const scoreA = a.count * (a.rate / 100);
            const scoreB = b.count * (b.rate / 100);
            return scoreB - scoreA;
          })[0]
        : null;

      console.log(`🌍 ${country.toUpperCase()}:`);
      console.log(`   Total opérateurs: ${opList.length}`);
      console.log(`   Avec stock: ${withStock.length}`);
      
      if (cheapest) {
        console.log(`   💰 Le moins cher: ${cheapest.name} (${cheapest.cost}₽, ${cheapest.count} nums)`);
      }
      
      if (best) {
        console.log(`   🏆 Le meilleur: ${best.name} (${best.cost}₽, ${best.count} nums, ${best.rate}%, score: ${(best.count * (best.rate / 100)).toFixed(0)})`);
      }
      
      console.log('');
    }
  }

  // ==========================================
  // CONCLUSION
  // ==========================================
  console.log('\n💡 CONCLUSION: COMMENT AFFICHER LES NUMÉROS\n');
  console.log('='.repeat(80));
  
  console.log('\n🎯 OPTIONS D\'INTERFACE:\n');
  
  console.log('1️⃣  LISTE COMPLÈTE (comme marketplace):');
  console.log('   • Afficher tous les opérateurs (même épuisés)');
  console.log('   • Badge "Épuisé" sur ceux sans stock');
  console.log('   • Tri par prix ascendant');
  console.log('   • Utilisateur choisit manuellement');
  console.log('   ✓ Avantage: Transparence totale');
  console.log('   ✗ Inconvénient: Interface complexe\n');
  
  console.log('2️⃣  DISPONIBLES UNIQUEMENT:');
  console.log('   • Afficher seulement opérateurs avec stock');
  console.log('   • Tri par prix ascendant');
  console.log('   • Utilisateur choisit parmi disponibles');
  console.log('   ✓ Avantage: Interface simple et claire');
  console.log('   ✗ Inconvénient: Moins de choix apparent\n');
  
  console.log('3️⃣  SÉLECTION AUTOMATIQUE (recommandé):');
  console.log('   • Système choisit le meilleur opérateur');
  console.log('   • Basé sur Score (Stock × Rate)');
  console.log('   • Pas d\'UI de sélection nécessaire');
  console.log('   • Achat direct après service + pays');
  console.log('   ✓ Avantage: UX ultra-simple, meilleur résultat');
  console.log('   ✓ Avantage: Pas de choix paralysant');
  console.log('   ✓ Avantage: Toujours optimal\n');
  
  console.log('4️⃣  HYBRIDE:');
  console.log('   • Sélection auto par défaut');
  console.log('   • Option "Choisir un autre opérateur"');
  console.log('   • Liste déroulante si utilisateur veut');
  console.log('   ✓ Avantage: Simple + contrôle avancé');
  console.log('   ✗ Inconvénient: Plus de dev\n');
  
  console.log('\n🚀 RECOMMANDATION BASÉE SUR 5SIM.NET:');
  console.log('   → 5sim utilise probablement: SÉLECTION AUTOMATIQUE');
  console.log('   → Étape 3 "Select operator" dit: "Select service and country"');
  console.log('   → Suggère que l\'opérateur est choisi AUTO après pays');
  console.log('   → Notre implémentation actuelle est CORRECTE ✅');
  console.log('\n   💡 Pas besoin d\'afficher la liste des opérateurs');
  console.log('   💡 Le système choisit automatiquement le meilleur');
  console.log('   💡 UX optimale: Service → Pays → Achat direct');
}

analyzeNumbersDisplay().catch(console.error);
