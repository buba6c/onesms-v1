import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // Vérifier virtual_numbers
  const { data: numbers, error } = await supabase
    .from('virtual_numbers')
    .select('service, price_paid, country_code, type')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.log('Erreur:', error);
    return;
  }
  
  console.log('═'.repeat(70));
  console.log('📊 ANALYSE DES PRIX DES SERVICES (virtual_numbers)');
  console.log('═'.repeat(70));
  console.log('\nNombre de numéros analysés:', numbers?.length);
  
  if (numbers && numbers.length > 0) {
    const prices = numbers.map(n => n.price_paid).filter(p => p > 0);
    
    if (prices.length === 0) {
      console.log('Aucun prix > 0 trouvé');
      return;
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a,b) => a+b, 0) / prices.length;
    const sortedPrices = [...prices].sort((a,b) => a-b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length/2)];
    
    console.log('\n📈 STATISTIQUES GLOBALES:');
    console.log('─'.repeat(40));
    console.log(`  Prix MIN:    ${minPrice} FCFA`);
    console.log(`  Prix MAX:    ${maxPrice} FCFA`);
    console.log(`  Prix MOYEN:  ${avgPrice.toFixed(0)} FCFA`);
    console.log(`  Prix MÉDIAN: ${medianPrice} FCFA`);
    
    // Distribution
    console.log('\n📊 DISTRIBUTION DES PRIX:');
    console.log('─'.repeat(40));
    const ranges = [
      { min: 0, max: 50, count: 0 },
      { min: 50, max: 100, count: 0 },
      { min: 100, max: 150, count: 0 },
      { min: 150, max: 200, count: 0 },
      { min: 200, max: 300, count: 0 },
      { min: 300, max: 500, count: 0 },
      { min: 500, max: 1000, count: 0 },
      { min: 1000, max: 5000, count: 0 },
    ];
    
    prices.forEach(price => {
      for (const range of ranges) {
        if (price >= range.min && price < range.max) {
          range.count++;
          break;
        }
      }
    });
    
    ranges.forEach(r => {
      if (r.count > 0) {
        const pct = ((r.count / prices.length) * 100).toFixed(1);
        const bar = '█'.repeat(Math.ceil(r.count / 3));
        console.log(`  ${String(r.min).padStart(4)}-${String(r.max).padEnd(4)} F: ${String(r.count).padStart(3)} (${pct.padStart(5)}%) ${bar}`);
      }
    });
    
    // Par service
    console.log('\n🔥 TOP SERVICES PAR NOMBRE D\'ACHATS:');
    console.log('─'.repeat(60));
    
    const byService = {};
    numbers.forEach(n => {
      const key = n.service || 'unknown';
      if (!byService[key]) {
        byService[key] = { count: 0, prices: [] };
      }
      byService[key].count++;
      if (n.price_paid > 0) byService[key].prices.push(n.price_paid);
    });
    
    const sortedServices = Object.entries(byService)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);
    
    console.log('Service'.padEnd(25) + 'Achats'.padStart(8) + 'Prix Moy'.padStart(12) + 'Min'.padStart(8) + 'Max'.padStart(8));
    console.log('─'.repeat(61));
    
    sortedServices.forEach(([service, stats]) => {
      const avg = stats.prices.length > 0 
        ? (stats.prices.reduce((a,b) => a+b, 0) / stats.prices.length).toFixed(0)
        : '-';
      const min = stats.prices.length > 0 ? Math.min(...stats.prices) : 0;
      const max = stats.prices.length > 0 ? Math.max(...stats.prices) : 0;
      
      console.log(
        service.substring(0, 23).padEnd(25) +
        String(stats.count).padStart(8) +
        `${avg} F`.padStart(12) +
        `${min} F`.padStart(8) +
        `${max} F`.padStart(8)
      );
    });

    // RECOMMANDATIONS
    const prixMoyen = Math.round(avgPrice);
    console.log('\n═'.repeat(70));
    console.log('💡 RECOMMANDATIONS DE PRIX POUR LES PACKAGES');
    console.log('═'.repeat(70));
    console.log(`\n📌 Prix moyen d'une activation: ${prixMoyen} FCFA`);
    
    // Récupérer packages actuels
    const { data: packages } = await supabase
      .from('activation_packages')
      .select('*')
      .order('activations', { ascending: true });
    
    const recommendations = [
      { activations: 5, discount: 0 },
      { activations: 10, discount: 5 },
      { activations: 20, discount: 10 },
      { activations: 50, discount: 15 },
      { activations: 100, discount: 20 },
      { activations: 200, discount: 25 },
      { activations: 500, discount: 30 },
      { activations: 1000, discount: 35 },
    ];
    
    console.log('\n📋 COMPARAISON PRIX ACTUELS vs RECOMMANDÉS:');
    console.log('─'.repeat(70));
    console.log('Pack'.padEnd(10) + 'Actuel'.padStart(12) + 'Recommandé'.padStart(14) + 'Diff'.padStart(10) + 'Action'.padStart(20));
    console.log('─'.repeat(66));
    
    recommendations.forEach(rec => {
      const prixBase = rec.activations * prixMoyen;
      const prixRecommande = Math.round(prixBase * (1 - rec.discount / 100));
      const prixArrondi = Math.round(prixRecommande / 100) * 100;
      
      const currentPack = packages?.find(p => p.activations === rec.activations);
      const prixActuel = currentPack ? currentPack.price_xof : null;
      
      let diff = '-';
      let action = '';
      
      if (prixActuel !== null) {
        const diffValue = prixArrondi - prixActuel;
        diff = diffValue > 0 ? `+${diffValue.toLocaleString()}` : diffValue.toLocaleString();
        
        if (Math.abs(diffValue) < 500) {
          action = '✅ OK';
        } else if (diffValue > 0) {
          action = '⬆️ Augmenter';
        } else {
          action = '⬇️ Baisser';
        }
      } else {
        action = '➕ Créer';
      }
      
      console.log(
        `${rec.activations} act`.padEnd(10) +
        `${prixActuel !== null ? prixActuel.toLocaleString() + ' F' : '-'}`.padStart(12) +
        `${prixArrondi.toLocaleString()} F`.padStart(14) +
        diff.padStart(10) +
        action.padStart(20)
      );
    });
    
    // SQL de mise à jour
    console.log('\n📝 SQL POUR METTRE À JOUR (copiez dans Supabase Dashboard):');
    console.log('─'.repeat(70));
    
    recommendations.forEach(rec => {
      const prixBase = rec.activations * prixMoyen;
      const prixRecommande = Math.round(prixBase * (1 - rec.discount / 100));
      const prixArrondi = Math.round(prixRecommande / 100) * 100;
      
      const currentPack = packages?.find(p => p.activations === rec.activations);
      
      if (currentPack) {
        if (Math.abs(prixArrondi - currentPack.price_xof) >= 500) {
          console.log(`UPDATE activation_packages SET price_xof = ${prixArrondi}, savings_percentage = ${rec.discount} WHERE activations = ${rec.activations};`);
        }
      }
    });
    
    // Problèmes
    console.log('\n⚠️  PROBLÈMES DÉTECTÉS:');
    console.log('─'.repeat(70));
    
    if (packages) {
      const sorted = [...packages].sort((a, b) => a.activations - b.activations);
      let lastPricePerAct = Infinity;
      
      sorted.forEach(p => {
        const pricePerAct = p.price_xof / p.activations;
        if (pricePerAct > lastPricePerAct) {
          console.log(`  ❌ ${p.activations} act coûte ${pricePerAct.toFixed(0)} F/act, plus cher que le pack précédent (${lastPricePerAct.toFixed(0)} F/act)`);
        }
        lastPricePerAct = pricePerAct;
      });
      
      // Vérifier prix incohérents
      const pack50 = sorted.find(p => p.activations === 50);
      const pack100 = sorted.find(p => p.activations === 100);
      const pack200 = sorted.find(p => p.activations === 200);
      
      if (pack50 && pack100 && pack50.price_xof > pack100.price_xof / 2) {
        console.log(`  ⚠️ 50 act (${pack50.price_xof} F) devrait coûter moins de ${(pack100.price_xof / 2).toFixed(0)} F`);
      }
      
      if (pack100 && pack200 && pack100.price_xof > pack200.price_xof) {
        console.log(`  ❌ 100 act (${pack100.price_xof} F) coûte plus cher que 200 act (${pack200.price_xof} F)`);
      }
    }
  }
}

check();
