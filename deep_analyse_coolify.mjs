#!/usr/bin/env node
/**
 * 🔍 DEEP ANALYSE DE COOLIFY SUPABASE
 * Analyse complète de l'état actuel avant import
 */

import { createClient } from '@supabase/supabase-js';

const COOLIFY = {
  url: 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
};

const PROD = {
  url: 'https://htfqmamvmhdoixqcbbbw.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
};

const coolify = createClient(COOLIFY.url, COOLIFY.key);
const prod = createClient(PROD.url, PROD.key);

// Toutes les tables possibles
const ALL_TABLES = [
  'users', 'services', 'activations', 'transactions', 'rentals', 
  'countries', 'operators', 'packages', 'payment_providers', 
  'pricing_rules', 'promo_codes', 'referral_earnings', 'referral_settings',
  'settings', 'sms_messages', 'sync_history', 'wave_payments', 'logs_provider',
  'email_campaigns', 'contact_messages', 'wave_proofs', 'rental_messages'
];

async function analyzeTable(client, name, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  
  if (error) {
    if (error.message.includes('does not exist')) {
      return { exists: false, count: 0, error: 'NOT EXISTS' };
    }
    return { exists: true, count: 0, error: error.message };
  }
  
  return { exists: true, count: count || 0, error: null };
}

async function getTableSample(client, table, limit = 3) {
  const { data, error } = await client.from(table).select('*').limit(limit);
  if (error) return [];
  return data || [];
}

async function getTableColumns(client, table) {
  const sample = await getTableSample(client, table, 1);
  if (sample.length === 0) return [];
  return Object.keys(sample[0]);
}

