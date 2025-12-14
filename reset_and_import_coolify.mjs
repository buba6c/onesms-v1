#!/usr/bin/env node
/**
 * 🔄 RESET COMPLET COOLIFY + IMPORT DEPUIS PRODUCTION
 * 
 * Option 1: Vider tout et réimporter
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

// Tables dans l'ordre d'import (parents d'abord, enfants après)
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

// Ordre inverse pour suppression (enfants d'abord)
const TABLES_DELETE_ORDER = [...TABLES_IMPORT_ORDER].reverse();

const backup = {};
const stats = {
  backup: {},
  deleted: {},
  imported: {},
  errors: []
};

/**
 * Récupérer toutes les données d'une table
 */
async function fetchAll(table) {
  const allData = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await prod
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        return [];
      }
      console.log(`      ⚠️ ${error.message}`);
      return [];
    }
    
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  
  return allData;
}

/**
 * Supprimer toutes les données d'une table sur Coolify
 */
async function clearTable(table) {
  let totalDeleted = 0;
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const { data: existing } = await coolify.from(table).select('id').limit(500);
    
    if (!existing || existing.length === 0) break;
    
    const ids = existing.map(r => r.id);
    const { error } = await coolify.from(table).delete().in('id', ids);
    
    if (error) {
      console.log(`      ⚠️ ${error.message}`);
      break;
    }
    
    totalDeleted += ids.length;
    attempts++;
  }
  
  return totalDeleted;
}

/**
 * Insérer des données
 */
