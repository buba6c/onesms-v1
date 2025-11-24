const SERVICE = 'google';

async function testGoogle() {
  console.log('🔍 Test pour:', SERVICE);
  console.log('');

  const response = await fetch(`https://5sim.net/v1/guest/prices?product=${SERVICE}`);
  const data = await response.json();
  
  const serviceData = data[SERVICE];
  if (!serviceData) {
    console.error('❌ Service introuvable');
    return;
  }

  const countries = [];
  for (const [countryName, operators] of Object.entries(serviceData)) {
    let totalCount = 0;
    let totalCost = 0;
    let maxRate = 0;
    let operatorCount = 0;

    for (const [opName, opData] of Object.entries(operators)) {
      totalCount += opData.count || 0;
      totalCost += opData.cost || 0;
      operatorCount++;
      const rate = opData.rate || 0;
      if (rate > maxRate) maxRate = rate;
    }

    if (operatorCount > 0) {
      countries.push({
        country: countryName,
        totalCount,
        avgCost: (totalCost / operatorCount).toFixed(2),
        maxRate
      });
    }
  }

  // Tri par rate DESC puis count DESC
  countries.sort((a, b) => {
    if (b.maxRate !== a.maxRate) return b.maxRate - a.maxRate;
    return b.totalCount - a.totalCount;
  });

  console.log('🏆 TOP 15 PAYS pour Google (selon 5sim):');
  console.log('═'.repeat(70));
  countries.slice(0, 15).forEach((c, i) => {
    const rank = (i + 1).toString().padStart(2);
    const name = c.country.padEnd(20);
    const rate = c.maxRate.toString().padStart(6);
    const count = c.totalCount.toString().padStart(8);
    const price = c.avgCost.toString().padStart(7);
    console.log(`${rank}. ${name} | Rate: ${rate}% | Stock: ${count} | Prix: ${price}₽`);
  });
  console.log('');
  console.log('📊 Stats:', countries.length, 'pays disponibles');
}

testGoogle();
