const https = require('https');

// ==========================================
// ANALYSE PROFONDE: AFFICHAGE DES NUMÉROS/OPÉRATEURS SUR 5SIM
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
  console.log('\n🔍 ANALYSE PROFONDE: AFFICHAGE DES NUMÉROS/OPÉRATEURS\n');
  console.log('='.repeat(80));

  // ==========================================
  // TEST 1: ANALYSER GOOGLE + ENGLAND
  // ==========================================
  console.log('\n📊 TEST 1: Google + England (exemple type)\n');
  
  const googlePrices = await fetchJSON('https://5sim.net/v1/guest/prices?product=google');
  
  if (googlePrices.google && googlePrices.google.england) {
    const operators = googlePrices.google.england;
    
    console.log('Opérateurs disponibles pour Google en England:');
    console.log('Nombre d\'opérateurs:', Object.keys(operators).length);
    console.log('\nDétails par opérateur:\n');
    
    const operatorList = [];
    for (const [operatorName, details] of Object.entries(operators)) {
      operatorList.push({
        name: operatorName,
        cost: details.cost,
        count: details.count,
        rate: details.rate || 0
      });
    }

    // TEST DIFFÉRENTS TRIS
    console.log('🧪 STRATÉGIE A: Tri par PRIX (ascendant)');
    const byPrice = [...operatorList].sort((a, b) => a.cost - b.cost);
    byPrice.forEach((op, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Prix: ${op.cost.toString().padStart(5)}₽ | Stock: ${op.count.toString().padStart(7)} | Rate: ${op.rate.toString().padStart(5)}%`);
    });

    console.log('\n🧪 STRATÉGIE B: Tri par STOCK (descendant)');
    const byStock = [...operatorList].sort((a, b) => b.count - a.count);
    byStock.forEach((op, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Stock: ${op.count.toString().padStart(7)} | Prix: ${op.cost.toString().padStart(5)}₽ | Rate: ${op.rate.toString().padStart(5)}%`);
    });

    console.log('\n🧪 STRATÉGIE C: Tri par TAUX DE SUCCÈS (descendant)');
    const byRate = [...operatorList].sort((a, b) => b.rate - a.rate);
    byRate.forEach((op, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Rate: ${op.rate.toString().padStart(5)}% | Stock: ${op.count.toString().padStart(7)} | Prix: ${op.cost.toString().padStart(5)}₽`);
    });

    console.log('\n🧪 STRATÉGIE D: Tri par QUALITÉ/PRIX (Rate/Cost)');
    const byValue = [...operatorList]
      .filter(op => op.cost > 0)
      .sort((a, b) => {
        const valueA = a.rate / a.cost;
        const valueB = b.rate / b.cost;
        return valueB - valueA;
      });
    byValue.forEach((op, i) => {
      const value = (op.rate / op.cost).toFixed(2);
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Valeur: ${value.padStart(5)} | Rate: ${op.rate.toString().padStart(5)}% | Prix: ${op.cost.toString().padStart(5)}₽`);
    });

    console.log('\n🧪 STRATÉGIE E: Tri ALPHABÉTIQUE');
    const alphabetical = [...operatorList].sort((a, b) => a.name.localeCompare(b.name));
    alphabetical.forEach((op, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Prix: ${op.cost.toString().padStart(5)}₽ | Stock: ${op.count.toString().padStart(7)} | Rate: ${op.rate.toString().padStart(5)}%`);
    });

    console.log('\n🧪 STRATÉGIE F: Tri par POPULARITÉ (Stock × Rate)');
    const byPopularity = [...operatorList].sort((a, b) => {
      const popA = a.count * (a.rate / 100);
      const popB = b.count * (b.rate / 100);
      return popB - popA;
    });
    byPopularity.forEach((op, i) => {
      const popularity = (op.count * (op.rate / 100)).toFixed(0);
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Pop: ${popularity.padStart(8)} | Stock: ${op.count.toString().padStart(7)} | Rate: ${op.rate.toString().padStart(5)}%`);
    });
  }

  // ==========================================
  // TEST 2: COMPARER PLUSIEURS PAYS
  // ==========================================
  console.log('\n\n📊 TEST 2: Comparaison sur plusieurs pays\n');
  
  const testCountries = ['england', 'usa', 'canada', 'indonesia'];
  
  for (const country of testCountries) {
    if (googlePrices.google && googlePrices.google[country]) {
      const operators = googlePrices.google[country];
      const opList = Object.entries(operators).map(([name, details]) => ({
        name,
        cost: details.cost,
        count: details.count,
        rate: details.rate || 0
      }));

      // Analyser quel opérateur apparaît "en premier" (meilleur score)
      const byPrice = [...opList].sort((a, b) => a.cost - b.cost)[0];
      const byStock = [...opList].sort((a, b) => b.count - a.count)[0];
      const byRate = [...opList].sort((a, b) => b.rate - a.rate)[0];
      const byPop = [...opList].sort((a, b) => {
        const popA = a.count * (a.rate / 100);
        const popB = b.count * (b.rate / 100);
        return popB - popA;
      })[0];

      console.log(`\n🌍 ${country.toUpperCase()}:`);
      console.log(`   Total opérateurs: ${opList.length}`);
      console.log(`   Premier par PRIX: ${byPrice.name} (${byPrice.cost}₽)`);
      console.log(`   Premier par STOCK: ${byStock.name} (${byStock.count})`);
      console.log(`   Premier par RATE: ${byRate.name} (${byRate.rate}%)`);
      console.log(`   Premier par POPULARITÉ: ${byPop.name} (score: ${(byPop.count * (byPop.rate / 100)).toFixed(0)})`);
    }
  }

  // ==========================================
  // TEST 3: ANALYSER L'ENDPOINT /products
  // ==========================================
  console.log('\n\n📊 TEST 3: Analyse de l\'endpoint /v1/guest/products/{country}/any\n');
  
  try {
    const englandProducts = await fetchJSON('https://5sim.net/v1/guest/products/england/any');
    
    // Chercher Google dans les produits
    const googleProduct = Object.entries(englandProducts).find(([key, value]) => 
      key.toLowerCase().includes('google') || value.Product?.toLowerCase().includes('google')
    );

    if (googleProduct) {
      const [key, productData] = googleProduct;
      console.log('Données Google via /products:');
      console.log(JSON.stringify(productData, null, 2).slice(0, 500));
    }

    // Analyser la structure
    console.log('\nStructure de l\'endpoint /products:');
    const firstProduct = Object.entries(englandProducts)[0];
    if (firstProduct) {
      console.log('Exemple de structure:');
      console.log(JSON.stringify(firstProduct[1], null, 2).slice(0, 300));
    }

  } catch (error) {
    console.log('⚠️  Endpoint /products non accessible ou format différent');
  }

  // ==========================================
  // CONCLUSION
  // ==========================================
  console.log('\n\n💡 CONCLUSION ET RECOMMANDATIONS\n');
  console.log('='.repeat(80));
  
  console.log('\n🎯 POUR L\'AFFICHAGE DES OPÉRATEURS/NUMÉROS:\n');
  console.log('Stratégies possibles:');
  console.log('   1️⃣  PRIX (ascendant) → Le moins cher en premier');
  console.log('       ✓ Avantage: Utilisateur voit les meilleures offres');
  console.log('       ✗ Inconvénient: Peut cacher les meilleurs taux de succès');
  console.log('');
  console.log('   2️⃣  STOCK (descendant) → Le plus de numéros disponibles');
  console.log('       ✓ Avantage: Garantit la disponibilité');
  console.log('       ✗ Inconvénient: Ignore qualité et prix');
  console.log('');
  console.log('   3️⃣  TAUX DE SUCCÈS (descendant) → Meilleure qualité');
  console.log('       ✓ Avantage: Utilisateur obtient les meilleurs taux');
  console.log('       ✗ Inconvénient: Peut être plus cher');
  console.log('');
  console.log('   4️⃣  POPULARITÉ (Stock × Rate) → Équilibre qualité/disponibilité');
  console.log('       ✓ Avantage: Bon compromis global');
  console.log('       ✗ Inconvénient: Ignore le prix');
  console.log('');
  console.log('   5️⃣  VALEUR (Rate/Prix) → Meilleur rapport qualité/prix');
  console.log('       ✓ Avantage: Optimise la valeur pour l\'utilisateur');
  console.log('       ✗ Inconvénient: Peut favoriser opérateurs moins connus');
  console.log('');
  console.log('🔍 RECOMMANDATION BASÉE SUR 5SIM:');
  console.log('   → 5sim semble utiliser: PRIX (ascendant) OU POPULARITÉ');
  console.log('   → Objectif: Montrer les options les plus accessibles/populaires');
  console.log('   → Alternative premium: TAUX DE SUCCÈS pour maximiser la réussite');
}

analyzeNumbersDisplay().catch(console.error);
