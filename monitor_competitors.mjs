#!/usr/bin/env node

/**
 * 🔍 MONITORING CONCURRENTS - ONE SMS
 * 
 * Surveille les prix et disponibilités de 5sim.net et autres concurrents
 * 
 * Usage:
 *   node monitor_competitors.mjs check              # Vérification manuelle
 *   node monitor_competitors.mjs compare            # Comparaison des prix
 *   node monitor_competitors.mjs --watch            # Surveillance continue
 *   node monitor_competitors.mjs report             # Rapport complet
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const COMPETITORS = {
  '5sim': {
    name: '5sim.net',
    url: 'https://5sim.net',
    apiUrl: 'https://5sim.net/v1/guest/prices',
    services: ['whatsapp', 'telegram', 'instagram', 'discord', 'google'],
    priceMultiplier: 600 // 1 RUB = ~600 FCFA
  },
  'smsactivate': {
    name: 'sms-activate.org',
    url: 'https://sms-activate.org',
    services: ['whatsapp', 'telegram', 'instagram', 'discord', 'google'],
    priceMultiplier: 600
  }
};

const OUR_PRICES = {
  whatsapp: { coins: 5, fcfa: 3000 },
  telegram: { coins: 5, fcfa: 3000 },
  instagram: { coins: 7, fcfa: 4200 },
  discord: { coins: 5, fcfa: 3000 },
  google: { coins: 10, fcfa: 6000 }
};

const HISTORY_FILE = path.join(process.cwd(), 'competitors_history.json');
const ALERTS_FILE = path.join(process.cwd(), 'price_alerts.json');

// ============================================================================
// DONNÉES SIMULÉES (à remplacer par vraies API calls)
// ============================================================================

/**
 * Simule un fetch des prix de 5sim
 * En production, utiliser: fetch('https://5sim.net/v1/guest/prices')
 */
function fetch5simPrices() {
  // Prix simulés (en roubles)
  return {
    whatsapp: {
      russia: 12,  // ~7200 FCFA
      usa: 20,     // ~12000 FCFA
      france: 25   // ~15000 FCFA
    },
    telegram: {
      russia: 10,
      usa: 18,
      france: 22
    },
    instagram: {
      russia: 15,
      usa: 30,
      france: 35
    },
    discord: {
      russia: 8,
      usa: 15,
      france: 18
    },
    google: {
      usa: 50      // ~30000 FCFA
    }
  };
}

/**
 * Simule un fetch des prix SMS-Activate
 */
function fetchSMSActivatePrices() {
  return {
    whatsapp: {
      russia: 11,
      usa: 22,
      france: 26
    },
    telegram: {
      russia: 9,
      usa: 19,
      france: 23
    },
    instagram: {
      russia: 14,
      usa: 32,
      france: 36
    },
    discord: {
      russia: 7,
      usa: 16,
      france: 19
    },
    google: {
      usa: 55
    }
  };
}

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Récupère les prix des concurrents
 */
async function fetchCompetitorPrices() {
  console.log('🔍 Récupération des prix concurrents...\n');
  
  const prices = {
    '5sim': fetch5simPrices(),
    'smsactivate': fetchSMSActivatePrices(),
    timestamp: new Date().toISOString()
  };
  
  // Sauvegarder dans l'historique
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
  
  history.push(prices);
  
  // Garder seulement les 30 derniers jours
  if (history.length > 30) {
    history = history.slice(-30);
  }
  
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  
  return prices;
}

/**
 * Compare nos prix avec les concurrents
 */
