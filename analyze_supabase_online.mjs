#!/usr/bin/env node

/**
 * 🔍 ANALYSE COMPLETE SUPABASE EN LIGNE
 * ====================================
 * Analyse intelligente de tout le projet Supabase hébergé
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 ANALYSE COMPLETE DU PROJET SUPABASE EN LIGNE');
console.log('='.repeat(60));
console.log(`🌐 URL: ${supabaseUrl}`);
console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
console.log('='.repeat(60));
console.log('');

// ============================================
// 1. STRUCTURE DES TABLES
// ============================================
async function analyzeTableStructure() {
  console.log('📊 1. STRUCTURE DES TABLES');
  console.log('-'.repeat(60));
  
  const tables = [
    'users',
    'credits_history',
    'virtual_numbers',
    'activations',
    'rentals',
    'sms_received',
    'transactions',
    'services',
    'countries',
    'pricing_rules',
    'providers',
    'system_logs',
    'service_availability',
    'wallet_operations',
    'frozen_amounts'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') {
        console.log(`❌ ${table}: Erreur - ${error.message}`);
      } else if (error?.code === 'PGRST116') {
        console.log(`⚠️  ${table}: Table n'existe pas`);
      } else {
        console.log(`✅ ${table}: ${count?.toLocaleString() || 0} enregistrements`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  console.log('');
}

// ============================================
// 2. UTILISATEURS & STATISTIQUES
// ============================================
async function analyzeUsers() {
  console.log('👥 2. UTILISATEURS & STATISTIQUES');
  console.log('-'.repeat(60));

  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total utilisateurs: ${totalUsers || 0}`);

    // Admins
    const { data: admins } = await supabase
      .from('users')
      .select('email, full_name, credits, created_at')
      .eq('role', 'admin');

    console.log(`\n👑 Admins (${admins?.length || 0}):`);
    admins?.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.full_name || 'N/A'}) - ${admin.credits} crédits`);
    });

    // Users actifs
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`\n✅ Utilisateurs actifs: ${activeUsers || 0}`);

    // Total crédits dans le système
    const { data: creditsData } = await supabase
      .from('users')
      .select('credits');

    const totalCredits = creditsData?.reduce((sum, user) => sum + parseFloat(user.credits || 0), 0) || 0;
    console.log(`💰 Total crédits système: ${totalCredits.toLocaleString('fr-FR')} XOF`);

    // Top 5 users par crédits
    const { data: topUsers } = await supabase
      .from('users')
      .select('email, full_name, credits')
      .order('credits', { ascending: false })
      .limit(5);

    console.log(`\n🏆 Top 5 utilisateurs (crédits):`);
    topUsers?.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} - ${parseFloat(user.credits).toLocaleString('fr-FR')} XOF`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 3. ACTIVATIONS & RENTALS
// ============================================
async function analyzeActivations() {
  console.log('📱 3. ACTIVATIONS & RENTALS');
  console.log('-'.repeat(60));

  try {
    // Activations
    const { count: totalActivations } = await supabase
      .from('activations')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total activations: ${totalActivations || 0}`);

    // Par statut
    const statuses = ['active', 'completed', 'cancelled', 'expired', 'waiting'];
    for (const status of statuses) {
      const { count } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      if (count > 0) {
        console.log(`  ├─ ${status}: ${count}`);
      }
    }

    // Activations récentes (24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { count: recentActivations } = await supabase
      .from('activations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());

    console.log(`\n🕐 Activations 24h: ${recentActivations || 0}`);

    // Rentals
    const { count: totalRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true });

    console.log(`\n🏠 Total rentals: ${totalRentals || 0}`);

    // Rentals actifs
    const { count: activeRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    console.log(`  ├─ Actifs: ${activeRentals || 0}`);

    // Top services
    const { data: topServices } = await supabase
      .from('activations')
      .select('service')
      .limit(1000);

    if (topServices && topServices.length > 0) {
      const serviceCounts = {};
      topServices.forEach(({ service }) => {
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      });

      const sortedServices = Object.entries(serviceCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      console.log(`\n🔥 Top 5 services:`);
      sortedServices.forEach(([service, count], i) => {
        console.log(`  ${i + 1}. ${service}: ${count} activations`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 4. TRANSACTIONS & FINANCES
// ============================================
async function analyzeFinances() {
  console.log('💰 4. TRANSACTIONS & FINANCES');
  console.log('-'.repeat(60));

  try {
    // Total transactions
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total transactions: ${totalTransactions || 0}`);

    // Par statut
    const txStatuses = ['completed', 'pending', 'failed', 'cancelled'];
    for (const status of txStatuses) {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      if (count > 0) {
        console.log(`  ├─ ${status}: ${count}`);
      }
    }

    // Montants
    const { data: completedTx } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('status', 'completed');

    if (completedTx && completedTx.length > 0) {
      const totalPayments = completedTx
        .filter(tx => tx.type === 'payment')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

      const totalRefunds = completedTx
        .filter(tx => tx.type === 'refund')
        .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

      console.log(`\n💵 Paiements complétés: ${totalPayments.toLocaleString('fr-FR')} XOF`);
      console.log(`💸 Remboursements: ${totalRefunds.toLocaleString('fr-FR')} XOF`);
      console.log(`📈 Net: ${(totalPayments - totalRefunds).toLocaleString('fr-FR')} XOF`);
    }

    // Wallet operations
    const { count: walletOps } = await supabase
      .from('wallet_operations')
      .select('*', { count: 'exact', head: true });

    console.log(`\n💼 Wallet operations: ${walletOps || 0}`);

    // Frozen amounts
    const { count: frozenCount } = await supabase
      .from('frozen_amounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_released', false);

    const { data: frozenData } = await supabase
      .from('frozen_amounts')
      .select('amount')
      .eq('is_released', false);

    const totalFrozen = frozenData?.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0) || 0;

    console.log(`\n🧊 Montants gelés:`);
    console.log(`  ├─ Nombre: ${frozenCount || 0}`);
    console.log(`  └─ Total: ${totalFrozen.toLocaleString('fr-FR')} XOF`);

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 5. SMS REÇUS
// ============================================
async function analyzeSMS() {
  console.log('📨 5. SMS REÇUS');
  console.log('-'.repeat(60));

  try {
    const { count: totalSMS } = await supabase
      .from('sms_received')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total SMS reçus: ${totalSMS || 0}`);

    // SMS 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { count: recentSMS } = await supabase
      .from('sms_received')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());

    console.log(`🕐 SMS 24h: ${recentSMS || 0}`);

    // SMS avec code
    const { count: smsWithCode } = await supabase
      .from('sms_received')
      .select('*', { count: 'exact', head: true })
      .not('code', 'is', null);

    console.log(`🔢 SMS avec code: ${smsWithCode || 0}`);

    if (totalSMS > 0) {
      const rate = ((smsWithCode / totalSMS) * 100).toFixed(1);
      console.log(`📈 Taux de réception code: ${rate}%`);
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 6. SERVICES & COUNTRIES
// ============================================
async function analyzeServicesCountries() {
  console.log('🌍 6. SERVICES & PAYS');
  console.log('-'.repeat(60));

  try {
    // Services
    const { count: totalServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    const { count: activeServices } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`🎯 Services:`);
    console.log(`  ├─ Total: ${totalServices || 0}`);
    console.log(`  └─ Actifs: ${activeServices || 0}`);

    // Top services par popularité
    const { data: popularServices } = await supabase
      .from('services')
      .select('display_name, popularity_score')
      .order('popularity_score', { ascending: false })
      .limit(5);

    if (popularServices && popularServices.length > 0) {
      console.log(`\n🔥 Top 5 services populaires:`);
      popularServices.forEach((service, i) => {
        console.log(`  ${i + 1}. ${service.display_name} (score: ${service.popularity_score})`);
      });
    }

    // Countries
    const { count: totalCountries } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    const { count: activeCountries } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`\n🌍 Pays:`);
    console.log(`  ├─ Total: ${totalCountries || 0}`);
    console.log(`  └─ Actifs: ${activeCountries || 0}`);

    // Pricing rules
    const { count: totalPricing } = await supabase
      .from('pricing_rules')
      .select('*', { count: 'exact', head: true });

    const { count: activePricing } = await supabase
      .from('pricing_rules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`\n💵 Règles de prix:`);
    console.log(`  ├─ Total: ${totalPricing || 0}`);
    console.log(`  └─ Actives: ${activePricing || 0}`);

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 7. PROVIDERS
// ============================================
async function analyzeProviders() {
  console.log('🔌 7. PROVIDERS API');
  console.log('-'.repeat(60));

  try {
    const { data: providers, error } = await supabase
      .from('providers')
      .select('name, is_active, created_at');

    if (error) {
      console.log(`❌ Erreur: ${error.message}`);
    } else if (providers) {
      console.log(`📊 Total providers: ${providers.length}`);
      providers.forEach(provider => {
        const status = provider.is_active ? '✅' : '❌';
        console.log(`  ${status} ${provider.name}`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 8. LOGS SYSTÈME
// ============================================
async function analyzeLogs() {
  console.log('📝 8. LOGS SYSTÈME');
  console.log('-'.repeat(60));

  try {
    const { count: totalLogs } = await supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total logs: ${totalLogs || 0}`);

    // Par niveau
    const levels = ['error', 'warning', 'info'];
    for (const level of levels) {
      const { count } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', level);
      
      if (count > 0) {
        const icon = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${level}: ${count}`);
      }
    }

    // Logs récents (erreurs)
    const { data: recentErrors } = await supabase
      .from('system_logs')
      .select('message, category, created_at')
      .eq('level', 'error')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentErrors && recentErrors.length > 0) {
      console.log(`\n🚨 Erreurs récentes:`);
      recentErrors.forEach(log => {
        const date = new Date(log.created_at).toLocaleString('fr-FR');
        console.log(`  - [${log.category}] ${log.message.substring(0, 50)}... (${date})`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 9. EDGE FUNCTIONS (via API)
// ============================================
async function analyzeEdgeFunctions() {
  console.log('⚡ 9. EDGE FUNCTIONS DEPLOYÉES');
  console.log('-'.repeat(60));

  const functions = [
    'buy-sms-activate-number',
    'cancel-sms-activate-order',
    'check-sms-activate-status',
    'get-sms-activate-inbox',
    'sync-services-unified',
    'cleanup-expired-activations',
    'cleanup-expired-rentals',
    'get-real-time-prices',
    'update-activation-sms',
    'moneroo-webhook',
    'moneyfusion-webhook',
    'paytech-ipn'
  ];

  console.log(`📋 Functions à vérifier: ${functions.length}`);
  console.log('');

  // Test de santé basique (ping)
  let deployedCount = 0;
  for (const func of functions) {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/${func}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );
      
      // Même une erreur 400/405 signifie que la fonction existe
      if (response.status < 500) {
        console.log(`✅ ${func}`);
        deployedCount++;
      } else {
        console.log(`❌ ${func} (erreur ${response.status})`);
      }
    } catch (error) {
      console.log(`⚠️  ${func} (inaccessible)`);
    }
  }

  console.log(`\n📊 Functions déployées: ${deployedCount}/${functions.length}`);
  console.log('');
}

// ============================================
// 10. SANTÉ GÉNÉRALE
// ============================================
async function analyzeHealth() {
  console.log('🏥 10. SANTÉ GÉNÉRALE DU SYSTÈME');
  console.log('-'.repeat(60));

  try {
    // Test de connexion DB
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Connexion DB: ERREUR');
      console.log(`   ${error.message}`);
    } else {
      console.log('✅ Connexion DB: OK');
    }

    // Vérifier les activations bloquées
    const { count: stuckActivations } = await supabase
      .from('activations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (stuckActivations > 0) {
      console.log(`⚠️  Activations bloquées (+30min): ${stuckActivations}`);
    } else {
      console.log('✅ Pas d\'activations bloquées');
    }

    // Vérifier les rentals expirés non traités
    const { count: expiredRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (expiredRentals > 0) {
      console.log(`⚠️  Rentals expirés non traités: ${expiredRentals}`);
    } else {
      console.log('✅ Pas de rentals expirés');
    }

    // Vérifier incohérences frozen amounts
    const { data: frozenCheck } = await supabase
      .from('frozen_amounts')
      .select('user_id, amount')
      .eq('is_released', false);

    if (frozenCheck && frozenCheck.length > 0) {
      const userFrozen = {};
      frozenCheck.forEach(f => {
        userFrozen[f.user_id] = (userFrozen[f.user_id] || 0) + parseFloat(f.amount);
      });

      let issues = 0;
      for (const [userId, frozen] of Object.entries(userFrozen)) {
        const { data: userData } = await supabase
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        if (userData && frozen > parseFloat(userData.credits)) {
          issues++;
        }
      }

      if (issues > 0) {
        console.log(`⚠️  Incohérences frozen/credits: ${issues} utilisateurs`);
      } else {
        console.log('✅ Cohérence frozen amounts: OK');
      }
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================
async function main() {
  try {
    await analyzeTableStructure();
    await analyzeUsers();
    await analyzeActivations();
    await analyzeFinances();
    await analyzeSMS();
    await analyzeServicesCountries();
    await analyzeProviders();
    await analyzeLogs();
    await analyzeEdgeFunctions();
    await analyzeHealth();

    console.log('='.repeat(60));
    console.log('✅ ANALYSE TERMINÉE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ ERREUR FATALE:', error.message);
    process.exit(1);
  }
}

main();
