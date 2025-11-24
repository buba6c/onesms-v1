const https = require('https');

// ==========================================
// ANALYSE PROFONDE DU TRI EXACT DE 5SIM
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
          console.error('❌ Parse error:', e.message);
          console.log('Raw response:', data.slice(0, 500));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function analyzeExactSorting() {
  console.log('\n🔍 ANALYSE PROFONDE DU TRI 5SIM\n');
  console.log('='.repeat(80));

  // ==========================================
  // PARTIE 1: ANALYSER LE TRI DES PAYS
  // ==========================================
  console.log('\n📊 PARTIE 1: ANALYSE DU TRI DES PAYS POUR GOOGLE\n');
  
  const googleData = await fetchJSON('https://5sim.net/v1/guest/prices?product=google');
  
  // Extraire et analyser tous les pays
  const countries = [];
  for (const [countryName, operators] of Object.entries(googleData.google || {})) {
    let totalCount = 0;
    let maxRate = 0;
    let minCost = Infinity;
    let maxCost = 0;
    let operatorCount = 0;
    let hasRate = false;

    for (const [operatorName, details] of Object.entries(operators)) {
      totalCount += details.count || 0;
      if (details.rate !== undefined) {
        maxRate = Math.max(maxRate, details.rate);
        hasRate = true;
      }
      minCost = Math.min(minCost, details.cost || Infinity);
      maxCost = Math.max(maxCost, details.cost || 0);
      operatorCount++;
    }

    countries.push({
      name: countryName,
      totalCount,
      maxRate: hasRate ? maxRate : null,
      minCost: minCost === Infinity ? null : minCost,
      maxCost,
      operatorCount,
      hasRate
    });
  }

  console.log(`📌 Total pays disponibles: ${countries.length}`);

  // ==========================================
  // TEST 1: TRI PAR DIFFÉRENTS CRITÈRES
  // ==========================================
  console.log('\n🧪 TEST 1: Comparaison de différentes stratégies de tri\n');

  // Stratégie A: Par taux de succès (notre approche actuelle)
  const sortedByRate = [...countries].sort((a, b) => {
    if (b.maxRate !== a.maxRate) return (b.maxRate || 0) - (a.maxRate || 0);
    return b.totalCount - a.totalCount;
  });

  console.log('📈 STRATÉGIE A: Par taux de succès DESC');
  console.log('Top 10:');
  sortedByRate.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name.padEnd(20)} | Rate: ${(c.maxRate || 0).toFixed(2)}% | Stock: ${c.totalCount} | Cost: ${c.minCost}₽`);
  });

  // Stratégie B: Par stock disponible
  const sortedByStock = [...countries].sort((a, b) => b.totalCount - a.totalCount);

  console.log('\n📦 STRATÉGIE B: Par stock disponible DESC');
  console.log('Top 10:');
  sortedByStock.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name.padEnd(20)} | Stock: ${c.totalCount} | Rate: ${(c.maxRate || 0).toFixed(2)}% | Cost: ${c.minCost}₽`);
  });

  // Stratégie C: Par prix (ascendant)
  const sortedByPrice = [...countries]
    .filter(c => c.minCost !== null)
    .sort((a, b) => a.minCost - b.minCost);

  console.log('\n💰 STRATÉGIE C: Par prix ascendant');
  console.log('Top 10:');
  sortedByPrice.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name.padEnd(20)} | Cost: ${c.minCost}₽ | Stock: ${c.totalCount} | Rate: ${(c.maxRate || 0).toFixed(2)}%`);
  });

  // Stratégie D: Mix (stock + rate)
  const sortedByMix = [...countries].sort((a, b) => {
    // Score = stock * (rate/100)
    const scoreA = a.totalCount * ((a.maxRate || 0) / 100);
    const scoreB = b.totalCount * ((b.maxRate || 0) / 100);
    return scoreB - scoreA;
  });

  console.log('\n🎯 STRATÉGIE D: Mix (Stock × Rate)');
  console.log('Top 10:');
  sortedByMix.slice(0, 10).forEach((c, i) => {
    const score = c.totalCount * ((c.maxRate || 0) / 100);
    console.log(`  ${i + 1}. ${c.name.padEnd(20)} | Score: ${score.toFixed(0)} | Stock: ${c.totalCount} | Rate: ${(c.maxRate || 0).toFixed(2)}%`);
  });

  // Stratégie E: Mix avancé (stock + rate + nombre d'opérateurs)
  const sortedByAdvancedMix = [...countries].sort((a, b) => {
    // Score = (stock/1000) + (rate*2) + (operators*5)
    const scoreA = (a.totalCount / 1000) + ((a.maxRate || 0) * 2) + (a.operatorCount * 5);
    const scoreB = (b.totalCount / 1000) + ((b.maxRate || 0) * 2) + (b.operatorCount * 5);
    return scoreB - scoreA;
  });

  console.log('\n🚀 STRATÉGIE E: Mix avancé (Stock + Rate×2 + Operators×5)');
  console.log('Top 10:');
  sortedByAdvancedMix.slice(0, 10).forEach((c, i) => {
    const score = (c.totalCount / 1000) + ((c.maxRate || 0) * 2) + (c.operatorCount * 5);
    console.log(`  ${i + 1}. ${c.name.padEnd(20)} | Score: ${score.toFixed(1)} | Stock: ${c.totalCount} | Rate: ${(c.maxRate || 0).toFixed(2)}% | Ops: ${c.operatorCount}`);
  });

  // ==========================================
  // TEST 2: VÉRIFIER LES PAYS SPÉCIFIQUES
  // ==========================================
  console.log('\n\n🔍 TEST 2: Position des pays mentionnés par l\'utilisateur\n');

  const targetCountries = ['indonesia', 'italy', 'england', 'canada', 'austria', 'vietnam', 'finland'];
  
  console.log('📋 Positions dans chaque stratégie:\n');
  console.log('Pays'.padEnd(20) + ' | A:Rate | B:Stock | C:Price | D:Mix | E:AdvMix');
  console.log('-'.repeat(80));

  targetCountries.forEach(country => {
    const posRate = sortedByRate.findIndex(c => c.name === country) + 1;
    const posStock = sortedByStock.findIndex(c => c.name === country) + 1;
    const posPrice = sortedByPrice.findIndex(c => c.name === country) + 1;
    const posMix = sortedByMix.findIndex(c => c.name === country) + 1;
    const posAdvMix = sortedByAdvancedMix.findIndex(c => c.name === country) + 1;

    console.log(
      country.padEnd(20) + 
      ` | #${posRate.toString().padEnd(5)} | #${posStock.toString().padEnd(6)} | #${posPrice.toString().padEnd(6)} | #${posMix.toString().padEnd(4)} | #${posAdvMix.toString().padEnd(7)}`
    );
  });

  // ==========================================
  // PARTIE 2: ANALYSER LE TRI DES SERVICES
  // ==========================================
  console.log('\n\n📊 PARTIE 2: ANALYSE DU TRI DES SERVICES\n');
  console.log('='.repeat(80));

  const allPricesData = await fetchJSON('https://5sim.net/v1/guest/prices');
  
  // Analyser tous les services
  const services = [];
  for (const [serviceName, countries] of Object.entries(allPricesData)) {
    let totalStock = 0;
    let totalCountries = 0;
    let avgRate = 0;
    let rateCount = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const [countryName, operators] of Object.entries(countries)) {
      totalCountries++;
      for (const [operatorName, details] of Object.entries(operators)) {
        totalStock += details.count || 0;
        if (details.rate !== undefined) {
          avgRate += details.rate;
          rateCount++;
        }
        minPrice = Math.min(minPrice, details.cost || Infinity);
        maxPrice = Math.max(maxPrice, details.cost || 0);
      }
    }

    services.push({
      name: serviceName,
      totalStock,
      totalCountries,
      avgRate: rateCount > 0 ? avgRate / rateCount : 0,
      minPrice: minPrice === Infinity ? null : minPrice,
      maxPrice,
      rateCount
    });
  }

  console.log(`📌 Total services disponibles: ${services.length}\n`);

  // Stratégie A: Par stock total (comme 5sim semble faire)
  const servicesByStock = [...services].sort((a, b) => b.totalStock - a.totalStock);

  console.log('📦 STRATÉGIE A: Services par stock total DESC');
  console.log('Top 15:');
  servicesByStock.slice(0, 15).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name.padEnd(25)} | Stock: ${s.totalStock.toLocaleString().padStart(10)} | Pays: ${s.totalCountries.toString().padStart(3)} | Rate: ${s.avgRate.toFixed(1)}%`);
  });

  // Stratégie B: Par nombre de pays
  const servicesByCountries = [...services].sort((a, b) => b.totalCountries - a.totalCountries);

  console.log('\n🌍 STRATÉGIE B: Services par nombre de pays DESC');
  console.log('Top 15:');
  servicesByCountries.slice(0, 15).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name.padEnd(25)} | Pays: ${s.totalCountries.toString().padStart(3)} | Stock: ${s.totalStock.toLocaleString().padStart(10)} | Rate: ${s.avgRate.toFixed(1)}%`);
  });

  // Stratégie C: Mix (stock × pays)
  const servicesByMix = [...services].sort((a, b) => {
    const scoreA = a.totalStock * a.totalCountries;
    const scoreB = b.totalStock * b.totalCountries;
    return scoreB - scoreA;
  });

  console.log('\n🎯 STRATÉGIE C: Services par mix (Stock × Pays)');
  console.log('Top 15:');
  servicesByMix.slice(0, 15).forEach((s, i) => {
    const score = s.totalStock * s.totalCountries;
    console.log(`  ${i + 1}. ${s.name.padEnd(25)} | Score: ${score.toLocaleString().padStart(15)} | Stock: ${s.totalStock.toLocaleString().padStart(10)} | Pays: ${s.totalCountries}`);
  });

  // ==========================================
  // CONCLUSION ET RECOMMANDATIONS
  // ==========================================
  console.log('\n\n💡 CONCLUSION ET RECOMMANDATIONS\n');
  console.log('='.repeat(80));

  console.log('\n🎯 POUR LES PAYS:');
  console.log('   • 5sim website semble utiliser un tri CUSTOM (géo, favoris, cache)');
  console.log('   • Pour ressembler à 5sim, plusieurs options:');
  console.log('     ✓ Option 1: Stock × Rate (équilibre popularité/qualité)');
  console.log('     ✓ Option 2: Stock pur (popularité maximale)');
  console.log('     ✓ Option 3: Mix avancé (stock + rate + opérateurs)');
  console.log('');
  console.log('🎯 POUR LES SERVICES:');
  console.log('   • 5sim utilise clairement: Stock total DESC');
  console.log('   • Recommandation: Trier par totalStock (popularité globale)');
  console.log('   • Alternative: Stock × Pays (disponibilité globale)');

  // Vérifier si certains pays sont "populaires" par région
  console.log('\n\n🌍 ANALYSE GÉOGRAPHIQUE\n');
  
  const regions = {
    europe: ['england', 'france', 'germany', 'italy', 'spain', 'poland', 'romania'],
    asia: ['indonesia', 'india', 'china', 'vietnam', 'philippines', 'thailand'],
    americas: ['usa', 'canada', 'brazil', 'mexico', 'argentina'],
    africa: ['nigeria', 'kenya', 'southafrica', 'egypt']
  };

  for (const [region, countryList] of Object.entries(regions)) {
    console.log(`\n📍 ${region.toUpperCase()}:`);
    const regionData = countries.filter(c => countryList.includes(c.name));
    const avgStock = regionData.reduce((sum, c) => sum + c.totalCount, 0) / regionData.length;
    const avgRate = regionData.reduce((sum, c) => sum + (c.maxRate || 0), 0) / regionData.length;
    console.log(`   Stock moyen: ${avgStock.toFixed(0)} | Rate moyen: ${avgRate.toFixed(1)}%`);
    
    regionData
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 3)
      .forEach(c => {
        console.log(`   • ${c.name.padEnd(20)} | Stock: ${c.totalCount.toLocaleString().padStart(7)} | Rate: ${(c.maxRate || 0).toFixed(1)}%`);
      });
  }
}

analyzeExactSorting().catch(console.error);