async function comparePrices() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      💰 COMPARAISON DES PRIX - ONE SMS vs Concurrents        ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  const competitorPrices = await fetchCompetitorPrices();
  
  const services = ['whatsapp', 'telegram', 'instagram', 'discord', 'google'];
  
  services.forEach(service => {
    console.log(`\n📱 ${service.toUpperCase()}`);
    console.log('─'.repeat(64));
    
    // Notre prix
    const ourPrice = OUR_PRICES[service];
    console.log(`\n   ONE SMS:           ${ourPrice.fcfa.toLocaleString('fr-FR')} FCFA (${ourPrice.coins} Ⓐ)`);
    
    // 5sim
    const sim5Prices = competitorPrices['5sim'][service];
    if (sim5Prices) {
      console.log('\n   5sim.net:');
      Object.entries(sim5Prices).forEach(([country, priceRUB]) => {
        const priceFCFA = Math.round(priceRUB * 600);
        const diff = priceFCFA - ourPrice.fcfa;
        const diffPercent = Math.round((diff / ourPrice.fcfa) * 100);
        const status = diff > 0 ? '✅ Moins cher' : '⚠️ Plus cher';
        const arrow = diff > 0 ? '↓' : '↑';
        
        console.log(`      ${country.padEnd(10)}: ${priceFCFA.toLocaleString('fr-FR').padEnd(12)} FCFA ${arrow} ${Math.abs(diffPercent)}% ${status}`);
      });
    }
    
    // SMS-Activate
    const smsActivatePrices = competitorPrices['smsactivate'][service];
    if (smsActivatePrices) {
      console.log('\n   SMS-Activate:');
      Object.entries(smsActivatePrices).forEach(([country, priceRUB]) => {
        const priceFCFA = Math.round(priceRUB * 600);
        const diff = priceFCFA - ourPrice.fcfa;
        const diffPercent = Math.round((diff / ourPrice.fcfa) * 100);
        const status = diff > 0 ? '✅ Moins cher' : '⚠️ Plus cher';
        const arrow = diff > 0 ? '↓' : '↑';
        
        console.log(`      ${country.padEnd(10)}: ${priceFCFA.toLocaleString('fr-FR').padEnd(12)} FCFA ${arrow} ${Math.abs(diffPercent)}% ${status}`);
      });
    }
  });
  
  console.log('\n' + '═'.repeat(64));
  
  // Résumé
  let weAreCheaper = 0;
  let weAreExpensive = 0;
  
  services.forEach(service => {
    const ourPrice = OUR_PRICES[service].fcfa;
    
    // Comparer avec 5sim USA (référence)
    const sim5USA = competitorPrices['5sim'][service]?.usa;
    if (sim5USA) {
      const competitor = Math.round(sim5USA * 600);
      if (ourPrice < competitor) weAreCheaper++;
      else weAreExpensive++;
    }
  });
  
  console.log('\n📊 RÉSUMÉ CONCURRENTIEL');
  console.log(`   ✅ Nous sommes moins chers: ${weAreCheaper}/${services.length} services`);
  console.log(`   ⚠️ Nous sommes plus chers: ${weAreExpensive}/${services.length} services`);
  
  // Recommandations
  console.log('\n💡 RECOMMANDATIONS');
  
  if (weAreCheaper >= 4) {
    console.log('   ✅ Prix très compétitifs ! Communiquez sur cet avantage.');
  } else if (weAreExpensive >= 3) {
    console.log('   ⚠️ Envisagez de baisser les prix sur certains services.');
  }
  
  console.log('   💡 Avantages uniques à mettre en avant:');
  console.log('      - Paiement local (Wave, OM, MM)');
  console.log('      - Interface en français');
  console.log('      - Support 24/7 en français');
  console.log('      - Pas de conversion USD/EUR nécessaire');
}

/**
 * Surveille les changements de prix
 */
function watchPrices() {
  console.log('👀 MODE SURVEILLANCE ACTIVÉ\n');
  console.log('Vérification toutes les heures...\n');
  console.log('Appuyez sur Ctrl+C pour arrêter\n');
  
  let lastPrices = null;
  
  const check = async () => {
    const now = new Date().toLocaleString('fr-FR');
    console.log(`[${now}] Vérification des prix...`);
    
    const currentPrices = await fetchCompetitorPrices();
    
    // Comparer avec les prix précédents
    if (lastPrices) {
      const alerts = [];
      
      Object.keys(OUR_PRICES).forEach(service => {
        const prev5sim = lastPrices['5sim'][service]?.usa || 0;
        const curr5sim = currentPrices['5sim'][service]?.usa || 0;
        
        if (prev5sim !== curr5sim) {
          const change = curr5sim - prev5sim;
          const changePercent = Math.round((change / prev5sim) * 100);
          
          alerts.push({
            service,
            competitor: '5sim',
            oldPrice: prev5sim,
            newPrice: curr5sim,
            change: changePercent
          });
        }
      });
      
      if (alerts.length > 0) {
        console.log('\n🚨 CHANGEMENTS DE PRIX DÉTECTÉS:\n');
        alerts.forEach(alert => {
          const arrow = alert.change > 0 ? '⬆️' : '⬇️';
          console.log(`   ${arrow} ${alert.service}: ${alert.oldPrice} → ${alert.newPrice} RUB (${alert.change > 0 ? '+' : ''}${alert.change}%)`);
        });
        
        // Sauvegarder les alertes
        let alertsHistory = [];
        if (fs.existsSync(ALERTS_FILE)) {
          alertsHistory = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
        }
        
        alertsHistory.push({
          timestamp: new Date().toISOString(),
          alerts
        });
        
        fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsHistory, null, 2), 'utf8');
      } else {
        console.log('   ✅ Aucun changement détecté');
      }
    }
    
    lastPrices = currentPrices;
    console.log('');
  };
  
  // Première vérification immédiate
  check();
  
  // Vérifications toutes les heures
  setInterval(check, 60 * 60 * 1000);
}

/**
 * Génère un rapport complet
 */