async function main() {
  console.log('🔍 DEEP ANALYSE COOLIFY SUPABASE');
  console.log('='.repeat(70));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 ${COOLIFY.url}\n`);

  // ===== 1. TEST CONNEXION =====
  console.log('1️⃣ TEST DE CONNEXION');
  console.log('-'.repeat(50));
  
  try {
    const { data, error } = await coolify.from('users').select('id').limit(1);
    if (error) {
      console.log('   ❌ Connexion échouée:', error.message);
      return;
    }
    console.log('   ✅ Connexion OK\n');
  } catch (e) {
    console.log('   ❌ Erreur connexion:', e.message);
    return;
  }

  // ===== 2. COMPARAISON DES TABLES =====
  console.log('2️⃣ COMPARAISON TABLES PROD vs COOLIFY');
  console.log('-'.repeat(50));
  
  console.log('Table'.padEnd(22), 'PROD'.padEnd(12), 'COOLIFY'.padEnd(12), 'STATUS');
  console.log('-'.repeat(60));
  
  const tableAnalysis = {};
  
  for (const table of ALL_TABLES) {
    const prodResult = await analyzeTable(prod, 'prod', table);
    const coolResult = await analyzeTable(coolify, 'coolify', table);
    
    let status = '';
    if (!prodResult.exists && !coolResult.exists) {
      status = '⚪ N/A';
    } else if (prodResult.exists && !coolResult.exists) {
      status = '🔴 MANQUE SUR COOLIFY';
    } else if (!prodResult.exists && coolResult.exists) {
      status = '🟡 Extra sur Coolify';
    } else if (prodResult.count === coolResult.count) {
      status = '✅ Synced';
    } else if (prodResult.count > coolResult.count) {
      status = `⚠️ -${prodResult.count - coolResult.count}`;
    } else {
      status = `➕ +${coolResult.count - prodResult.count}`;
    }
    
    const prodStr = prodResult.exists ? String(prodResult.count) : 'N/A';
    const coolStr = coolResult.exists ? String(coolResult.count) : 'N/A';
    
    console.log(table.padEnd(22), prodStr.padEnd(12), coolStr.padEnd(12), status);
    
    tableAnalysis[table] = { prod: prodResult, coolify: coolResult };
  }

  // ===== 3. STRUCTURE DES TABLES COOLIFY =====
  console.log('\n3️⃣ STRUCTURE DES TABLES COOLIFY');
  console.log('-'.repeat(50));
  
  const criticalTables = ['users', 'services', 'activations', 'transactions', 'rentals'];
  
  for (const table of criticalTables) {
    if (!tableAnalysis[table]?.coolify?.exists) continue;
    
    const columns = await getTableColumns(coolify, table);
    console.log(`\n   📋 ${table} (${columns.length} colonnes):`);
    console.log(`      ${columns.join(', ')}`);
  }

  // ===== 4. ÉCHANTILLONS DE DONNÉES =====
  console.log('\n\n4️⃣ ÉCHANTILLONS DE DONNÉES COOLIFY');
  console.log('-'.repeat(50));
  
  // Users
  console.log('\n   👥 USERS (5 premiers):');
  const users = await getTableSample(coolify, 'users', 5);
  users.forEach(u => {
    console.log(`      - ${u.email?.substring(0, 30)?.padEnd(30)} | role: ${u.role?.padEnd(8)} | balance: ${u.balance}`);
  });
  
  // Services
  console.log('\n   🔧 SERVICES (par API source):');
  const services = await getTableSample(coolify, 'services', 100);
  const byApi = {};
  services.forEach(s => {
    byApi[s.api_source || 'null'] = (byApi[s.api_source || 'null'] || 0) + 1;
  });
  Object.entries(byApi).forEach(([api, count]) => {
    console.log(`      - ${api}: ${count}`);
  });
  
  // Activations
  console.log('\n   📱 ACTIVATIONS (5 dernières):');
  const { data: activations } = await coolify.from('activations')
    .select('id, phone_number, status, created_at, service_name')
    .order('created_at', { ascending: false })
    .limit(5);
  
  (activations || []).forEach(a => {
    console.log(`      - ${a.created_at?.substring(0, 16)} | ${a.phone_number} | ${a.status} | ${a.service_name}`);
  });
  
  // Transactions
  console.log('\n   💰 TRANSACTIONS (5 dernières):');
  const { data: transactions } = await coolify.from('transactions')
    .select('id, type, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (transactions && transactions.length > 0) {
    transactions.forEach(t => {
      console.log(`      - ${t.created_at?.substring(0, 16)} | ${t.type?.padEnd(15)} | ${t.amount} FCFA`);
    });
  } else {
    console.log('      (aucune transaction)');
  }

  // ===== 5. AUTH USERS =====
  console.log('\n5️⃣ AUTH USERS');
  console.log('-'.repeat(50));
  
  const { data: prodAuth } = await prod.auth.admin.listUsers();
  const { data: coolAuth } = await coolify.auth.admin.listUsers();
  
  console.log(`   Production: ${prodAuth?.users?.length || 0} utilisateurs`);
  console.log(`   Coolify: ${coolAuth?.users?.length || 0} utilisateurs`);
  
  if (coolAuth?.users?.length > 0) {
    console.log('\n   📧 Derniers auth.users sur Coolify:');
    coolAuth.users.slice(-5).forEach(u => {
      console.log(`      - ${u.email} | créé: ${u.created_at?.substring(0, 10)}`);
    });
  }

  // ===== 6. PROBLÈMES DÉTECTÉS =====
  console.log('\n6️⃣ PROBLÈMES DÉTECTÉS');
  console.log('-'.repeat(50));
  
  const problems = [];
  
  // Tables manquantes sur Coolify
  for (const [table, analysis] of Object.entries(tableAnalysis)) {
    if (analysis.prod.exists && !analysis.coolify.exists) {
      problems.push(`🔴 Table "${table}" existe en PROD mais PAS sur Coolify`);
    }
    if (analysis.prod.exists && analysis.coolify.exists && analysis.prod.count > analysis.coolify.count) {
      const diff = analysis.prod.count - analysis.coolify.count;
      problems.push(`⚠️ Table "${table}": ${diff} enregistrements manquants sur Coolify`);
    }
  }
  
  // Différence auth users
  const authDiff = (prodAuth?.users?.length || 0) - (coolAuth?.users?.length || 0);
  if (authDiff > 0) {
    problems.push(`⚠️ Auth users: ${authDiff} utilisateurs manquants sur Coolify`);
  }
  
  if (problems.length === 0) {
    console.log('   ✅ Aucun problème majeur détecté');
  } else {
    problems.forEach(p => console.log(`   ${p}`));
  }

  // ===== 7. RECOMMANDATIONS =====
  console.log('\n7️⃣ RECOMMANDATIONS AVANT IMPORT');
  console.log('-'.repeat(50));
  
  const missingTables = Object.entries(tableAnalysis)
    .filter(([_, a]) => a.prod.exists && !a.coolify.exists)
    .map(([t, _]) => t);
  
  if (missingTables.length > 0) {
    console.log(`   🔧 1. Créer les tables manquantes: ${missingTables.join(', ')}`);
  }
  
  console.log('   📋 2. Vérifier les contraintes et indexes');
  console.log('   🔒 3. Vérifier les politiques RLS');
  console.log('   ⚡ 4. Vérifier les triggers et functions');
  
  // ===== 8. RÉSUMÉ =====
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(70));
  
  const existingOnBoth = Object.values(tableAnalysis).filter(a => a.prod.exists && a.coolify.exists).length;
  const missingOnCoolify = Object.values(tableAnalysis).filter(a => a.prod.exists && !a.coolify.exists).length;
  const totalProdRecords = Object.values(tableAnalysis).reduce((sum, a) => sum + (a.prod.count || 0), 0);
  const totalCoolifyRecords = Object.values(tableAnalysis).reduce((sum, a) => sum + (a.coolify.count || 0), 0);
  
  console.log(`   Tables sur les deux: ${existingOnBoth}`);
  console.log(`   Tables manquantes sur Coolify: ${missingOnCoolify}`);
  console.log(`   Total enregistrements PROD: ${totalProdRecords}`);
  console.log(`   Total enregistrements Coolify: ${totalCoolifyRecords}`);
  console.log(`   Différence: ${totalProdRecords - totalCoolifyRecords}`);
  console.log(`   Auth users PROD: ${prodAuth?.users?.length || 0}`);
  console.log(`   Auth users Coolify: ${coolAuth?.users?.length || 0}`);
}

main().catch(console.error);
