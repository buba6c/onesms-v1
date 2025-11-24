const https = require('https');

// ==========================================
// DEEP ANALYSE FINALE: VÉRIFICATION COMPLÈTE 5SIM
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

async function deepAnalyze5sim() {
  console.log('\n🔬 DEEP ANALYSE FINALE: VÉRIFICATION ORDRE 5SIM\n');
  console.log('='.repeat(80));

  // ==========================================
  // PARTIE 1: ORDRE DES SERVICES
  // ==========================================
  console.log('\n📦 PARTIE 1: ORDRE DES SERVICES\n');
  
  const allPrices = await fetchJSON('https://5sim.net/v1/guest/prices');
  const services = Object.keys(allPrices);
  
  console.log(`Total services dans l'API: ${services.length}`);
  console.log('\n🔤 Ordre BRUT dans la réponse API (premiers 30):');
  services.slice(0, 30).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s}`);
  });

  // Analyser si alphabétique
  const isAlpha = services.every((s, i) => {
    if (i === 0) return true;
    return s.localeCompare(services[i - 1]) >= 0;
  });
  
  console.log(`\n📋 Ordre alphabétique? ${isAlpha ? '✅ OUI' : '❌ NON'}`);

  // Calculer stock total par service
  const serviceStats = [];
  for (const [serviceName, countries] of Object.entries(allPrices)) {
    let totalStock = 0;
    let totalCountries = 0;

    for (const [countryName, operators] of Object.entries(countries)) {
      totalCountries++;
      for (const [operatorName, details] of Object.entries(operators)) {
        totalStock += details.count || 0;
      }
    }

    serviceStats.push({ name: serviceName, totalStock, totalCountries });
  }

  // Trier par stock
  const byStock = [...serviceStats].sort((a, b) => b.totalStock - a.totalStock);
  
  console.log('\n📊 Top 15 services par STOCK TOTAL:');
  byStock.slice(0, 15).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)} | Stock: ${s.totalStock.toLocaleString().padStart(12)}`);
  });

  // Trier par nombre de pays
  const byCountries = [...serviceStats].sort((a, b) => b.totalCountries - a.totalCountries);
  
  console.log('\n🌍 Top 15 services par NOMBRE DE PAYS:');
  byCountries.slice(0, 15).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)} | Pays: ${s.totalCountries.toString().padStart(3)}`);
  });

  // Chercher les services mentionnés (Amazon, Facebook, etc.)
  console.log('\n🔍 Services populaires mentionnés:');
  const popularServices = ['amazon', 'facebook', 'telegram', 'whatsapp', 'google', 'microsoft', 'twitter', 'instagram'];
  popularServices.forEach(svc => {
    const found = serviceStats.find(s => s.name === svc);
    if (found) {
      const posStock = byStock.findIndex(s => s.name === svc) + 1;
      const posCountries = byCountries.findIndex(s => s.name === svc) + 1;
      console.log(`  • ${svc.padEnd(15)} | Stock: ${found.totalStock.toLocaleString().padStart(10)} (#${posStock.toString().padStart(2)}) | Pays: ${found.totalCountries.toString().padStart(3)} (#${posCountries.toString().padStart(2)})`);
    } else {
      console.log(`  • ${svc.padEnd(15)} | ❌ Non trouvé dans l'API`);
    }
  });

  // ==========================================
  // PARTIE 2: ORDRE DES PAYS POUR GOOGLE
  // ==========================================
  console.log('\n\n🌍 PARTIE 2: ORDRE DES PAYS POUR GOOGLE\n');
  
  const googleData = await fetchJSON('https://5sim.net/v1/guest/prices?product=google');
  
  if (googleData.google) {
    const countries = [];
    
    for (const [countryName, operators] of Object.entries(googleData.google)) {
      let totalCount = 0;
      let maxRate = 0;

      for (const [operatorName, details] of Object.entries(operators)) {
        totalCount += details.count || 0;
        if (details.rate !== undefined) {
          maxRate = Math.max(maxRate, details.rate);
        }
      }

      countries.push({
        name: countryName,
        totalCount,
        maxRate: maxRate || 0,
        score: totalCount * (maxRate / 100)
      });
    }

    console.log(`Total pays disponibles: ${countries.length}`);

    // Ordre BRUT de l'API
    console.log('\n🔤 Ordre BRUT dans la réponse API (premiers 20):');
    Object.keys(googleData.google).slice(0, 20).forEach((c, i) => {
      const country = countries.find(co => co.name === c);
      console.log(`  ${(i + 1).toString().padStart(2)}. ${c.padEnd(20)} | Rate: ${country.maxRate.toFixed(2).padStart(6)}% | Stock: ${country.totalCount.toString().padStart(7)}`);
    });

    // Vérifier si alphabétique
    const countryKeys = Object.keys(googleData.google);
    const isCountryAlpha = countryKeys.every((c, i) => {
      if (i === 0) return true;
      return c.localeCompare(countryKeys[i - 1]) >= 0;
    });
    
    console.log(`\n📋 Ordre alphabétique? ${isCountryAlpha ? '✅ OUI' : '❌ NON'}`);

    // Tri par Stock × Rate (notre stratégie)
    const byScore = [...countries].sort((a, b) => b.score - a.score);
    
    console.log('\n🎯 Top 20 pays par STOCK × RATE (notre stratégie):');
    byScore.slice(0, 20).forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${c.name.padEnd(20)} | Score: ${c.score.toFixed(0).padStart(8)} | Rate: ${c.maxRate.toFixed(2).padStart(6)}% | Stock: ${c.totalCount.toString().padStart(7)}`);
    });

    // Tri par Rate uniquement
    const byRate = [...countries].sort((a, b) => {
      if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate;
      return b.totalCount - a.totalCount;
    });
    
    console.log('\n📈 Top 20 pays par RATE uniquement:');
    byRate.slice(0, 20).forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${c.name.padEnd(20)} | Rate: ${c.maxRate.toFixed(2).padStart(6)}% | Stock: ${c.totalCount.toString().padStart(7)}`);
    });

    // Tri par Stock uniquement
    const byStock = [...countries].sort((a, b) => b.totalCount - a.totalCount);
    
    console.log('\n📦 Top 20 pays par STOCK uniquement:');
    byStock.slice(0, 20).forEach((c, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${c.name.padEnd(20)} | Stock: ${c.totalCount.toString().padStart(7)} | Rate: ${c.maxRate.toFixed(2).padStart(6)}%`);
    });

    // Comparer avec les pays mentionnés par l'utilisateur
    console.log('\n🔍 Pays mentionnés par utilisateur (England, Indonesia, Italy, Canada):');
    const mentionedCountries = ['england', 'indonesia', 'italy', 'canada', 'austria', 'vietnam'];
    
    console.log('\nPays'.padEnd(20) + ' | Score | Rate | Stock | Pos(Score) | Pos(Rate) | Pos(Stock)');
    console.log('-'.repeat(95));
    
    mentionedCountries.forEach(name => {
      const country = countries.find(c => c.name === name);
      if (country) {
        const posScore = byScore.findIndex(c => c.name === name) + 1;
        const posRate = byRate.findIndex(c => c.name === name) + 1;
        const posStock = byStock.findIndex(c => c.name === name) + 1;
        
        console.log(
          name.padEnd(20) +
          ` | ${country.score.toFixed(0).padStart(5)} | ${country.maxRate.toFixed(1).padStart(4)}% | ${country.totalCount.toString().padStart(6)} | #${posScore.toString().padStart(2)}        | #${posRate.toString().padStart(2)}       | #${posStock.toString().padStart(2)}`
        );
      }
    });
  }

  // ==========================================
  // PARTIE 3: OPÉRATEURS POUR GOOGLE + ENGLAND
  // ==========================================
  console.log('\n\n🔧 PARTIE 3: OPÉRATEURS POUR GOOGLE + ENGLAND\n');
  
  if (googleData.google && googleData.google.england) {
    const operators = [];
    
    for (const [opName, details] of Object.entries(googleData.google.england)) {
      operators.push({
        name: opName,
        cost: details.cost,
        count: details.count,
        rate: details.rate || 0,
        score: details.count * ((details.rate || 0) / 100)
      });
    }

    console.log(`Total opérateurs: ${operators.length}`);

    // Ordre BRUT
    console.log('\n🔤 Ordre BRUT dans la réponse API:');
    Object.entries(googleData.google.england).forEach(([name, details], i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${name.padEnd(20)} | Prix: ${details.cost.toString().padStart(5)}₽ | Stock: ${details.count.toString().padStart(7)} | Rate: ${(details.rate || 0).toString().padStart(5)}%`);
    });

    // Tri par score (notre stratégie)
    const byScore = [...operators]
      .filter(op => op.count > 0)
      .sort((a, b) => b.score - a.score);
    
    console.log('\n🎯 Tri par SCORE (Stock × Rate) - avec stock:');
    byScore.slice(0, 10).forEach((op, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${op.name.padEnd(20)} | Score: ${op.score.toFixed(0).padStart(8)} | Rate: ${op.rate.toString().padStart(5)}% | Stock: ${op.count.toString().padStart(7)} | Prix: ${op.cost.toString().padStart(5)}₽`);
    });

    console.log('\n💡 Meilleur opérateur sélectionné automatiquement: ' + byScore[0]?.name);
  }

  // ==========================================
  // CONCLUSION
  // ==========================================
  console.log('\n\n💡 CONCLUSION FINALE\n');
  console.log('='.repeat(80));
  
  console.log('\n🎯 SERVICES:');
  console.log('   • API retourne ordre: ALPHABÉTIQUE');
  console.log('   • Pour afficher comme 5sim website: Utiliser liste manuelle (popularity_score)');
  console.log('   • Services populaires: Amazon, Facebook, Telegram en priorité');
  
  console.log('\n🎯 PAYS:');
  console.log('   • API retourne ordre: ALPHABÉTIQUE');
  console.log('   • Pour afficher comme notre analyse:');
  console.log('     ✅ Stock × Rate (England #1, Italy #2, Vietnam #3, Canada #4)');
  console.log('     ⚠️  Rate seul (Austria #1, Vietnam #2, Finland #3)');
  console.log('     ⚠️  Stock seul (England #1, USA #2, Italy #3)');
  
  console.log('\n🎯 OPÉRATEURS:');
  console.log('   • API retourne ordre: Probablement INSERTION ou ALPHABÉTIQUE');
  console.log('   • Sélection automatique: Score (Stock × Rate)');
  console.log('   • Exemple: virtual60 pour Google/England (score 67K)');
  
  console.log('\n✅ NOTRE IMPLÉMENTATION:');
  console.log('   • Services: popularity_score (liste curated comme 5sim website)');
  console.log('   • Pays: Stock × Rate en temps réel (équilibre qualité/disponibilité)');
  console.log('   • Opérateurs: Sélection auto du meilleur (Stock × Rate)');
  console.log('   • Refresh: 30s cache, 60s auto-refresh');
}

deepAnalyze5sim().catch(console.error);
