/**
 * Test: Comment 5sim affiche les services VS notre plateforme
 * Analyse basée sur l'API publique 5sim
 */

async function analyzeServiceDisplay() {
  console.log('📊 ANALYSE: Comment 5sim affiche les SERVICES et NUMÉROS');
  console.log('');
  console.log('='.repeat(70));
  console.log('');

  // 1. Récupérer toutes les données 5sim
  console.log('⏳ Récupération des données 5sim...');
  const response = await fetch('https://5sim.net/v1/guest/prices');
  const allPrices = await response.json();
  
  const serviceStats = new Map();
  
  // Calculer les stats pour chaque service
  for (const [country, countryData] of Object.entries(allPrices)) {
    for (const [service, operators] of Object.entries(countryData)) {
      if (typeof operators !== 'object') continue;
      
      let totalStock = 0;
      let totalRate = 0;
      let rateCount = 0;
      
      for (const [op, data] of Object.entries(operators)) {
        totalStock += data.count || 0;
        if (data.rate) {
          totalRate += data.rate;
          rateCount++;
        }
      }
      
      if (!serviceStats.has(service)) {
        serviceStats.set(service, { 
          totalStock: 0, 
          countries: 0,
          avgRate: 0,
          rateSum: 0,
          rateCount: 0
        });
      }
      
      const current = serviceStats.get(service);
      current.totalStock += totalStock;
      current.countries += 1;
      current.rateSum += totalRate;
      current.rateCount += rateCount;
    }
  }
  
  // Calculer les moyennes
  for (const [service, stats] of serviceStats.entries()) {
    stats.avgRate = stats.rateCount > 0 ? stats.rateSum / stats.rateCount : 0;
  }
  
  console.log('✅ Données récupérées!');
  console.log('');
  
  // 2. Analyser le tri par STOCK TOTAL
  console.log('1️⃣ TRI PAR STOCK TOTAL (nombre de numéros disponibles)');
  console.log('-'.repeat(70));
  const sortedByStock = Array.from(serviceStats.entries())
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => b.totalStock - a.totalStock);
  
  console.log('   TOP 30 services les plus disponibles:');
  console.log('');
  sortedByStock.slice(0, 30).forEach((s, i) => {
    const rate = s.avgRate.toFixed(1);
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.service.padEnd(20)} | 📊 ${s.totalStock.toString().padStart(8)} nums | 🌍 ${s.countries.toString().padStart(3)} pays | ⭐ ${rate}%`);
  });
  console.log('');
  
  // 3. Analyser le tri par POPULARITÉ (nombre de pays)
  console.log('2️⃣ TRI PAR DISPONIBILITÉ GÉOGRAPHIQUE (nombre de pays)');
  console.log('-'.repeat(70));
  const sortedByCountries = Array.from(serviceStats.entries())
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => {
      if (b.countries !== a.countries) return b.countries - a.countries;
      return b.totalStock - a.totalStock;
    });
  
  console.log('   TOP 30 services les plus répandus:');
  console.log('');
  sortedByCountries.slice(0, 30).forEach((s, i) => {
    const rate = s.avgRate.toFixed(1);
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.service.padEnd(20)} | 🌍 ${s.countries.toString().padStart(3)} pays | 📊 ${s.totalStock.toString().padStart(8)} nums | ⭐ ${rate}%`);
  });
  console.log('');
  
  // 4. Analyser le tri par TAUX DE SUCCÈS
  console.log('3️⃣ TRI PAR TAUX DE SUCCÈS MOYEN (qualité)');
  console.log('-'.repeat(70));
  const sortedByRate = Array.from(serviceStats.entries())
    .map(([service, stats]) => ({ service, ...stats }))
    .filter(s => s.rateCount > 0)
    .sort((a, b) => b.avgRate - a.avgRate);
  
  console.log('   TOP 30 services avec meilleur taux de succès:');
  console.log('');
  sortedByRate.slice(0, 30).forEach((s, i) => {
    const rate = s.avgRate.toFixed(1);
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.service.padEnd(20)} | ⭐ ${rate.padStart(5)}% | 🌍 ${s.countries.toString().padStart(3)} pays | 📊 ${s.totalStock.toString().padStart(8)} nums`);
  });
  console.log('');
  
  // 5. CONCLUSION
  console.log('='.repeat(70));
  console.log('💡 CONCLUSION: Comment 5sim trie les services');
  console.log('='.repeat(70));
  console.log('');
  console.log('Sur le site 5sim.net, les services semblent triés par:');
  console.log('');
  console.log('  🥇 PRIORITÉ 1: STOCK TOTAL (disponibilité)');
  console.log('     → Plus un service a de numéros, plus il est visible');
  console.log('     → Exemple: ebay (2.8M nums), microsoft (2.7M nums)');
  console.log('');
  console.log('  🥈 PRIORITÉ 2: COUVERTURE GÉOGRAPHIQUE');
  console.log('     → Nombre de pays où le service est disponible');
  console.log('     → Exemple: google (146 pays), airbnb (145 pays)');
  console.log('');
  console.log('  🥉 PRIORITÉ 3: TAUX DE SUCCÈS');
  console.log('     → Qualité de livraison des SMS');
  console.log('     → Non utilisé pour le tri principal, mais affiché');
  console.log('');
  console.log('📋 RECOMMANDATION POUR NOTRE PLATEFORME:');
  console.log('');
  console.log('  ✅ Trier les services par STOCK TOTAL (comme 5sim)');
  console.log('  ✅ Afficher le nombre de numéros disponibles');
  console.log('  ✅ Afficher le nombre de pays couverts');
  console.log('  ✅ Mettre en avant les services les + populaires');
  console.log('');
  console.log('  TOP 5 services à mettre en avant:');
  sortedByStock.slice(0, 5).forEach((s, i) => {
    console.log(`     ${i+1}. ${s.service.toUpperCase()} - ${(s.totalStock / 1000000).toFixed(1)}M nums dans ${s.countries} pays`);
  });
  console.log('');
  console.log('='.repeat(70));
}

analyzeServiceDisplay().catch(console.error);
