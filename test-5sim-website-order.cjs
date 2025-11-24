/**
 * DEEP ANALYSE: Ordre réel des pays sur 5sim.net
 * Tu dis voir: Indonesia, Italy, England, Canada en premier pour Google
 * Vérifions si l'API retourne la même chose
 */

async function deepAnalyze5simOrder() {
  console.log('🔍 DEEP ANALYSE: Ordre RÉEL des pays sur 5sim.net');
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  // Test 1: Google service
  console.log('1️⃣ SERVICE: GOOGLE');
  console.log('-'.repeat(80));
  
  const googleResponse = await fetch('https://5sim.net/v1/guest/prices?product=google');
  const googleData = await googleResponse.json();
  
  const googleCountries = [];
  
  // Parser la structure: data["google"][countryName][operators]
  if (googleData.google) {
    for (const [countryName, operators] of Object.entries(googleData.google)) {
      let maxRate = 0;
      let totalCount = 0;
      let minPrice = Infinity;
      
      for (const [operatorName, operatorData] of Object.entries(operators)) {
        const rate = operatorData.rate || 0;
        const count = operatorData.count || 0;
        const cost = operatorData.cost || 0;
        
        if (rate > maxRate) maxRate = rate;
        totalCount += count;
        if (cost < minPrice) minPrice = cost;
      }
      
      googleCountries.push({
        country: countryName,
        maxRate,
        totalCount,
        minPrice: minPrice === Infinity ? 0 : minPrice
      });
    }
  }
  
  // Trier comme l'API le fait (rate DESC, count DESC)
  googleCountries.sort((a, b) => {
    if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate;
    return b.totalCount - a.totalCount;
  });
  
  console.log('   📊 TOP 30 pays selon API (rate DESC, count DESC):');
  console.log('');
  googleCountries.slice(0, 30).forEach((c, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${c.country.padEnd(20)} | Rate: ${c.maxRate.toString().padStart(5)}% | Stock: ${c.totalCount.toString().padStart(6)} | Prix: ${c.minPrice}₽`);
  });
  console.log('');
  
  // Vérifier les pays mentionnés
  console.log('   🔎 Vérification des pays mentionnés (Indonesia, Italy, England, Canada):');
  const mentioned = ['indonesia', 'italy', 'england', 'canada'];
  mentioned.forEach(country => {
    const index = googleCountries.findIndex(c => c.country.toLowerCase() === country);
    const data = googleCountries[index];
    if (data) {
      console.log(`   - ${country.padEnd(15)}: Position #${(index+1).toString().padStart(2)} | Rate: ${data.maxRate}% | Stock: ${data.totalCount}`);
    }
  });
  console.log('');
  
  // Test 2: Trier par PRIX (ce que le site pourrait faire?)
  console.log('2️⃣ HYPOTHÈSE: Tri par PRIX (moins cher en premier)');
  console.log('-'.repeat(80));
  
  const sortedByPrice = [...googleCountries]
    .filter(c => c.minPrice > 0)
    .sort((a, b) => {
      if (a.minPrice !== b.minPrice) return a.minPrice - b.minPrice;
      return b.totalCount - a.totalCount;
    });
  
  console.log('   💰 TOP 30 pays par PRIX le plus BAS:');
  console.log('');
  sortedByPrice.slice(0, 30).forEach((c, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${c.country.padEnd(20)} | Prix: ${c.minPrice.toString().padStart(6)}₽ | Stock: ${c.totalCount.toString().padStart(6)} | Rate: ${c.maxRate}%`);
  });
  console.log('');
  
  mentioned.forEach(country => {
    const index = sortedByPrice.findIndex(c => c.country.toLowerCase() === country);
    if (index >= 0) {
      const data = sortedByPrice[index];
      console.log(`   - ${country.padEnd(15)}: Position #${(index+1).toString().padStart(2)} | Prix: ${data.minPrice}₽`);
    }
  });
  console.log('');
  
  // Test 3: Trier par STOCK (disponibilité)
  console.log('3️⃣ HYPOTHÈSE: Tri par STOCK (plus de numéros en premier)');
  console.log('-'.repeat(80));
  
  const sortedByStock = [...googleCountries].sort((a, b) => b.totalCount - a.totalCount);
  
  console.log('   📦 TOP 30 pays par STOCK le plus ÉLEVÉ:');
  console.log('');
  sortedByStock.slice(0, 30).forEach((c, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${c.country.padEnd(20)} | Stock: ${c.totalCount.toString().padStart(6)} | Rate: ${c.maxRate.toString().padStart(5)}% | Prix: ${c.minPrice}₽`);
  });
  console.log('');
  
  mentioned.forEach(country => {
    const index = sortedByStock.findIndex(c => c.country.toLowerCase() === country);
    if (index >= 0) {
      const data = sortedByStock[index];
      console.log(`   - ${country.padEnd(15)}: Position #${(index+1).toString().padStart(2)} | Stock: ${data.totalCount}`);
    }
  });
  console.log('');
  
  // Test 4: Trier ALPHABÉTIQUE (comme le site pourrait afficher?)
  console.log('4️⃣ HYPOTHÈSE: Tri ALPHABÉTIQUE');
  console.log('-'.repeat(80));
  
  const sortedAlpha = [...googleCountries].sort((a, b) => a.country.localeCompare(b.country));
  
  console.log('   🔤 TOP 30 pays par ordre ALPHABÉTIQUE:');
  console.log('');
  sortedAlpha.slice(0, 30).forEach((c, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${c.country.padEnd(20)} | Rate: ${c.maxRate.toString().padStart(5)}% | Stock: ${c.totalCount.toString().padStart(6)}`);
  });
  console.log('');
  
  // Test 5: Services qui commencent par Amazon, Facebook, Telegram
  console.log('='.repeat(80));
  console.log('5️⃣ ANALYSE: Services Amazon, Facebook, Telegram');
  console.log('='.repeat(80));
  console.log('');
  
  const services = ['amazon', 'facebook', 'telegram'];
  
  for (const service of services) {
    console.log(`📱 SERVICE: ${service.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    const response = await fetch(`https://5sim.net/v1/guest/prices?product=${service}`);
    const data = await response.json();
    
    const countries = [];
    
    if (data[service]) {
      for (const [countryName, operators] of Object.entries(data[service])) {
        let maxRate = 0;
        let totalCount = 0;
        let minPrice = Infinity;
        
        for (const [operatorName, operatorData] of Object.entries(operators)) {
          const rate = operatorData.rate || 0;
          const count = operatorData.count || 0;
          const cost = operatorData.cost || 0;
          
          if (rate > maxRate) maxRate = rate;
          totalCount += count;
          if (cost < minPrice) minPrice = cost;
        }
        
        countries.push({
          country: countryName,
          maxRate,
          totalCount,
          minPrice: minPrice === Infinity ? 0 : minPrice
        });
      }
    }
    
    // Trier par rate DESC
    countries.sort((a, b) => {
      if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate;
      return b.totalCount - a.totalCount;
    });
    
    console.log(`   TOP 15 pays pour ${service}:`);
    console.log('');
    countries.slice(0, 15).forEach((c, i) => {
      console.log(`   ${(i+1).toString().padStart(2)}. ${c.country.padEnd(20)} | Rate: ${c.maxRate.toString().padStart(5)}% | Stock: ${c.totalCount.toString().padStart(6)} | Prix: ${c.minPrice}₽`);
    });
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('💡 CONCLUSION');
  console.log('='.repeat(80));
  console.log('');
  console.log('Pour Google, selon l\'API:');
  console.log(`  - Indonesia: position #${googleCountries.findIndex(c => c.country === 'indonesia') + 1}`);
  console.log(`  - Italy: position #${googleCountries.findIndex(c => c.country === 'italy') + 1}`);
  console.log(`  - England: position #${googleCountries.findIndex(c => c.country === 'england') + 1}`);
  console.log(`  - Canada: position #${googleCountries.findIndex(c => c.country === 'canada') + 1}`);
  console.log('');
  console.log('❓ Si tu vois ces pays en premier sur le site, il y a 2 possibilités:');
  console.log('   1. Le site utilise un tri DIFFÉRENT de l\'API (ex: prix, popularité locale)');
  console.log('   2. Le site affiche les pays FAVORIS/POPULAIRES en premier (hardcodé)');
  console.log('   3. Le site trie par DEMANDE (services les + commandés récemment)');
  console.log('');
}

deepAnalyze5simOrder().catch(console.error);
