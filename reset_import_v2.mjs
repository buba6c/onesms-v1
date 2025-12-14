#!/usr/bin/env node
/**
 * 🔄 RESET COMPLET COOLIFY + IMPORT DEPUIS PRODUCTION (V2)
 * Version corrigée avec suppression par petits lots
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration
const PROD = {
  url: 'https://htfqmamvmhdoixqcbbbw.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
};

const COOLIFY = {
  url: 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
};

const prod = createClient(PROD.url, PROD.key);
const coolify = createClient(COOLIFY.url, COOLIFY.key);

// Tables dans l'ordre
const TABLES_IMPORT_ORDER = [
  'countries',
  'services',
  'payment_providers',
  'promo_codes',
  'email_campaigns',
  'users',
  'activations',
  'rentals',
  'rental_messages',
  'transactions',
  'sms_messages',
  'contact_messages',
  'logs_provider'
];

const TABLES_DELETE_ORDER = [...TABLES_IMPORT_ORDER].reverse();

const backup = {};
const stats = { errors: [] };

/**
 * Récupérer toutes les données
 */
async function fetchAll(table) {
  const allData = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await prod.from(table).select('*').range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    allData.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  
  return allData;
}

/**
 * Supprimer par petits lots (10 à la fois)
 */
async function clearTable(table) {
  let totalDeleted = 0;
  let safetyCounter = 0;
  const maxIterations = 200;
  
  while (safetyCounter < maxIterations) {
    // Récupérer 10 IDs à la fois
    const { data: existing } = await coolify.from(table).select('id').limit(10);
    
    if (!existing || existing.length === 0) break;
    
    // Supprimer un par un
    for (const row of existing) {
      const { error } = await coolify.from(table).delete().eq('id', row.id);
      if (!error) totalDeleted++;
    }
    
    safetyCounter++;
    
    // Afficher progress tous les 50
    if (totalDeleted > 0 && totalDeleted % 50 === 0) {
      process.stdout.write(`\r   ${table.padEnd(20)}... ${totalDeleted} supprimés`);
    }
  }
  
  return totalDeleted;
}

/**
 * Insérer par lots de 20
 */
async function insertData(table, data) {
  if (!data || data.length === 0) return { inserted: 0, errors: 0 };
  
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += 20) {
    const batch = data.slice(i, i + 20);
    
    const { error } = await coolify.from(table).insert(batch);
    
    if (error) {
      // Un par un si erreur
      for (const row of batch) {
        const { error: e } = await coolify.from(table).insert(row);
        if (e) {
          errors++;
          if (errors <= 5) stats.errors.push(`${table}: ${e.message.substring(0, 60)}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
    
    if (data.length > 100 && i % 100 === 0 && i > 0) {
      process.stdout.write(`\r   ${table.padEnd(20)} ${i}/${data.length}...`);
    }
  }
  
  return { inserted, errors };
}

async function main() {
  console.log('🚀 RESET & IMPORT COOLIFY (V2)');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  const startTime = Date.now();

  // ===== ÉTAPE 1: BACKUP =====
  console.log('📦 ÉTAPE 1: BACKUP PRODUCTION');
  console.log('-'.repeat(50));
  
  let totalBackup = 0;
  
  for (const table of TABLES_IMPORT_ORDER) {
    process.stdout.write(`   ${table.padEnd(20)}... `);
    const data = await fetchAll(table);
    backup[table] = data;
    totalBackup += data.length;
    console.log(`${data.length}`);
  }
  
  // Auth
  const { data: authData } = await prod.auth.admin.listUsers();
  backup.auth_users = authData?.users || [];
  console.log(`   auth.users           ... ${backup.auth_users.length}`);
  
  const backupFile = `backup_v2_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\n   💾 ${backupFile} (${totalBackup} records)\n`);

  // ===== ÉTAPE 2: VIDER COOLIFY =====
  console.log('🗑️ ÉTAPE 2: VIDER COOLIFY');
  console.log('-'.repeat(50));
  
  for (const table of TABLES_DELETE_ORDER) {
    process.stdout.write(`   ${table.padEnd(20)}... `);
    const deleted = await clearTable(table);
    console.log(`\r   ${table.padEnd(20)}... ${deleted} supprimés`);
  }
  console.log();

  // ===== ÉTAPE 3: IMPORT =====
  console.log('📤 ÉTAPE 3: IMPORT');
  console.log('-'.repeat(50));
  
  for (const table of TABLES_IMPORT_ORDER) {
    const data = backup[table];
    process.stdout.write(`   ${table.padEnd(20)} (${data.length})... `);
    
    if (data.length === 0) {
      console.log('vide');
      continue;
    }
    
    const { inserted, errors } = await insertData(table, data);
    console.log(`\r   ${table.padEnd(20)} (${data.length})... ✅ ${inserted} | ❌ ${errors}`);
  }
  console.log();

  // ===== ÉTAPE 4: AUTH =====
  console.log('🔐 ÉTAPE 4: AUTH USERS');
  console.log('-'.repeat(50));
  
  const { data: existingAuth } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(existingAuth?.users?.map(u => u.email) || []);
  
  let created = 0, skipped = 0;
  
  for (const user of backup.auth_users) {
    if (existingEmails.has(user.email)) {
      skipped++;
      continue;
    }
    
    const { error } = await coolify.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: user.user_metadata || {},
      password: `Mig_${Math.random().toString(36).slice(2, 10)}`
    });
    
    if (!error) created++;
  }
  
  console.log(`   Créés: ${created} | Existants: ${skipped}\n`);

  // ===== ÉTAPE 5: VÉRIF =====
  console.log('🔍 ÉTAPE 5: VÉRIFICATION');
  console.log('-'.repeat(50));
  
  console.log('   ' + 'Table'.padEnd(20) + 'PROD'.padEnd(8) + 'COOL'.padEnd(8) + 'OK?');
  console.log('   ' + '-'.repeat(40));
  
  let allGood = true;
  
  for (const table of TABLES_IMPORT_ORDER) {
    const prodCount = backup[table].length;
    const { count: coolCount } = await coolify.from(table).select('*', { count: 'exact', head: true });
    
    const ok = prodCount === (coolCount || 0);
    if (!ok) allGood = false;
    
    console.log(`   ${table.padEnd(20)} ${String(prodCount).padEnd(8)} ${String(coolCount || 0).padEnd(8)} ${ok ? '✅' : '⚠️'}`);
  }
  
  const { data: finalAuth } = await coolify.auth.admin.listUsers();
  console.log(`\n   Auth: ${finalAuth?.users?.length || 0} / ${backup.auth_users.length}`);

  // Résumé
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(allGood ? '🎉 MIGRATION RÉUSSIE!' : '⚠️ Vérifier les différences');
  console.log(`⏱️ Durée: ${duration}s`);
  
  if (stats.errors.length > 0) {
    console.log('\nErreurs:');
    stats.errors.forEach(e => console.log(`   - ${e}`));
  }
}

main().catch(console.error);
