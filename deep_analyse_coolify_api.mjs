#!/usr/bin/env node
/**
 * 🔍 DEEP ANALYSE STRUCTURE COOLIFY (via API)
 * Analyse via RPC et requêtes SQL
 */

import { createClient } from '@supabase/supabase-js';

const COOLIFY = {
  url: 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
};

const coolify = createClient(COOLIFY.url, COOLIFY.key);

// Tables critiques à vérifier
const CRITICAL_TABLES = [
  'users', 'services', 'activations', 'transactions', 
  'rentals', 'countries', 'payment_providers', 'promo_codes'
];

async function checkTableColumns(table) {
  const { data, error } = await coolify.from(table).select('*').limit(1);
  if (error) return { exists: false, columns: [], error: error.message };
  if (!data || data.length === 0) {
    // Table existe mais vide - essayer d'insérer puis rollback pour voir les colonnes
    return { exists: true, columns: [], empty: true };
  }
  return { exists: true, columns: Object.keys(data[0]), empty: false };
}

async function testInsert(table, testData) {
  // Test d'insertion pour vérifier les contraintes
  const { error } = await coolify.from(table).insert(testData).select();
  if (error) {
    return { success: false, error: error.message };
  }
  // Supprimer le test
  if (testData.id) {
    await coolify.from(table).delete().eq('id', testData.id);
  }
  return { success: true };
}

