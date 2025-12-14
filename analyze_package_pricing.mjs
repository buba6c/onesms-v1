import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function analyzePackagePricing() {
  console.log('═'.repeat(70));
  console.log('📊 ANALYSE DES PRIX - PACKAGES VS SERVICES');
  console.log('═'.repeat(70));

  // 1. Récupérer les packages actuels
  console.log('\n📦 PACKAGES ACTUELS:');
  console.log('─'.repeat(70));
  
  const { data: packages } = await supabase
    .from('activation_packages')
    .select('*')
    .order('activations', { ascending: true });
  
  if (packages) {
    console.log('Pack'.padEnd(12) + 'Prix'.padStart(12) + 'Prix/Act'.padStart(12) + 'Populaire'.padStart(12));
    console.log('─'.repeat(48));
    packages.forEach(p => {
      const pricePerActivation = p.price_xof / p.activations;
      console.log(
        `${p.activations} act`.padEnd(12) +
        `${p.price_xof.toLocaleString()} F`.padStart(12) +
        `${pricePerActivation.toFixed(0)} F`.padStart(12) +
        `${p.is_popular ? '⭐' : ''}`.padStart(12)
      );
    });
  }

  // 2. Récupérer les prix des activations récentes
  console.log('\n💰 ANALYSE DES PRIX DES SERVICES (basé sur les activations):');
  console.log('─'.repeat(70));
  
  const { data: activations } = await supabase
    .from('activations')
    .select('service, country, price, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  
  if (activations && activations.length > 0) {
    const prices = activations.map(a => a.price).filter(p => p > 0);
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
      
      console.log(`  Activations analysées: ${activations.length}`);
      console.log(`  Prix MIN: ${minPrice} FCFA`);
      console.log(`  Prix MAX: ${maxPrice} FCFA`);
      console.log(`  Prix MOYEN: ${avgPrice.toFixed(0)} FCFA`);
      console.log(`  Prix MÉDIAN: ${medianPrice} FCFA`);
      
      // Distribution des prix
      const ranges = [
        { min: 0, max: 50, count: 0 },
        { min: 50, max: 100, count: 0 },
        { min: 100, max: 150, count: 0 },
        { min: 150, max: 200, count: 0 },
        { min: 200, max: 300, count: 0 },
        { min: 300, max: 500, count: 0 },
        { min: 500, max: 1000, count: 0 },
        { min: 1000, max: 10000, count: 0 },
      ];
      
      prices.forEach(price => {
        for (const range of ranges) {
          if (price >= range.min && price < range.max) {
            range.count++;
            break;
          }
        }
      });
      
      console.log('\n  Distribution des prix payés:');
      ranges.forEach(r => {
        if (r.count > 0) {
          const pct = ((r.count / prices.length) * 100).toFixed(1);
          const bar = '█'.repeat(Math.ceil(r.count / 5));
          console.log(`    ${r.min}-${r.max} F: ${r.count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
        }
      });
      
      // Services les plus achetés avec leurs prix moyens
      console.log('\n🔥 TOP 15 SERVICES LES PLUS ACHETÉS:');
      console.log('─'.repeat(70));
      
      const serviceStats = {};
      activations.forEach(a => {
        const key = a.service;
        if (!serviceStats[key]) {
          serviceStats[key] = { count: 0, prices: [], countries: new Set() };
        }
        serviceStats[key].count++;
        if (a.price > 0) serviceStats[key].prices.push(a.price);
        serviceStats[key].countries.add(a.country);
      });
      
      const sortedServices = Object.entries(serviceStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15);
      
      console.log('Service'.padEnd(20) + 'Achats'.padStart(8) + 'Prix Moy'.padStart(12) + 'Min'.padStart(8) + 'Max'.padStart(8));
      console.log('─'.repeat(56));
      
      sortedServices.forEach(([service, stats]) => {
        const avgP = stats.prices.length > 0 
          ? (stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length).toFixed(0) 
          : 'N/A';
        const minP = stats.prices.length > 0 ? Math.min(...stats.prices) : 0;
        const maxP = stats.prices.length > 0 ? Math.max(...stats.prices) : 0;
        
        console.log(
          service.substring(0, 18).padEnd(20) +
          stats.count.toString().padStart(8) +
          `${avgP} F`.padStart(12) +
          `${minP} F`.padStart(8) +
          `${maxP} F`.padStart(8)
        );
      });

      // 3. Calcul des recommandations de prix
      console.log('\n═'.repeat(70));
      console.log('💡 RECOMMANDATIONS DE PRIX POUR LES PACKAGES');
      console.log('═'.repeat(70));
      
      // Prix moyen d'une activation
      const prixMoyenActivation = Math.round(avgPrice);
      console.log(`\n📌 Prix moyen d'une activation: ${prixMoyenActivation} FCFA`);
      
      // Logique: les packages doivent offrir un avantage
      // Pack de base: prix moyen (pas de réduction)
      // Plus le pack est gros, plus la réduction est importante
      
      const recommendations = [
        { activations: 5, discount: 0, comment: 'Pack découverte (pas de réduction)' },
        { activations: 10, discount: 5, comment: 'Petit utilisateur (5% de réduction)' },
        { activations: 20, discount: 10, comment: 'Utilisateur régulier (10% de réduction)' },
        { activations: 50, discount: 15, comment: 'Bon utilisateur (15% de réduction)' },
        { activations: 100, discount: 20, comment: 'Gros utilisateur (20% de réduction)' },
        { activations: 200, discount: 25, comment: 'Très gros utilisateur (25% de réduction)' },
        { activations: 500, discount: 30, comment: 'Power user (30% de réduction)' },
        { activations: 1000, discount: 35, comment: 'Revendeur (35% de réduction)' },
      ];
      
      console.log('\n📋 GRILLE DE PRIX RECOMMANDÉE:');
      console.log('─'.repeat(70));
      console.log('Pack'.padEnd(10) + 'Prix Actuel'.padStart(14) + 'Prix Recommandé'.padStart(18) + 'Prix/Act'.padStart(10) + 'Économie'.padStart(10));
      console.log('─'.repeat(62));
      
      recommendations.forEach(rec => {
        const prixSansReduction = rec.activations * prixMoyenActivation;
        const prixRecommande = Math.round(prixSansReduction * (1 - rec.discount / 100));
        const prixParActivation = Math.round(prixRecommande / rec.activations);
        
        // Trouver le prix actuel
        const currentPack = packages?.find(p => p.activations === rec.activations);
        const prixActuel = currentPack ? currentPack.price_xof : '-';
        
        // Arrondir à des prix "jolis"
        const prixArrondi = Math.round(prixRecommande / 100) * 100;
        
        console.log(
          `${rec.activations} act`.padEnd(10) +
          `${typeof prixActuel === 'number' ? prixActuel.toLocaleString() : prixActuel} F`.padStart(14) +
          `${prixArrondi.toLocaleString()} F`.padStart(18) +
          `${prixParActivation} F`.padStart(10) +
          `${rec.discount}%`.padStart(10)
        );
      });
      
      console.log('\n─'.repeat(70));
      console.log(`Note: Basé sur un prix moyen d'activation de ${prixMoyenActivation} FCFA`);

      // 4. Problèmes détectés
      console.log('\n⚠️  PROBLÈMES DÉTECTÉS DANS LES PACKAGES ACTUELS:');
      console.log('─'.repeat(70));
      
      if (packages) {
        packages.forEach((p, i) => {
          const pricePerAct = p.price_xof / p.activations;
          const nextPack = packages[i + 1];
          
          if (nextPack) {
            const nextPricePerAct = nextPack.price_xof / nextPack.activations;
            if (nextPricePerAct > pricePerAct) {
              console.log(`  ❌ ${nextPack.activations} act (${nextPricePerAct.toFixed(0)} F/act) est PLUS CHER par activation que ${p.activations} act (${pricePerAct.toFixed(0)} F/act)`);
            }
          }
        });
        
        // Vérifier la cohérence des prix
        const sortedByActivations = [...packages].sort((a, b) => a.activations - b.activations);
        let lastPricePerAct = Infinity;
        let hasIssue = false;
        
        sortedByActivations.forEach(p => {
          const pricePerAct = p.price_xof / p.activations;
          if (pricePerAct > lastPricePerAct) {
            hasIssue = true;
          }
          lastPricePerAct = pricePerAct;
        });
        
        if (!hasIssue) {
          console.log('  ✅ Les prix par activation diminuent bien avec les gros packs');
        }
      }

      // 5. SQL pour mettre à jour
      console.log('\n📝 SQL POUR METTRE À JOUR LES PACKAGES:');
      console.log('─'.repeat(70));
      
      recommendations.forEach(rec => {
        const prixSansReduction = rec.activations * prixMoyenActivation;
        const prixRecommande = Math.round(prixSansReduction * (1 - rec.discount / 100));
        const prixArrondi = Math.round(prixRecommande / 100) * 100;
        
        const currentPack = packages?.find(p => p.activations === rec.activations);
        if (currentPack) {
          console.log(`-- ${rec.activations} activations: ${currentPack.price_xof} → ${prixArrondi} FCFA`);
          console.log(`UPDATE activation_packages SET price_xof = ${prixArrondi}, savings_percentage = ${rec.discount} WHERE activations = ${rec.activations};`);
          console.log('');
        }
      });
    }
  } else {
    console.log('  Aucune activation trouvée pour analyser les prix');
  }
}

analyzePackagePricing();