async function generateReport() {
  console.log('\n📊 RAPPORT CONCURRENTIEL COMPLET\n');
  console.log('═'.repeat(64));
  
  // 1. Comparaison actuelle
  await comparePrices();
  
  // 2. Tendances historiques
  if (fs.existsSync(HISTORY_FILE)) {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    
    console.log('\n\n📈 TENDANCES (30 derniers jours)');
    console.log('─'.repeat(64));
    
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      
      Object.keys(OUR_PRICES).forEach(service => {
        const firstPrice = first['5sim'][service]?.usa || 0;
        const lastPrice = last['5sim'][service]?.usa || 0;
        const change = lastPrice - firstPrice;
        const changePercent = firstPrice > 0 ? Math.round((change / firstPrice) * 100) : 0;
        
        if (changePercent !== 0) {
          const arrow = changePercent > 0 ? '📈' : '📉';
          console.log(`   ${arrow} ${service}: ${changePercent > 0 ? '+' : ''}${changePercent}% sur 30 jours`);
        }
      });
    } else {
      console.log('   ⏳ Pas assez de données (besoin de 2+ jours)');
    }
  }
  
  // 3. Alertes récentes
  if (fs.existsSync(ALERTS_FILE)) {
    const alertsHistory = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    
    console.log('\n\n🔔 ALERTES RÉCENTES (7 derniers jours)');
    console.log('─'.repeat(64));
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentAlerts = alertsHistory.filter(a => 
      new Date(a.timestamp) > sevenDaysAgo
    );
    
    if (recentAlerts.length > 0) {
      recentAlerts.forEach(alertGroup => {
        const date = new Date(alertGroup.timestamp).toLocaleDateString('fr-FR');
        console.log(`\n   ${date}:`);
        alertGroup.alerts.forEach(alert => {
          console.log(`      ${alert.service}: ${alert.change > 0 ? '+' : ''}${alert.change}%`);
        });
      });
    } else {
      console.log('   ✅ Aucune alerte ces 7 derniers jours');
    }
  }
  
  // 4. Recommandations stratégiques
  console.log('\n\n💡 RECOMMANDATIONS STRATÉGIQUES');
  console.log('─'.repeat(64));
  console.log(`
   1. TARIFICATION
      • Maintenir les prix actuels (compétitifs)
      • Communiquer sur le paiement local (avantage unique)
      • Offrir des packages (réduction sur volume)
   
   2. MARKETING
      • "Prix jusqu'à 50% moins cher que 5sim pour l'Afrique"
      • "Pas de conversion USD nécessaire"
      • "Support en français, paiement en FCFA"
   
   3. SURVEILLANCE
      • Vérifier les prix concurrents 1x/semaine
      • Alertes si baisse > 20% chez concurrent
      • Ajuster nos prix si nécessaire
   
   4. DIFFÉRENCIATION
      • Parrainages (10% de commission)
      • Promo codes fréquents
      • Programme fidélité
  `);
  
  // Sauvegarder le rapport
  const reportFile = `rapport_concurrence_${Date.now()}.txt`;
  const reportContent = `
RAPPORT CONCURRENTIEL ONE SMS
Date: ${new Date().toLocaleDateString('fr-FR')}

NOS PRIX:
${Object.entries(OUR_PRICES).map(([s, p]) => `  ${s}: ${p.fcfa} FCFA`).join('\n')}

CONCURRENTS (5sim.net USA):
${Object.keys(OUR_PRICES).map(s => {
  const prices = fetch5simPrices();
  const price = prices[s]?.usa || 0;
  return `  ${s}: ${Math.round(price * 600)} FCFA`;
}).join('\n')}

Rapport complet disponible dans la console.
  `;
  
  fs.writeFileSync(reportFile, reportContent, 'utf8');
  console.log(`\n✅ Rapport sauvegardé: ${reportFile}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      🔍 MONITORING CONCURRENTS - ONE SMS                      ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  if (!command || command === 'help') {
    console.log(`
Usage:
  node monitor_competitors.mjs check         # Vérification rapide
  node monitor_competitors.mjs compare       # Comparaison détaillée
  node monitor_competitors.mjs --watch       # Surveillance continue (1h)
  node monitor_competitors.mjs report        # Rapport complet
  
Exemples:
  node monitor_competitors.mjs compare
  node monitor_competitors.mjs --watch
  node monitor_competitors.mjs report
    `);
    return;
  }
  
  if (command === 'check' || command === 'compare') {
    await comparePrices();
  } else if (command === '--watch') {
    watchPrices();
  } else if (command === 'report') {
    await generateReport();
  } else {
    console.log(`❌ Commande inconnue: ${command}`);
    console.log(`Utilisez: node monitor_competitors.mjs help`);
  }
}

main();
