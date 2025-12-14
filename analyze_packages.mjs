import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function analyze() {
  // 1. Packages actuels
  const { data: packages } = await supabase
    .from('activation_packages')
    .select('*')
    .order('activations', { ascending: true });
  
  // 2. Récupérer des prix réels de services populaires
  const { data: pricingRules } = await supabase
    .from('pricing_rules')
    .select('service_code, country_code, activation_price, available_count')
    .eq('active', true)
    .gt('available_count', 0)
    .gt('activation_price', 0)
    .order('available_count', { ascending: false })
    .limit(20);
  
  console.log('');
  console.log('========================================================================');
  console.log('          ANALYSE COMPLETE DES PACKAGES DE PRIX');
  console.log('========================================================================');
  console.log('');
  
  // Afficher les packages
  console.log('PACKAGES ACTUELS:');
  console.log('------------------------------------------------------------------------');
  console.log('| Activations | Prix FCFA  | Prix/Unite | Economie | Populaire | Actif |');
  console.log('|-------------|------------|------------|----------|-----------|-------|');
  
  packages?.forEach(pkg => {
    const perUnit = Math.round(pkg.price_xof / pkg.activations);
    const pop = pkg.is_popular ? '   *    ' : '        ';
    const active = pkg.is_active ? '  OK  ' : ' NON  ';
    console.log(`| ${String(pkg.activations).padStart(11)} | ${String(pkg.price_xof.toLocaleString()).padStart(10)} | ${String(perUnit + ' F').padStart(10)} | ${String(pkg.savings_percentage + '%').padStart(8)} | ${pop} | ${active}|`);
  });
  
  console.log('');
  console.log('');
  
  // Prix réels
  console.log('PRIX REELS DES SERVICES (Top 20 disponibles):');
  console.log('------------------------------------------------------------------------');
  
  if (pricingRules && pricingRules.length > 0) {
    pricingRules.forEach(rule => {
      const priceFCFA = rule.activation_price * 100;
      console.log(`   ${rule.service_code.padEnd(12)} @ ${rule.country_code.padEnd(12)}: ${String(rule.activation_price).padStart(4)} A = ${String(priceFCFA).padStart(6)} FCFA (${rule.available_count} dispos)`);
    });
    
    const prices = pricingRules.map(r => r.activation_price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    console.log('');
    console.log('STATISTIQUES DES PRIX:');
    console.log('------------------------------------------------------------------------');
    console.log(`   Prix minimum: ${minPrice} A = ${minPrice * 100} FCFA`);
    console.log(`   Prix maximum: ${maxPrice} A = ${maxPrice * 100} FCFA`);
    console.log(`   Prix moyen:   ${avgPrice.toFixed(1)} A = ${(avgPrice * 100).toFixed(0)} FCFA`);
  } else {
    console.log('   Aucune regle de prix trouvee dans pricing_rules');
  }
  
  console.log('');
  console.log('');
  
  // Analyse des problèmes
  console.log('PROBLEMES DETECTES:');
  console.log('------------------------------------------------------------------------');
  
  let issues = [];
  
  packages?.forEach(pkg => {
    const perUnit = pkg.price_xof / pkg.activations;
    
    // Vérifier incohérences
    if (pkg.activations === 50 && perUnit > 200) {
      issues.push(`[ERREUR] Package 50A: Prix/unite = ${perUnit}F (trop cher vs autres packages)`);
    }
    if (pkg.activations === 100 && pkg.price_xof === 19900) {
      const pkg200 = packages?.find(p => p.activations === 200);
      if (pkg200 && pkg200.price_xof === 19900) {
        issues.push(`[ERREUR] Package 100A et 200A ont le MEME prix (19,900 FCFA) - INCOHERENT`);
      }
    }
    if (pkg.price_eur === 0 || pkg.price_usd === 0) {
      issues.push(`[WARN] Package ${pkg.activations}A: Prix EUR/USD = 0 (non configure)`);
    }
  });
  
  // Vérifier cohérence progressive des prix
  const sortedByActivations = [...(packages || [])].sort((a, b) => a.activations - b.activations);
  for (let i = 1; i < sortedByActivations.length; i++) {
    const prev = sortedByActivations[i - 1];
    const curr = sortedByActivations[i];
    const prevPerUnit = prev.price_xof / prev.activations;
    const currPerUnit = curr.price_xof / curr.activations;
    
    if (currPerUnit > prevPerUnit) {
      issues.push(`[ERREUR] Inversion: ${curr.activations}A coute ${currPerUnit.toFixed(0)}F/u vs ${prev.activations}A = ${prevPerUnit.toFixed(0)}F/u`);
    }
  }
  
  // Vérifier les % economie affichés vs réels
  packages?.forEach(pkg => {
    const perUnit = pkg.price_xof / pkg.activations;
    const basePerUnit = 100; // Prix de base = 100F/activation
    const realSavings = Math.round((1 - perUnit / basePerUnit) * 100);
    
    if (pkg.savings_percentage > 0 && realSavings < 5) {
      issues.push(`[WARN] Package ${pkg.activations}A: Affiche ${pkg.savings_percentage}% economie mais reduction reelle = ${realSavings}%`);
    }
  });
  
  if (issues.length === 0) {
    console.log('   Aucun probleme detecte');
  } else {
    issues.forEach(issue => console.log('   ' + issue));
  }
  
  console.log('');
  console.log('');
  
  // Recommandations
  console.log('========================================================================');
  console.log('                    RECOMMANDATIONS');
  console.log('========================================================================');
  console.log('');
  
  // Calculer les packages recommandés
  const basePrice = 100; // 100 FCFA = 1 activation
  const recommendations = [
    { activations: 5, discount: 0, popular: false },
    { activations: 10, discount: 5, popular: false },
    { activations: 20, discount: 10, popular: true },
    { activations: 50, discount: 15, popular: false },
    { activations: 100, discount: 20, popular: false },
    { activations: 200, discount: 25, popular: false },
    { activations: 500, discount: 30, popular: false },
  ];
  
  console.log('PACKAGES RECOMMANDES (tarification progressive):');
  console.log('------------------------------------------------------------------------');
  console.log('| Activations | Prix FCFA  | Prix/Unite | Economie | Populaire |');
  console.log('|-------------|------------|------------|----------|-----------|');
  
  recommendations.forEach(rec => {
    const fullPrice = rec.activations * basePrice;
    const discountedPrice = Math.round(fullPrice * (1 - rec.discount / 100));
    const perUnit = Math.round(discountedPrice / rec.activations);
    const pop = rec.popular ? '   *    ' : '        ';
    console.log(`| ${String(rec.activations).padStart(11)} | ${String(discountedPrice.toLocaleString()).padStart(10)} | ${String(perUnit + ' F').padStart(10)} | ${String(rec.discount + '%').padStart(8)} | ${pop} |`);
  });
  
  console.log('');
  console.log('NOTES:');
  console.log('  - Prix de base: 100 FCFA = 1 activation (1 A)');
  console.log('  - Plus le volume est grand, plus la reduction est importante');
  console.log('  - Le package "populaire" devrait etre celui avec le meilleur rapport qualite/prix');
  console.log('');
  
  process.exit(0);
}

analyze().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
