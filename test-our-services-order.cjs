/**
 * Test: Comment NOUS trions les services
 * Comparer avec la logique 5sim
 */

const Database = require('better-sqlite3');

async function testOurServicesOrder() {
  console.log('🔍 TEST: Comment NOTRE plateforme trie les services');
  console.log('');

  const db = new Database('./sms-platform.db', { readonly: true });

  // 1. Voir l'ordre actuel des services dans notre DB
  console.log('1️⃣ Ordre actuel dans notre base de données:');
  const services = db.prepare(`
    SELECT id, name, code, icon, display_order
    FROM services 
    WHERE is_active = 1
    ORDER BY display_order ASC, name ASC
    LIMIT 20
  `).all();

  services.forEach((s, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.name.padEnd(20)} | Code: ${s.code.padEnd(15)} | Order: ${s.display_order || 'null'}`);
  });
  console.log('');

  // 2. Calculer le stock total pour chaque service (via 5sim)
  console.log('2️⃣ Calcul du STOCK TOTAL par service (depuis 5sim):');
  const response = await fetch('https://5sim.net/v1/guest/prices');
  const allPrices = await response.json();
  
  const serviceStats = new Map();
  
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
  
  const sortedByStock = Array.from(serviceStats.entries())
    .map(([service, stats]) => ({ service, ...stats }))
    .sort((a, b) => b.totalStock - a.totalStock);
  
  console.log('   TOP 20 services par stock (5sim):');
  sortedByStock.slice(0, 20).forEach((s, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.service.padEnd(20)} | Stock: ${s.totalStock.toString().padStart(8)} | Pays: ${s.countries}`);
  });
  console.log('');

  // 3. Comparer avec nos services
  console.log('3️⃣ COMPARAISON: Nos services vs 5sim popularité');
  console.log('');
  
  const ourServiceCodes = services.map(s => s.code.toLowerCase());
  
  console.log('   Services populaires 5sim absents de notre liste:');
  let missing = 0;
  sortedByStock.slice(0, 30).forEach(s => {
    if (!ourServiceCodes.includes(s.service.toLowerCase())) {
      console.log(`   ❌ ${s.service.padEnd(20)} - Stock: ${s.totalStock.toString().padStart(8)}`);
      missing++;
    }
  });
  if (missing === 0) console.log('   ✅ Tous les services populaires sont présents!');
  console.log('');

  // 4. Vérifier l'ordre de nos services
  console.log('4️⃣ RECOMMANDATION: Ordre suggéré basé sur 5sim:');
  const ourServicesWithStats = services.map(s => {
    const stats = serviceStats.get(s.code.toLowerCase());
    return {
      ...s,
      totalStock: stats?.totalStock || 0,
      countries: stats?.countries || 0
    };
  });

  ourServicesWithStats.sort((a, b) => b.totalStock - a.totalStock);
  
  ourServicesWithStats.slice(0, 20).forEach((s, i) => {
    const current = services.findIndex(srv => srv.id === s.id) + 1;
    const change = current - (i + 1);
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '=';
    console.log(`   ${(i+1).toString().padStart(2)}. ${s.name.padEnd(20)} | Stock: ${s.totalStock.toString().padStart(8)} | ${arrow} (actuel: ${current})`);
  });
  console.log('');

  console.log('💡 CONCLUSION:');
  console.log('   5sim trie les services par STOCK TOTAL (popularité globale)');
  console.log('   Nous devrions faire pareil pour:');
  console.log('   ✅ Montrer les services les + demandés en premier');
  console.log('   ✅ Améliorer UX (utilisateurs trouvent rapidement)');
  console.log('   ✅ Aligner avec les standards du marché');
  
  db.close();
}

testOurServicesOrder().catch(console.error);