async function main() {
  console.log('🔍 DEEP ANALYSE STRUCTURE COOLIFY (via API)');
  console.log('='.repeat(70));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 ${COOLIFY.url}\n`);

  // ===== 1. COLONNES DE CHAQUE TABLE =====
  console.log('1️⃣ STRUCTURE DES TABLES');
  console.log('-'.repeat(50));

  for (const table of CRITICAL_TABLES) {
    const result = await checkTableColumns(table);
    if (!result.exists) {
      console.log(`\n   ❌ ${table}: ${result.error}`);
    } else if (result.empty) {
      console.log(`\n   📋 ${table}: (vide - colonnes non détectables)`);
    } else {
      console.log(`\n   📋 ${table} (${result.columns.length} colonnes):`);
      // Grouper par 5
      for (let i = 0; i < result.columns.length; i += 5) {
        const group = result.columns.slice(i, i + 5);
        console.log(`      ${group.join(', ')}`);
      }
    }
  }

  // ===== 2. VÉRIFIER LES CONTRAINTES VIA TESTS =====
  console.log('\n\n2️⃣ TEST DES CONTRAINTES');
  console.log('-'.repeat(50));

  // Test users
  console.log('\n   🧪 Test users (email unique):');
  const { data: existingUser } = await coolify.from('users').select('email').limit(1);
  if (existingUser && existingUser[0]) {
    const duplicateTest = await coolify.from('users').insert({
      id: 'test-dup-' + Date.now(),
      email: existingUser[0].email,
      role: 'user'
    });
    if (duplicateTest.error) {
      console.log('      ✅ Contrainte email unique: OK');
      console.log(`         (${duplicateTest.error.message.substring(0, 60)})`);
    } else {
      console.log('      ⚠️ Pas de contrainte email unique!');
    }
  }

  // Test transactions types
  console.log('\n   🧪 Test transactions (types valides):');
  const invalidTypeTest = await coolify.from('transactions').insert({
    id: 'test-type-' + Date.now(),
    user_id: 'fake-user',
    type: 'invalid_type_xyz',
    amount: 100
  });
  if (invalidTypeTest.error) {
    if (invalidTypeTest.error.message.includes('check') || invalidTypeTest.error.message.includes('constraint')) {
      console.log('      ✅ Contrainte type valide: OK');
    } else if (invalidTypeTest.error.message.includes('foreign key')) {
      console.log('      ✅ Contrainte FK user_id: OK');
    }
    console.log(`         (${invalidTypeTest.error.message.substring(0, 60)})`);
  } else {
    console.log('      ⚠️ Pas de contrainte sur les types!');
  }

  // Test activations FK
  console.log('\n   🧪 Test activations (FK user_id):');
  const fkTest = await coolify.from('activations').insert({
    id: 'test-fk-' + Date.now(),
    user_id: 'non-existent-user-12345',
    order_id: '12345',
    phone: '0000000000',
    service_code: 'test',
    country_code: 'FR',
    price: 100,
    status: 'pending'
  });
  if (fkTest.error && fkTest.error.message.includes('foreign key')) {
    console.log('      ✅ Contrainte FK user_id: OK');
  } else if (fkTest.error) {
    console.log(`      ⚠️ Autre erreur: ${fkTest.error.message.substring(0, 50)}`);
  } else {
    console.log('      ⚠️ Pas de contrainte FK!');
    // Nettoyer
    await coolify.from('activations').delete().eq('id', 'test-fk-' + Date.now());
  }

  // ===== 3. VÉRIFIER LES DONNÉES INCOHÉRENTES =====
  console.log('\n\n3️⃣ COHÉRENCE DES DONNÉES');
  console.log('-'.repeat(50));

  // Activations sans user valide
  console.log('\n   🔍 Activations avec user_id invalide:');
  const { data: activations } = await coolify.from('activations').select('id, user_id').limit(100);
  const { data: users } = await coolify.from('users').select('id');
  const userIds = new Set(users?.map(u => u.id) || []);
  const orphanActivations = (activations || []).filter(a => !userIds.has(a.user_id));
  console.log(`      ${orphanActivations.length} activations orphelines`);

  // Transactions sans user valide
  console.log('\n   🔍 Transactions avec user_id invalide:');
  const { data: transactions } = await coolify.from('transactions').select('id, user_id').limit(500);
  const orphanTransactions = (transactions || []).filter(t => !userIds.has(t.user_id));
  console.log(`      ${orphanTransactions.length} transactions orphelines`);

  // Users avec balance négative
  console.log('\n   🔍 Users avec balance négative:');
  const { data: negativeBalance } = await coolify.from('users').select('id, email, balance').lt('balance', 0);
  console.log(`      ${negativeBalance?.length || 0} users avec balance < 0`);
  if (negativeBalance && negativeBalance.length > 0) {
    negativeBalance.slice(0, 3).forEach(u => {
      console.log(`         - ${u.email}: ${u.balance}`);
    });
  }

  // ===== 4. TYPES DE DONNÉES =====
  console.log('\n\n4️⃣ TYPES DE TRANSACTIONS EXISTANTS');
  console.log('-'.repeat(50));

  const { data: txTypes } = await coolify.from('transactions').select('type');
  if (txTypes) {
    const typeCounts = {};
    txTypes.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }

  // ===== 5. STATUTS DES ACTIVATIONS =====
  console.log('\n5️⃣ STATUTS DES ACTIVATIONS');
  console.log('-'.repeat(50));

  const { data: actStatuses } = await coolify.from('activations').select('status');
  if (actStatuses) {
    const statusCounts = {};
    actStatuses.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  }

  // ===== 6. PAYMENT PROVIDERS =====
  console.log('\n6️⃣ PAYMENT PROVIDERS');
  console.log('-'.repeat(50));

  const { data: providers, error: provErr } = await coolify.from('payment_providers').select('*');
  if (provErr) {
    console.log(`   ⚠️ Erreur: ${provErr.message}`);
  } else if (!providers || providers.length === 0) {
    console.log('   ❌ AUCUN PROVIDER - Import requis!');
  } else {
    providers.forEach(p => {
      console.log(`   ✅ ${p.name} (${p.provider_code}) - ${p.is_active ? 'Actif' : 'Inactif'}`);
    });
  }

  // ===== RÉSUMÉ =====
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSUMÉ ANALYSE');
  console.log('='.repeat(70));

  const issues = [];
  
  if (!providers || providers.length === 0) {
    issues.push('❌ payment_providers vide');
  }
  
  if (orphanActivations.length > 0) {
    issues.push(`⚠️ ${orphanActivations.length} activations orphelines`);
  }
  
  if (orphanTransactions.length > 0) {
    issues.push(`⚠️ ${orphanTransactions.length} transactions orphelines`);
  }

  if (issues.length === 0) {
    console.log('   ✅ Aucun problème majeur détecté');
  } else {
    console.log('   PROBLÈMES À CORRIGER:');
    issues.forEach(i => console.log(`   ${i}`));
  }

  console.log('\n   PRÊT POUR IMPORT: ' + (issues.length < 3 ? '✅ OUI' : '⚠️ Corriger d\'abord'));
}

main().catch(console.error);
