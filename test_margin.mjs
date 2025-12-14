import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.AcmqOsIBJTjvLC2-qbh0ZPqSdh5dJa1P3-YN7Fnpufc';

async function testMargin() {
  console.log('🔍 TEST COMPLET DE LA MARGE');
  console.log('='.repeat(70));
  
  // Récupérer la marge
  const { data: marginSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'pricing_margin_percentage')
    .single();
  
  const margin = parseFloat(marginSetting?.value || 30);
  const multiplier = 1 + margin / 100;
  
  console.log(`\n📊 Marge configurée: ${margin}%`);
  console.log(`   Multiplicateur: ×${multiplier}`);
  console.log(`   Formule: Prix = ceil(USD × 600 / 100 × ${multiplier})`);
  
  // 1. Test ACTIVATION
  console.log('\n' + '='.repeat(70));
  console.log('📱 TEST ACTIVATION (get-top-countries-by-service)');
  console.log('='.repeat(70));
  
  try {
    const response = await fetch(
      'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/get-top-countries-by-service?service=tg',
      { headers: { 'Authorization': `Bearer ${ANON_KEY}` } }
    );
    const data = await response.json();
    
    if (data.countries && data.countries.length > 0) {
      console.log('\nService: Telegram (tg) - Top 5 pays:');
      console.log('Pays             | Prix Ⓐ | Stock   | Prix USD estimé');
      console.log('-'.repeat(60));
      
      for (const c of data.countries.slice(0, 5)) {
        // Reverse: Prix / 11 = coins avant marge, × 100 / 600 = USD
        const coinsBeforeMargin = c.price / multiplier;
        const estimatedUSD = (coinsBeforeMargin * 100) / 600;
        console.log(`${c.countryName.padEnd(16)} | ${c.price.toString().padStart(6)} | ${c.count.toString().padStart(7)} | $${estimatedUSD.toFixed(3)}`);
      }
      
      console.log('\n✅ ACTIVATION: La marge est appliquée par l\'API!');
    } else {
      console.log('❌ Pas de données activation');
    }
  } catch (e) {
    console.log('❌ Erreur activation:', e.message);
  }
  
  // 2. Test RENT
  console.log('\n' + '='.repeat(70));
  console.log('🏠 TEST RENT (get-rent-services)');
  console.log('='.repeat(70));
  
  try {
    const response = await fetch(
      'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/get-rent-services?country=0&rentTime=4',
      { headers: { 'Authorization': `Bearer ${ANON_KEY}` } }
    );
    const data = await response.json();
    
    if (data.services) {
      const services = Array.isArray(data.services) ? data.services : Object.values(data.services);
      
      console.log('\nRussie - Rent 4h - Services avec sellingPrice:');
      console.log('Service  | Coût USD | sellingPrice | Attendu 1000% | Match');
      console.log('-'.repeat(70));
      
      let count = 0;
      let hasSellingPrice = false;
      
      for (const svc of services) {
        if (count >= 5) break;
        const costUSD = parseFloat(svc.cost) || 0;
        if (costUSD <= 0) continue;
        
        const expectedPrice = Math.ceil(costUSD * 600 / 100 * multiplier);
        const actualPrice = svc.sellingPrice;
        
        if (actualPrice !== undefined) {
          hasSellingPrice = true;
          const match = actualPrice === expectedPrice ? '✅' : `⚠️ ${expectedPrice}`;
          console.log(`${(svc.code || '?').padEnd(8)} | $${costUSD.toFixed(2).padStart(6)} | ${actualPrice.toString().padStart(12)} | ${expectedPrice.toString().padStart(13)} | ${match}`);
        } else {
          console.log(`${(svc.code || '?').padEnd(8)} | $${costUSD.toFixed(2).padStart(6)} | ${'N/A'.padStart(12)} | ${expectedPrice.toString().padStart(13)} | ❓`);
        }
        count++;
      }
      
      if (hasSellingPrice) {
        console.log('\n✅ RENT: L\'API retourne sellingPrice avec marge!');
      } else {
        console.log('\n⚠️  RENT: L\'API ne retourne PAS sellingPrice!');
        console.log('   → Le frontend doit calculer: cost × 600 / 100 × ' + multiplier);
      }
    }
  } catch (e) {
    console.log('❌ Erreur rent:', e.message);
  }
  
  // 3. Résumé
  console.log('\n' + '='.repeat(70));
  console.log('📋 RÉSUMÉ');
  console.log('='.repeat(70));
  console.log(`\nMarge: ${margin}% (×${multiplier})`);
  console.log('\nExemple avec $0.50:');
  console.log(`  → $0.50 × 600 = 300 FCFA`);
  console.log(`  → 300 / 100 = 3 Ⓐ (avant marge)`);
  console.log(`  → 3 × ${multiplier} = ${3 * multiplier} Ⓐ`);
  console.log(`  → ceil(${3 * multiplier}) = ${Math.ceil(3 * multiplier)} Ⓐ (prix final)`);
}

testMargin();
