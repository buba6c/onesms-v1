const https = require('https');

// ==========================================
// ANALYSE PROFONDE DES SERVICES 5SIM
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

async function analyzeServicesDisplay() {
  console.log('\n🔍 ANALYSE PROFONDE: ORDRE DES SERVICES SUR 5SIM\n');
  console.log('='.repeat(80));

  // Récupérer tous les services
  const allPricesData = await fetchJSON('https://5sim.net/v1/guest/prices');
  
  console.log(`\n📊 Total services dans l'API: ${Object.keys(allPricesData).length}\n`);

  // Analyser chaque service
  const services = [];
  for (const [serviceName, countries] of Object.entries(allPricesData)) {
    let totalStock = 0;
    let totalCountries = 0;
    let totalOrders = 0; // Simulé
    let avgRate = 0;
    let rateCount = 0;
    let minPrice = Infinity;
    let totalRevenue = 0; // stock × price (indicateur de popularité)

    for (const [countryName, operators] of Object.entries(countries)) {
      totalCountries++;
      for (const [operatorName, details] of Object.entries(operators)) {
        const stock = details.count || 0;
        const price = details.cost || 0;
        const rate = details.rate || 0;
        
        totalStock += stock;
        minPrice = Math.min(minPrice, price);
        totalRevenue += stock * price;
        
        if (rate > 0) {
          avgRate += rate;
          rateCount++;
        }
      }
    }

    services.push({
      name: serviceName,
      totalStock,
      totalCountries,
      avgRate: rateCount > 0 ? avgRate / rateCount : 0,
      minPrice: minPrice === Infinity ? 0 : minPrice,
      totalRevenue,
      // Score de popularité composite
      popularityScore: (totalStock / 1000) + (totalCountries * 10)
    });
  }

  // ==========================================
  // TEST DIFFÉRENTES STRATÉGIES DE TRI
  // ==========================================
  
  console.log('🧪 TEST 1: TRI PAR STOCK TOTAL (ce qu\'on a implémenté)\n');
  const byStock = [...services].sort((a, b) => b.totalStock - a.totalStock);
  console.log('Top 20:');
  byStock.slice(0, 20).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)} | Stock: ${s.totalStock.toLocaleString().padStart(12)}`);
  });

  console.log('\n\n🧪 TEST 2: TRI PAR NOMBRE DE PAYS\n');
  const byCountries = [...services].sort((a, b) => b.totalCountries - a.totalCountries);
  console.log('Top 20:');
  byCountries.slice(0, 20).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)} | Pays: ${s.totalCountries.toString().padStart(3)}`);
  });

  console.log('\n\n🧪 TEST 3: TRI PAR POPULARITÉ (Stock + Pays)\n');
  const byPopularity = [...services].sort((a, b) => b.popularityScore - a.popularityScore);
  console.log('Top 20:');
  byPopularity.slice(0, 20).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)} | Score: ${s.popularityScore.toFixed(0).padStart(8)}`);
  });

  console.log('\n\n🧪 TEST 4: TRI PAR REVENUE POTENTIEL (Stock × Prix)\n');
  const byRevenue = [...services].sort((a, b) => b.totalRevenue - a.totalRevenue);
  console.log('Top 20:');
  byRevenue.slice(0, 20).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)} | Revenue: ${s.totalRevenue.toLocaleString().padStart(15)}`);
  });

  console.log('\n\n🧪 TEST 5: TRI ALPHABÉTIQUE\n');
  const alphabetical = [...services].sort((a, b) => a.name.localeCompare(b.name));
  console.log('Top 20:');
  alphabetical.slice(0, 20).forEach((s, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${s.name.padEnd(25)}`);
  });

  // ==========================================
  // ANALYSE DES SERVICES SPÉCIFIQUES
  // ==========================================
  console.log('\n\n📍 POSITION DES SERVICES MENTIONNÉS:\n');
  
  const targetServices = [
    'amazon', 'facebook', 'google', 'whatsapp', 'telegram',
    'uber', 'microsoft', 'netflix', 'instagram', 'twitter'
  ];

  console.log('Service'.padEnd(20) + ' | Stock | Pays | Popularity | Revenue | Alpha');
  console.log('-'.repeat(90));

  targetServices.forEach(service => {
    const posStock = byStock.findIndex(s => s.name === service) + 1;
    const posCountries = byCountries.findIndex(s => s.name === service) + 1;
    const posPopularity = byPopularity.findIndex(s => s.name === service) + 1;
    const posRevenue = byRevenue.findIndex(s => s.name === service) + 1;
    const posAlpha = alphabetical.findIndex(s => s.name === service) + 1;

    console.log(
      service.padEnd(20) + 
      ` | #${posStock.toString().padStart(3)} | #${posCountries.toString().padStart(3)} | #${posPopularity.toString().padStart(3)}       | #${posRevenue.toString().padStart(3)}    | #${posAlpha.toString().padStart(3)}`
    );
  });

  // ==========================================
  // ANALYSE: QUEL TRI RESSEMBLE LE PLUS À 5SIM?
  // ==========================================
  console.log('\n\n💡 ANALYSE: Quel tri met Amazon, Facebook en tête?\n');

  // Vérifier quels tris ont amazon et facebook dans le top 10
  const top10Tests = {
    'Stock total': byStock.slice(0, 10).map(s => s.name),
    'Pays': byCountries.slice(0, 10).map(s => s.name),
    'Popularité': byPopularity.slice(0, 10).map(s => s.name),
    'Revenue': byRevenue.slice(0, 10).map(s => s.name),
    'Alphabétique': alphabetical.slice(0, 10).map(s => s.name)
  };

  Object.entries(top10Tests).forEach(([strategyName, top10]) => {
    const hasAmazon = top10.includes('amazon');
    const hasFacebook = top10.includes('facebook');
    const hasGoogle = top10.includes('google');
    
    const amazonPos = top10.indexOf('amazon') + 1;
    const facebookPos = top10.indexOf('facebook') + 1;
    const googlePos = top10.indexOf('google') + 1;

    console.log(`\n${strategyName}:`);
    console.log(`  Amazon: ${hasAmazon ? `✅ #${amazonPos}` : '❌ pas dans top 10'}`);
    console.log(`  Facebook: ${hasFacebook ? `✅ #${facebookPos}` : '❌ pas dans top 10'}`);
    console.log(`  Google: ${hasGoogle ? `✅ #${googlePos}` : '❌ pas dans top 10'}`);
  });

  // ==========================================
  // TEST SPÉCIAL: TRI PAR CATÉGORIE
  // ==========================================
  console.log('\n\n🎯 ANALYSE CATÉGORIELLE:\n');

  const categories = {
    'Social': ['facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'linkedin'],
    'Shopping': ['amazon', 'ebay', 'shopify', 'aliexpress'],
    'Messaging': ['whatsapp', 'telegram', 'viber', 'wechat', 'signal'],
    'Transport': ['uber', 'lyft', 'bolt'],
    'Tech Giants': ['google', 'microsoft', 'apple', 'yahoo'],
    'Streaming': ['netflix', 'spotify', 'disney']
  };

  for (const [category, serviceList] of Object.entries(categories)) {
    console.log(`\n📂 ${category}:`);
    const categoryServices = services.filter(s => serviceList.includes(s.name));
    const sorted = categoryServices.sort((a, b) => b.totalStock - a.totalStock);
    
    sorted.forEach(s => {
      const globalPos = byStock.findIndex(srv => srv.name === s.name) + 1;
      console.log(`  • ${s.name.padEnd(20)} | Position globale: #${globalPos} | Stock: ${s.totalStock.toLocaleString()}`);
    });
  }

  // ==========================================
  // CONCLUSION
  // ==========================================
  console.log('\n\n💡 CONCLUSION:\n');
  console.log('='.repeat(80));
  
  const amazonData = services.find(s => s.name === 'amazon');
  const facebookData = services.find(s => s.name === 'facebook');
  const googleData = services.find(s => s.name === 'google');
  const uberData = services.find(s => s.name === 'uber');
  const microsoftData = services.find(s => s.name === 'microsoft');

  console.log('\n📊 Données brutes:');
  console.log('\nAmazon:');
  console.log(`  Stock: ${amazonData?.totalStock.toLocaleString()}`);
  console.log(`  Pays: ${amazonData?.totalCountries}`);
  console.log(`  Position (stock): #${byStock.findIndex(s => s.name === 'amazon') + 1}`);
  
  console.log('\nFacebook:');
  console.log(`  Stock: ${facebookData?.totalStock.toLocaleString()}`);
  console.log(`  Pays: ${facebookData?.totalCountries}`);
  console.log(`  Position (stock): #${byStock.findIndex(s => s.name === 'facebook') + 1}`);
  
  console.log('\nGoogle:');
  console.log(`  Stock: ${googleData?.totalStock.toLocaleString()}`);
  console.log(`  Pays: ${googleData?.totalCountries}`);
  console.log(`  Position (stock): #${byStock.findIndex(s => s.name === 'google') + 1}`);

  console.log('\nUber:');
  console.log(`  Stock: ${uberData?.totalStock.toLocaleString()}`);
  console.log(`  Pays: ${uberData?.totalCountries}`);
  console.log(`  Position (stock): #${byStock.findIndex(s => s.name === 'uber') + 1}`);

  console.log('\nMicrosoft:');
  console.log(`  Stock: ${microsoftData?.totalStock.toLocaleString()}`);
  console.log(`  Pays: ${microsoftData?.totalCountries}`);
  console.log(`  Position (stock): #${byStock.findIndex(s => s.name === 'microsoft') + 1}`);

  console.log('\n\n🎯 RECOMMANDATION:');
  console.log('   Si 5sim affiche Amazon, Facebook en premier, alors:');
  console.log('   • SOIT ils utilisent un tri CUSTOM/manuel (curated list)');
  console.log('   • SOIT ils utilisent un tri par CATÉGORIE puis POPULARITÉ');
  console.log('   • SOIT ils ont un système de FEATURED SERVICES');
  console.log('\n   Notre tri actuel (stock total) est CORRECT techniquement.');
  console.log('   Pour un affichage "comme 5sim", il faudrait une liste manuelle.');
}

analyzeServicesDisplay().catch(console.error);
