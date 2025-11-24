/**
 * Test: Comment 5sim affiche les services
 * Doc: https://5sim.net/docs - Products request endpoint
 */

async function test5simProducts() {
  console.log('🔍 TEST: Comment 5sim affiche les SERVICES');
  console.log('');

  // Test 1: Products pour un pays spécifique (selon doc)
  console.log('1️⃣ Test endpoint /v1/guest/products/england/any');
  const response1 = await fetch('https://5sim.net/v1/guest/products/england/any');
  const products = await response1.json();
  
  console.log('   Exemple de services retournés:');
  const entries = Object.entries(products).slice(0, 10);
  entries.forEach(([name, data]) => {
    console.log(`   - ${name.padEnd(20)} | Qty: ${data.Qty.toString().padStart(6)} | Price: ${data.Price}₽ | Cat: ${data.Category}`);
  });
  console.log('');

  // Test 2: Prices endpoint (tous pays, tous services)
  console.log('2️⃣ Test endpoint /v1/guest/prices (global)');
  const response2 = await fetch('https://5sim.net/v1/guest/prices');
  const allPrices = await response2.json();
  
  console.log('   Nombre de pays:', Object.keys(allPrices).length);
  console.log('   Premier pays:', Object.keys(allPrices)[0]);
  
  const firstCountry = Object.keys(allPrices)[0];
  const services = Object.keys(allPrices[firstCountry]);
  console.log('   Services disponibles dans', firstCountry + ':', services.length);
  console.log('   Exemples:', services.slice(0, 10).join(', '));
  console.log('');

  // Test 3: Analyser l'ordre des services (popularité?)
  console.log('3️⃣ Analyse: Services triés par stock total');
  const serviceStats = new Map();
  
  // Parcourir tous les pays pour calculer stock total par service
  for (const [country, countryData] of Object.entries(allPrices)) {
    for (const [service, operators] of Object.entries(countryData)) {
      if (typeof operators !== 'object') continue;
      
      let totalStock = 0;
      for (const [op, data] of Object.entries(operators)) {
        totalStock += data.count || 0;
      }
      
      if (!serviceStats.has(service)) {
        serviceStats.set(service, { totalStock: 0, countries: 0 });
      }
      
      const current = serviceStats.get(service);
      current.totalStock += totalStock;
      current.countries += 1;
    }
  }
  
  // Trier par stock total
  const sortedByStock = Array.from(serviceStats.entries())
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => b.totalStock - a.totalStock);
  
  console.log('   🏆 TOP 20 services par STOCK TOTAL (tous pays):');
  sortedByStock.slice(0, 20).forEach((s, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.service.padEnd(20)} | Stock: ${s.totalStock.toString().padStart(8)} | Pays: ${s.countries}`);
  });
  console.log('');

  // Test 4: Trier par nombre de pays
  const sortedByCountries = Array.from(serviceStats.entries())
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => b.countries - a.countries);
  
  console.log('4️⃣ TOP 20 services par NOMBRE DE PAYS:');
  sortedByCountries.slice(0, 20).forEach((s, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.service.padEnd(20)} | Pays: ${s.countries.toString().padStart(3)} | Stock: ${s.totalStock.toString().padStart(8)}`);
  });
  console.log('');

  console.log('💡 CONCLUSION:');
  console.log('   5sim semble trier les services par:');
  console.log('   1. Stock total disponible (tous pays confondus)');
  console.log('   2. Disponibilité géographique (nombre de pays)');
  console.log('');
  console.log('   Les 5 services les + populaires:');
  sortedByStock.slice(0, 5).forEach((s, i) => {
    console.log(`   ${i+1}. ${s.service} - ${s.totalStock} numéros dans ${s.countries} pays`);
  });
}

test5simProducts().catch(console.error);
