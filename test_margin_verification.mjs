import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.76FqFqjBKdLPOqLgGxYvSFPNxh_2O3U6d-CKgCFavPg';

async function testMarginVerification() {
  console.log('========================================');
  console.log('🔍 VÉRIFICATION DE LA MARGE DE PRIX');
  console.log('========================================\n');

  // 1. Récupérer la marge configurée
  const { data: marginSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'pricing_margin_percentage')
    .single();

  const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30;
  console.log(`📊 Marge configurée dans admin: ${marginPercentage}%`);
  console.log(`   Multiplicateur: x${(1 + marginPercentage / 100).toFixed(2)}\n`);

  // Constantes de conversion
  const USD_TO_FCFA = 600;
  const FCFA_TO_COINS = 100;

  // ========================================
  // TEST 1: ACTIVATION (get-top-countries-by-service)
  // ========================================
  console.log('========================================');
  console.log('📱 TEST 1: ACTIVATION');
  console.log('========================================\n');

  try {
    const activationResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/get-top-countries-by-service`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({ service: 'tg' }) // Telegram
      }
    );

    const activationData = await activationResponse.json();

    if (activationData.success && activationData.countries?.length > 0) {
      console.log(`✅ ${activationData.countries.length} pays trouvés pour Telegram\n`);
      
      // Prendre les 3 premiers pays
      const testCountries = activationData.countries.slice(0, 3);
      
      console.log('Vérification des prix (3 premiers pays):');
      console.log('─'.repeat(70));
      
      for (const country of testCountries) {
        // Le prix USD original n'est pas retourné, mais on peut calculer à l'envers
        const priceWithMargin = country.price;
        const estimatedPriceCoins = priceWithMargin / (1 + marginPercentage / 100);
        const estimatedPriceFCFA = estimatedPriceCoins * FCFA_TO_COINS;
        const estimatedPriceUSD = estimatedPriceFCFA / USD_TO_FCFA;
        
        console.log(`\n${country.countryName} (${country.countryCode}):`);
        console.log(`   Prix affiché: ${priceWithMargin} Ⓐ`);
        console.log(`   Stock: ${country.count} numéros`);
        console.log(`   Estimation prix base: ~$${estimatedPriceUSD.toFixed(2)} USD`);
      }
      
      // Vérification manuelle avec un prix connu
      console.log('\n\n📐 Vérification du calcul:');
      console.log('─'.repeat(70));
      const samplePrice = testCountries[0]?.price || 0;
      console.log(`Si prix affiché = ${samplePrice} Ⓐ avec marge ${marginPercentage}%:`);
      const baseCoins = samplePrice / (1 + marginPercentage / 100);
      const baseFCFA = baseCoins * FCFA_TO_COINS;
      const baseUSD = baseFCFA / USD_TO_FCFA;
      console.log(`   Prix sans marge: ${baseCoins.toFixed(2)} Ⓐ`);
      console.log(`   En FCFA: ${baseFCFA.toFixed(0)} FCFA`);
      console.log(`   En USD: $${baseUSD.toFixed(3)}`);
    } else {
      console.log('❌ Erreur activation:', activationData);
    }
  } catch (error) {
    console.log('❌ Erreur API activation:', error.message);
  }

  // ========================================
  // TEST 2: RENT (get-rent-services)
  // ========================================
  console.log('\n\n========================================');
  console.log('🏠 TEST 2: LOCATION (RENT)');
  console.log('========================================\n');

  try {
    // Test avec un pays spécifique (Russia = 0)
    const rentResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/get-rent-services`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({ 
          country: '0', // Russia
          rentTime: '4' // 4 heures
        })
      }
    );

    const rentData = await rentResponse.json();

    if (rentData.success && rentData.services?.length > 0) {
      console.log(`✅ ${rentData.services.length} services de location trouvés\n`);
      
      // Prendre les 3 premiers services
      const testServices = rentData.services.slice(0, 3);
      
      console.log('Vérification des prix (3 premiers services):');
      console.log('─'.repeat(70));
      
      for (const service of testServices) {
        const costUSD = service.cost || 0;
        const sellingPrice = service.sellingPrice || 0;
        
        // Calcul attendu
        const priceFCFA = costUSD * USD_TO_FCFA;
        const priceCoins = priceFCFA / FCFA_TO_COINS;
        const expectedPrice = Math.ceil(priceCoins * (1 + marginPercentage / 100));
        
        const isCorrect = sellingPrice === expectedPrice;
        
        console.log(`\nService: ${service.code}`);
        console.log(`   Coût API: $${costUSD.toFixed(2)} USD`);
        console.log(`   Prix affiché: ${sellingPrice} Ⓐ`);
        console.log(`   Prix attendu: ${expectedPrice} Ⓐ (avec ${marginPercentage}% marge)`);
        console.log(`   Calcul: $${costUSD} × 600 = ${priceFCFA}F ÷ 100 = ${priceCoins.toFixed(2)}Ⓐ × ${(1 + marginPercentage/100).toFixed(2)} = ${(priceCoins * (1 + marginPercentage/100)).toFixed(2)}Ⓐ`);
        console.log(`   Statut: ${isCorrect ? '✅ CORRECT' : '⚠️ DIFFÉRENT'}`);
      }
    } else {
      console.log('❌ Erreur rent:', rentData);
    }
  } catch (error) {
    console.log('❌ Erreur API rent:', error.message);
  }

  // ========================================
  // TEST 3: Vérifier pricing_rules en DB
  // ========================================
  console.log('\n\n========================================');
  console.log('💾 TEST 3: PRIX EN BASE DE DONNÉES');
  console.log('========================================\n');

  const { data: pricingRules } = await supabase
    .from('pricing_rules')
    .select('service_code, country_code, activation_cost, activation_price, margin_percentage')
    .limit(5);

  if (pricingRules?.length > 0) {
    console.log('Exemples de pricing_rules stockés:');
    console.log('─'.repeat(70));
    
    for (const rule of pricingRules) {
      console.log(`\n${rule.service_code} @ ${rule.country_code}:`);
      console.log(`   Coût: ${rule.activation_cost}`);
      console.log(`   Prix vente: ${rule.activation_price} Ⓐ`);
      console.log(`   Marge stockée: ${rule.margin_percentage}%`);
    }
  }

  console.log('\n\n========================================');
  console.log('📋 RÉSUMÉ');
  console.log('========================================\n');
  console.log(`Marge configurée: ${marginPercentage}%`);
  console.log(`Formule: Prix USD × 600 (FCFA) ÷ 100 (Coins) × ${(1 + marginPercentage/100).toFixed(2)} (marge)`);
  console.log('\nExemple: $1.00 USD → 600 FCFA → 6 Ⓐ → ' + Math.ceil(6 * (1 + marginPercentage/100)) + ' Ⓐ avec marge');
}

testMarginVerification().catch(console.error);
