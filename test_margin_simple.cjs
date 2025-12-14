// Test de vérification de la marge - Version simplifiée
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function testMargin() {
  console.log('========================================');
  console.log('VERIFICATION DE LA MARGE DE PRIX');
  console.log('========================================\n');

  // 1. Recuperer la marge configuree
  const { data: marginSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'pricing_margin_percentage')
    .single();

  const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30;
  console.log('Marge configuree dans admin: ' + marginPercentage + '%');
  console.log('Multiplicateur: x' + (1 + marginPercentage / 100).toFixed(2) + '\n');

  // Constantes de conversion
  const USD_TO_FCFA = 600;
  const FCFA_TO_COINS = 100;

  // 2. Verifier pricing_rules en DB (ACTIVATION)
  console.log('========================================');
  console.log('TEST ACTIVATION - pricing_rules en DB');
  console.log('========================================\n');

  const { data: pricingRules } = await supabase
    .from('pricing_rules')
    .select('service_code, country_code, activation_cost, activation_price, margin_percentage')
    .gt('activation_price', 0)
    .limit(5);

  if (pricingRules && pricingRules.length > 0) {
    console.log('Exemples de prix ACTIVATION stockes:\n');
    
    for (const rule of pricingRules) {
      // Le activation_cost est stocke en USD * 0.7 (voir sync-sms-activate)
      // Donc le vrai cout USD serait activation_cost / 0.7
      const estimatedCostUSD = rule.activation_cost / 0.7;
      
      // Calcul attendu avec la marge stockee
      const priceFCFA = estimatedCostUSD * USD_TO_FCFA;
      const priceCoins = priceFCFA / FCFA_TO_COINS;
      const expectedPrice = Math.ceil(priceCoins * (1 + rule.margin_percentage / 100));
      
      console.log(rule.service_code + ' @ ' + rule.country_code + ':');
      console.log('   Cout stocke: ' + rule.activation_cost + ' (USD*0.7)');
      console.log('   Prix vente: ' + rule.activation_price + ' coins');
      console.log('   Marge stockee: ' + rule.margin_percentage + '%');
      console.log('   Prix attendu: ~' + expectedPrice + ' coins');
      console.log('   Statut: ' + (Math.abs(rule.activation_price - expectedPrice) < 5 ? 'OK' : 'DIFFERENT'));
      console.log('');
    }
  } else {
    console.log('Aucune pricing_rules trouvee');
  }

  // 3. Verifier rent_services en DB (RENT/LOCATION)
  console.log('========================================');
  console.log('TEST RENT - rent_services en DB');
  console.log('========================================\n');

  const { data: rentServices } = await supabase
    .from('rent_services')
    .select('service_code, country_code, rent_cost, rent_price')
    .gt('rent_price', 0)
    .limit(5);

  if (rentServices && rentServices.length > 0) {
    console.log('Exemples de prix RENT stockes:\n');
    
    for (const rent of rentServices) {
      // Calcul attendu
      const priceFCFA = rent.rent_cost * USD_TO_FCFA;
      const priceCoins = priceFCFA / FCFA_TO_COINS;
      const expectedPrice = Math.ceil(priceCoins * (1 + marginPercentage / 100));
      
      console.log(rent.service_code + ' @ ' + rent.country_code + ':');
      console.log('   Cout USD: $' + rent.rent_cost);
      console.log('   Prix vente: ' + rent.rent_price + ' coins');
      console.log('   Calcul: $' + rent.rent_cost + ' x 600 = ' + priceFCFA + 'F / 100 = ' + priceCoins.toFixed(2) + ' x ' + (1 + marginPercentage/100).toFixed(2) + ' = ' + (priceCoins * (1 + marginPercentage/100)).toFixed(2));
      console.log('   Prix attendu: ' + expectedPrice + ' coins');
      console.log('   Statut: ' + (rent.rent_price === expectedPrice ? 'CORRECT' : 'DIFFERENT'));
      console.log('');
    }
  } else {
    console.log('Verification via pricing_rules pour rent...\n');
    
    const { data: rentPricing } = await supabase
      .from('pricing_rules')
      .select('service_code, country_code, rent_cost, rent_price, margin_percentage')
      .gt('rent_price', 0)
      .limit(5);
      
    if (rentPricing && rentPricing.length > 0) {
      for (const rent of rentPricing) {
        const priceFCFA = rent.rent_cost * USD_TO_FCFA;
        const priceCoins = priceFCFA / FCFA_TO_COINS;
        const expectedPrice = Math.ceil(priceCoins * (1 + rent.margin_percentage / 100));
        
        console.log(rent.service_code + ' @ ' + rent.country_code + ':');
        console.log('   Cout USD: $' + rent.rent_cost);
        console.log('   Prix vente: ' + rent.rent_price + ' coins');
        console.log('   Marge: ' + rent.margin_percentage + '%');
        console.log('');
      }
    }
  }

  // 4. Resume
  console.log('========================================');
  console.log('RESUME');
  console.log('========================================\n');
  console.log('Marge configuree: ' + marginPercentage + '%');
  console.log('Formule: Prix USD x 600 (FCFA) / 100 (Coins) x ' + (1 + marginPercentage/100).toFixed(2) + ' (marge)');
  console.log('');
  console.log('Exemple avec $1.00 USD:');
  const examplePriceFCFA = 1 * USD_TO_FCFA;
  const examplePriceCoins = examplePriceFCFA / FCFA_TO_COINS;
  const exampleFinalPrice = Math.ceil(examplePriceCoins * (1 + marginPercentage / 100));
  console.log('   $1.00 x 600 = ' + examplePriceFCFA + ' FCFA');
  console.log('   ' + examplePriceFCFA + ' / 100 = ' + examplePriceCoins + ' coins');
  console.log('   ' + examplePriceCoins + ' x ' + (1 + marginPercentage/100).toFixed(2) + ' = ' + exampleFinalPrice + ' coins (prix final)');
}

testMargin().catch(console.error);
