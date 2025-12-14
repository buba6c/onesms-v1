import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function analyze() {
  console.log('ANALYSE DES PRIX');
  console.log('================');
  
  // 1. Packages actuels
  const { data: packages } = await supabase
    .from('activation_packages')
    .select('*')
    .order('activations', { ascending: true });
  
  console.log('\nPACKAGES ACTUELS:');
  packages?.forEach(p => {
    const ppa = (p.price_xof / p.activations).toFixed(0);
    console.log(`  ${p.activations} act = ${p.price_xof} F (${ppa} F/act) ${p.is_popular ? 'POPULAIRE' : ''}`);
  });
  
  // 2. Activations pour analyser les prix
  const { data: acts, count } = await supabase
    .from('activations')
    .select('service_code, country_code, price, status', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(500);
  
  console.log('\nACTIVATIONS:');
  console.log('  Total:', count);
  
  if (acts && acts.length > 0) {
    const prices = acts.map(a => a.price).filter(p => p > 0);
    
    if (prices.length > 0) {
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const avgP = prices.reduce((a,b) => a+b, 0) / prices.length;
      const sorted = [...prices].sort((a,b) => a-b);
      const medP = sorted[Math.floor(sorted.length/2)];
      
      console.log('  Prix avec valeur:', prices.length);
      console.log('  MIN:', minP, 'F');
      console.log('  MAX:', maxP, 'F');
      console.log('  MOYEN:', avgP.toFixed(0), 'F');
      console.log('  MEDIAN:', medP, 'F');
      
      // Distribution
      console.log('\n  Distribution:');
      const ranges = [
        [0, 100], [100, 200], [200, 300], [300, 500], [500, 1000], [1000, 5000]
      ];
      ranges.forEach(([min, max]) => {
        const cnt = prices.filter(p => p >= min && p < max).length;
        const pct = ((cnt / prices.length) * 100).toFixed(1);
        console.log(`    ${min}-${max} F: ${cnt} (${pct}%)`);
      });
      
      // Top services
      console.log('\n  Top services:');
      const byService = {};
      acts.forEach(a => {
        const k = a.service_code || 'unknown';
        if (!byService[k]) byService[k] = { count: 0, prices: [] };
        byService[k].count++;
        if (a.price > 0) byService[k].prices.push(a.price);
      });
      
      const top = Object.entries(byService)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15);
      
      top.forEach(([service, data]) => {
        const avg = data.prices.length > 0 
          ? Math.round(data.prices.reduce((a,b) => a+b, 0) / data.prices.length)
          : 0;
        console.log(`    ${service}: ${data.count} achats, prix moy ${avg} F`);
      });
      
      // RECOMMANDATIONS
      const prixMoyen = Math.round(avgP);
      
      console.log('\n================');
      console.log('RECOMMANDATIONS');
      console.log('================');
      console.log('\nPrix moyen activation:', prixMoyen, 'F');
      
      const recs = [
        { act: 5, discount: 0 },
        { act: 10, discount: 5 },
        { act: 20, discount: 10 },
        { act: 50, discount: 15 },
        { act: 100, discount: 20 },
        { act: 200, discount: 25 },
        { act: 500, discount: 30 },
        { act: 1000, discount: 35 },
      ];
      
      console.log('\nPack      Actuel    Recommande  Diff      Action');
      console.log('-----------------------------------------------');
      
      recs.forEach(r => {
        const prixBase = r.act * prixMoyen;
        const prixRec = Math.round(prixBase * (1 - r.discount / 100));
        const prixArrondi = Math.round(prixRec / 100) * 100;
        
        const curr = packages?.find(p => p.activations === r.act);
        const actuel = curr ? curr.price_xof : null;
        
        let diff = '-';
        let action = '';
        
        if (actuel !== null) {
          const d = prixArrondi - actuel;
          diff = d > 0 ? `+${d}` : `${d}`;
          if (Math.abs(d) < 500) action = 'OK';
          else if (d > 0) action = 'AUGMENTER';
          else action = 'BAISSER';
        } else {
          action = 'CREER';
        }
        
        console.log(`${r.act}`.padEnd(10) + `${actuel || '-'}`.padEnd(10) + `${prixArrondi}`.padEnd(12) + `${diff}`.padEnd(10) + action);
      });
      
      // SQL
      console.log('\n================');
      console.log('SQL A EXECUTER:');
      console.log('================\n');
      
      recs.forEach(r => {
        const prixBase = r.act * prixMoyen;
        const prixRec = Math.round(prixBase * (1 - r.discount / 100));
        const prixArrondi = Math.round(prixRec / 100) * 100;
        
        const curr = packages?.find(p => p.activations === r.act);
        if (curr && Math.abs(prixArrondi - curr.price_xof) >= 500) {
          console.log(`UPDATE activation_packages SET price_xof = ${prixArrondi}, savings_percentage = ${r.discount} WHERE activations = ${r.act};`);
        }
      });
      
      // Problemes
      console.log('\n================');
      console.log('PROBLEMES:');
      console.log('================\n');
      
      if (packages) {
        const sorted = [...packages].sort((a, b) => a.activations - b.activations);
        let lastPPA = Infinity;
        
        sorted.forEach(p => {
          const ppa = p.price_xof / p.activations;
          if (ppa > lastPPA) {
            console.log(`ERREUR: ${p.activations} act coute ${ppa.toFixed(0)} F/act, plus cher que le pack precedent!`);
          }
          lastPPA = ppa;
        });
        
        // 50 et 100 sont trop chers
        const p50 = sorted.find(p => p.activations === 50);
        const p100 = sorted.find(p => p.activations === 100);
        const p200 = sorted.find(p => p.activations === 200);
        
        if (p50 && p100 && p50.price_xof > p100.price_xof * 0.6) {
          console.log(`Le pack 50 (${p50.price_xof} F) semble trop cher`);
        }
        if (p100 && p200 && p100.price_xof > p200.price_xof) {
          console.log(`Le pack 100 (${p100.price_xof} F) coute plus que le pack 200 (${p200.price_xof} F)!`);
        }
      }
    }
  } else {
    console.log('  Pas assez de donnees pour analyser');
    console.log('\n  Utilisons un prix moyen estimé de 150 F par activation');
    
    const prixMoyen = 150;
    
    console.log('\n================');
    console.log('RECOMMANDATIONS (estimées)');
    console.log('================');
    
    const recs = [
      { act: 5, discount: 0, prix: 750 },
      { act: 10, discount: 5, prix: 1425 },
      { act: 20, discount: 10, prix: 2700 },
      { act: 50, discount: 15, prix: 6375 },
      { act: 100, discount: 20, prix: 12000 },
      { act: 200, discount: 25, prix: 22500 },
      { act: 500, discount: 30, prix: 52500 },
      { act: 1000, discount: 35, prix: 97500 },
    ];
    
    console.log('\nPack      Actuel    Recommande');
    console.log('------------------------------');
    
    recs.forEach(r => {
      const curr = packages?.find(p => p.activations === r.act);
      const actuel = curr ? curr.price_xof : '-';
      console.log(`${r.act}`.padEnd(10) + `${actuel}`.padEnd(10) + `${r.prix}`);
    });
  }
}

analyze();
