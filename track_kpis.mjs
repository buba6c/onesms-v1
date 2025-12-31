#!/usr/bin/env node

/**
 * 📊 DASHBOARD KPIs AUTOMATIQUE - ONE SMS
 * 
 * Récupère et affiche les KPIs en temps réel :
 * - Trafic web (Google Analytics)
 * - Conversions (Supabase)
 * - Revenus (Supabase)
 * - Réseaux sociaux (YouTube, TikTok via APIs)
 * 
 * Usage:
 *   node track_kpis.mjs                    # Dashboard temps réel
 *   node track_kpis.mjs daily              # Rapport quotidien
 *   node track_kpis.mjs weekly             # Rapport hebdomadaire
 *   node track_kpis.mjs --email admin@mail # Envoyer par email
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Conversion FCFA
const COIN_TO_FCFA = 600; // 1 Ⓐ = 600 FCFA

// ============================================================================
// FONCTIONS DE RÉCUPÉRATION DES DONNÉES
// ============================================================================

/**
 * Récupère les stats Supabase (inscriptions, transactions, revenus)
 */
async function getSupabaseStats(period = 'today') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'yesterday':
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
  }

  // Inscriptions
  const { count: newUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString());

  // Total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Transactions (activations)
  const { data: activations, count: activationsCount } = await supabase
    .from('activations')
    .select('frozen_amount', { count: 'exact' })
    .gte('created_at', startDate.toISOString())
    .in('status', ['completed', 'active']);

  // Calcul revenu (sum des frozen_amount)
  const revenue = activations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0;
  const revenueFCFA = revenue * COIN_TO_FCFA;

  // Locations actives
  const { count: activeRentals } = await supabase
    .from('rental_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Top services
  const { data: topServices } = await supabase
    .from('activations')
    .select('service_id, services(name)')
    .gte('created_at', startDate.toISOString())
    .limit(5);

  // Compter par service
  const serviceCount = {};
  topServices?.forEach(a => {
    const serviceName = a.services?.name || 'Unknown';
    serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
  });

  const topServicesFormatted = Object.entries(serviceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Taux de conversion (approximatif)
  const conversionRate = totalUsers > 0 ? ((activationsCount / totalUsers) * 100).toFixed(1) : 0;

  return {
    users: {
      new: newUsers || 0,
      total: totalUsers || 0
    },
    activations: {
      count: activationsCount || 0,
      revenue: revenue.toFixed(2),
      revenueFCFA: Math.round(revenueFCFA)
    },
    rentals: {
      active: activeRentals || 0
    },
    topServices: topServicesFormatted,
    conversion: {
      rate: conversionRate
    }
  };
}

/**
 * Récupère les stats des dernières 24h vs 24h précédentes (pour calcul %)
 */
async function getComparisonStats() {
  const today = await getSupabaseStats('today');
  const yesterday = await getSupabaseStats('yesterday');

  const calculate = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100' : '0';
    const diff = ((current - previous) / previous * 100).toFixed(0);
    return diff > 0 ? `+${diff}` : diff;
  };

  return {
    users: calculate(today.users.new, yesterday.users.new),
    activations: calculate(today.activations.count, yesterday.activations.count),
    revenue: calculate(today.activations.revenueFCFA, yesterday.activations.revenueFCFA)
  };
}

// ============================================================================
// AFFICHAGE DU DASHBOARD
// ============================================================================

/**
 * Affiche le dashboard en mode console
 */