async function insertData(table, data) {
  if (!data || data.length === 0) return { inserted: 0, errors: 0 };
  
  let inserted = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await coolify.from(table).insert(batch);
    
    if (error) {
      // Essayer un par un
      for (const row of batch) {
        const { error: singleErr } = await coolify.from(table).insert(row);
        if (singleErr) {
          errors++;
          if (errors <= 3) {
            stats.errors.push(`${table}: ${singleErr.message.substring(0, 50)}`);
          }
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
    
    // Progress pour grandes tables
    if (data.length > 200 && i % 200 === 0 && i > 0) {
      process.stdout.write(`\r      ⏳ ${i}/${data.length}`);
    }
  }
  
  if (data.length > 200) {
    process.stdout.write('\r                              \r');
  }
  
  return { inserted, errors };
}

/**
 * Main
 */
async function main() {
  console.log('🚀 RESET COMPLET COOLIFY + IMPORT DEPUIS PRODUCTION');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  const startTime = Date.now();

  // ===== ÉTAPE 1: BACKUP PRODUCTION =====
  console.log('📦 ÉTAPE 1: BACKUP DE LA PRODUCTION');
  console.log('-'.repeat(50));
  
  let totalBackup = 0;
  
  for (const table of TABLES_IMPORT_ORDER) {
    process.stdout.write(`   ${table.padEnd(20)}... `);
    const data = await fetchAll(table);
    backup[table] = data;
    stats.backup[table] = data.length;
    totalBackup += data.length;
    console.log(`${data.length} enregistrements`);
  }
  
  // Auth users
  console.log(`   ${'auth.users'.padEnd(20)}... `);
  const { data: authData } = await prod.auth.admin.listUsers();
  backup.auth_users = authData?.users || [];
  console.log(`${backup.auth_users.length} utilisateurs`);
  
  // Sauvegarder en JSON
  const backupFile = `backup_full_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\n   💾 Sauvegardé: ${backupFile}`);
  console.log(`   📊 Total: ${totalBackup} enregistrements\n`);

  // ===== ÉTAPE 2: VIDER COOLIFY =====
  console.log('🗑️ ÉTAPE 2: VIDER COOLIFY');
  console.log('-'.repeat(50));
  
  for (const table of TABLES_DELETE_ORDER) {
    process.stdout.write(`   ${table.padEnd(20)}... `);
    const deleted = await clearTable(table);
    stats.deleted[table] = deleted;
    console.log(`${deleted} supprimés`);
  }
  console.log();

  // ===== ÉTAPE 3: IMPORT =====
  console.log('📤 ÉTAPE 3: IMPORT VERS COOLIFY');
  console.log('-'.repeat(50));
  
  for (const table of TABLES_IMPORT_ORDER) {
    const data = backup[table];
    process.stdout.write(`   ${table.padEnd(20)} (${data.length})... `);
    
    if (data.length === 0) {
      console.log('⏭️ vide');
      stats.imported[table] = { inserted: 0, errors: 0 };
      continue;
    }
    
    const result = await insertData(table, data);
    stats.imported[table] = result;
    console.log(`✅ ${result.inserted} | ❌ ${result.errors}`);
  }
  console.log();

  // ===== ÉTAPE 4: AUTH USERS =====
  console.log('🔐 ÉTAPE 4: SYNCHRONISER AUTH.USERS');
  console.log('-'.repeat(50));
  
  // Récupérer les emails existants
  const { data: existingAuth } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(existingAuth?.users?.map(u => u.email) || []);
  
  let authCreated = 0;
  let authSkipped = 0;
  let authErrors = 0;
  
  for (const user of backup.auth_users) {
    if (existingEmails.has(user.email)) {
      authSkipped++;
      continue;
    }
    
    try {
      const { error } = await coolify.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: user.user_metadata || {},
        password: `Migration_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      });
      
      if (error) {
        authErrors++;
      } else {
        authCreated++;
      }
    } catch (e) {
      authErrors++;
    }
  }
  
  console.log(`   Créés: ${authCreated} | Existants: ${authSkipped} | Erreurs: ${authErrors}\n`);

  // ===== ÉTAPE 5: VÉRIFICATION =====
  console.log('🔍 ÉTAPE 5: VÉRIFICATION FINALE');
  console.log('-'.repeat(50));
  
  console.log('\n   ' + 'Table'.padEnd(20) + 'PROD'.padEnd(10) + 'COOLIFY'.padEnd(10) + 'STATUS');
  console.log('   ' + '-'.repeat(50));
  
  let allGood = true;
  
  for (const table of TABLES_IMPORT_ORDER) {
    const prodCount = backup[table].length;
    const { count: coolCount } = await coolify.from(table).select('*', { count: 'exact', head: true });
    
    const diff = prodCount - (coolCount || 0);
    let status = '✅';
    if (diff > 0) {
      status = `⚠️ -${diff}`;
      allGood = false;
    } else if (diff < 0) {
      status = `➕ +${Math.abs(diff)}`;
    }
    
    console.log(`   ${table.padEnd(20)} ${String(prodCount).padEnd(10)} ${String(coolCount || 0).padEnd(10)} ${status}`);
  }
  
  // Auth users
  const { data: finalAuth } = await coolify.auth.admin.listUsers();
  console.log(`\n   Auth Users: ${finalAuth?.users?.length || 0} / ${backup.auth_users.length}`);

  // ===== RÉSUMÉ =====
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  
  const totalImported = Object.values(stats.imported).reduce((sum, s) => sum + s.inserted, 0);
  const totalErrors = Object.values(stats.imported).reduce((sum, s) => sum + s.errors, 0);
  
  console.log(`   ✅ Importés: ${totalImported}`);
  console.log(`   ❌ Erreurs: ${totalErrors}`);
  console.log(`   ⏱️ Durée: ${duration}s`);
  
  if (stats.errors.length > 0) {
    console.log('\n   Premières erreurs:');
    stats.errors.slice(0, 5).forEach(e => console.log(`      - ${e}`));
  }
  
  console.log('\n' + (allGood ? '🎉 MIGRATION TERMINÉE AVEC SUCCÈS!' : '⚠️ Quelques différences - vérifier ci-dessus'));
}

main().catch(console.error);