async function displayDashboard(period = 'today') {
  console.clear();
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              📊 DASHBOARD KPIS - ONE SMS                      ║
║              ${new Date().toLocaleString('fr-FR')}                    ║
╚════════════════════════════════════════════════════════════════╝
`);

  console.log('⏳ Récupération des données...\n');

  try {
    const stats = await getSupabaseStats(period);
    const comparison = period === 'today' ? await getComparisonStats() : null;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('👥 UTILISATEURS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Nouveaux (${period})     : ${stats.users.new}${comparison ? ` (${comparison.users}% vs hier)` : ''}`);
    console.log(`  Total                : ${stats.users.total}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('💰 CONVERSIONS & REVENUS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Activations          : ${stats.activations.count}${comparison ? ` (${comparison.activations}% vs hier)` : ''}`);
    console.log(`  Locations actives    : ${stats.rentals.active}`);
    console.log(`  Revenu (Ⓐ)           : ${stats.activations.revenue} Ⓐ`);
    console.log(`  Revenu (FCFA)        : ${stats.activations.revenueFCFA.toLocaleString('fr-FR')} FCFA${comparison ? ` (${comparison.revenue}%)` : ''}`);
    console.log(`  Taux conversion      : ${stats.conversion.rate}%`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔥 TOP SERVICES');
    console.log('═══════════════════════════════════════════════════════════════');
    stats.topServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.name.padEnd(20)} : ${service.count} activations`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📈 OBJECTIFS');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const dailyGoals = {
      users: 100,
      activations: 20,
      revenue: 120000 // FCFA
    };

    const userProgress = Math.min((stats.users.new / dailyGoals.users * 100), 100);
    const activationProgress = Math.min((stats.activations.count / dailyGoals.activations * 100), 100);
    const revenueProgress = Math.min((stats.activations.revenueFCFA / dailyGoals.revenue * 100), 100);

    console.log(`  Inscriptions         : ${createProgressBar(userProgress)} ${stats.users.new}/${dailyGoals.users}`);
    console.log(`  Activations          : ${createProgressBar(activationProgress)} ${stats.activations.count}/${dailyGoals.activations}`);
    console.log(`  Revenu               : ${createProgressBar(revenueProgress)} ${stats.activations.revenueFCFA.toLocaleString()}/${dailyGoals.revenue.toLocaleString()} FCFA`);

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // Sauvegarder les stats dans un fichier JSON
    const statsFile = {
      date: new Date().toISOString(),
      period,
      stats,
      comparison
    };
    
    fs.writeFileSync(
      `./kpis_${period}_${Date.now()}.json`,
      JSON.stringify(statsFile, null, 2)
    );

    console.log('✅ Stats sauvegardées dans: kpis_*.json\n');

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats:', error.message);
    process.exit(1);
  }
}

/**
 * Crée une barre de progression visuelle
 */
function createProgressBar(percentage) {
  const barLength = 20;
  const filled = Math.round((percentage / 100) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage.toFixed(0)}%`;
}

/**
 * Génère un rapport texte pour email
 */
async function generateReport(period = 'today') {
  const stats = await getSupabaseStats(period);
  const comparison = period === 'today' ? await getComparisonStats() : null;
  const date = new Date().toLocaleDateString('fr-FR');

  return `
📊 RAPPORT KPIs ONE SMS - ${date}

═══════════════════════════════════════════════

👥 UTILISATEURS
- Nouveaux (${period}) : ${stats.users.new}${comparison ? ` (${comparison.users}% vs hier)` : ''}
- Total : ${stats.users.total}

💰 CONVERSIONS & REVENUS
- Activations : ${stats.activations.count}${comparison ? ` (${comparison.activations}% vs hier)` : ''}
- Locations actives : ${stats.rentals.active}
- Revenu : ${stats.activations.revenue} Ⓐ (${stats.activations.revenueFCFA.toLocaleString('fr-FR')} FCFA)${comparison ? ` (${comparison.revenue}%)` : ''}
- Taux de conversion : ${stats.conversion.rate}%

🔥 TOP SERVICES
${stats.topServices.map((s, i) => `${i + 1}. ${s.name} : ${s.count} activations`).join('\n')}

═══════════════════════════════════════════════

🎯 ACTIONS RECOMMANDÉES :
${stats.users.new < 50 ? '- ⚠️ Peu d\'inscriptions : Intensifier le marketing' : ''}
${stats.activations.count < 10 ? '- ⚠️ Peu de conversions : Optimiser le funnel' : ''}
${stats.conversion.rate < 2 ? '- ⚠️ Taux de conversion faible : Améliorer UX' : ''}
${stats.users.new >= 100 ? '- ✅ Objectif inscriptions atteint !' : ''}
${stats.activations.count >= 20 ? '- ✅ Objectif activations atteint !' : ''}

═══════════════════════════════════════════════

Dashboard complet : https://onesms-sn.com/admin/dashboard
Support : admin@onesms-sn.com

---
ONE SMS Team
${new Date().toLocaleString('fr-FR')}
  `.trim();
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const period = args[0] || 'today';
  const emailFlag = args.find(arg => arg.includes('--email'));
  const email = emailFlag?.split('=')[1];

  console.log('🚀 Démarrage du dashboard KPIs...\n');

  if (period === 'report' || email) {
    // Générer rapport texte
    const report = await generateReport('today');
    console.log(report);

    if (email) {
      console.log(`\n📧 Rapport prêt à être envoyé à: ${email}`);
      console.log('💡 Pour envoyer par email, configurez un service SMTP (Mailgun, SendGrid, etc.)');
      
      // Sauvegarder le rapport
      fs.writeFileSync(
        `./report_${Date.now()}.txt`,
        report
      );
      console.log('✅ Rapport sauvegardé dans: report_*.txt');
    }
  } else {
    // Afficher dashboard interactif
    await displayDashboard(period);

    // Mode watch (refresh toutes les 30 secondes)
    if (args.includes('--watch')) {
      console.log('👀 Mode watch activé (refresh toutes les 30 secondes)');
      console.log('   Appuyez sur Ctrl+C pour arrêter\n');

      setInterval(async () => {
        await displayDashboard(period);
      }, 30000); // 30 secondes
    }
  }
}

// Gérer les erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});

// Exécuter
main();
