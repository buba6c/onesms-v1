#!/usr/bin/env node
/**
 * 🔄 BACKUP & MIGRATION COMPLET VERS COOLIFY (via API)
 * Version sans connexion PostgreSQL directe
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

// Tables dans l'ordre (parents d'abord)
const TABLES = [
  'countries',
  'services', 
  'payment_providers',
  'promo_codes',
  'email_campaigns',
  'users',
  'activations',
  'rentals',
  'transactions',
  'sms_messages',
  'contact_messages',
  'logs_provider'
];

/**
 * Récupérer toutes les données d'une table
 */
async function fetchAll(client, table) {
  const allData = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);
    
    if (error) return { data: [], error };
    if (!data || data.length === 0) break;
    
    allData.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  
  return { data: allData, error: null };
}

/**
 * Supprimer toutes les données d'une table sur Coolify
 */
async function clearTable(table) {
  // Supprimer par lots
  let deleted = 0;
  while (true) {
    const { data: existing } = await coolify.from(table).select('id').limit(500);
    if (!existing || existing.length === 0) break;
    
    const ids = existing.map(r => r.id);
    const { error } = await coolify.from(table).delete().in('id', ids);
    if (error) {
      console.log(`      ⚠️ Erreur suppression: ${error.message}`);
      break;
    }
    deleted += ids.length;
  }
  return deleted;
}

/**
 * Insérer des données par lots
 */
async function insertBatch(table, data) {
  if (!data || data.length === 0) return { inserted: 0, errors: 0 };
  
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await coolify.from(table).insert(batch);
    
    if (error) {
      // Essayer un par un
      for (const row of batch) {
        const { error: singleErr } = await coolify.from(table).insert(row);
        if (singleErr) {
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
    
    // Progress
    if (data.length > 100 && i % 200 === 0) {
      process.stdout.write(`\r      ⏳ ${i}/${data.length}`);
    }
  }
  
  if (data.length > 100) process.stdout.write('\r');
  
  return { inserted, errors };
}

/**
 * Main
 */
async function main() {
  console.log('🚀 MIGRATION COMPLÈTE SUPABASE CLOUD → COOLIFY');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  const startTime = Date.now();
  const backup = {};
  
  // ===== ÉTAPE 1: BACKUP =====
  console.log('📦 ÉTAPE 1: BACKUP DE PRODUCTION');
  console.log('-'.repeat(40));
  
  for (const table of TABLES) {
    process.stdout.write(`   ${table}... `);
    const { data, error } = await fetchAll(prod, table);
    
    if (error) {
      console.log(`⚠️ ${error.message}`);
      backup[table] = [];
    } else {
      console.log(`${data.length} enregistrements`);
      backup[table] = data;
    }
  }
  
  // Auth users
  console.log('   auth.users... ');
  const { data: authData } = await prod.auth.admin.listUsers();
  backup.auth_users = authData?.users || [];
  console.log(`   → ${backup.auth_users.length} utilisateurs\n`);
  
  // Sauvegarder le backup
  const backupFile = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`   💾 Sauvegardé: ${backupFile}\n`);
  
  // ===== ÉTAPE 2: VIDER COOLIFY =====
  console.log('🗑️ ÉTAPE 2: VIDER COOLIFY');
  console.log('-'.repeat(40));
  
  // Ordre inverse pour les FK
  const tablesToClear = [...TABLES].reverse();
  
  for (const table of tablesToClear) {
    process.stdout.write(`   ${table}... `);
    const deleted = await clearTable(table);
    console.log(`${deleted} supprimés`);
  }
  console.log();
  
  // ===== ÉTAPE 3: IMPORTER =====
  console.log('📤 ÉTAPE 3: IMPORT VERS COOLIFY');
  console.log('-'.repeat(40));
  
  for (const table of TABLES) {
    const data = backup[table];
    process.stdout.write(`   ${table} (${data.length})... `);
    
    if (data.length === 0) {
      console.log('⏭️ vide');
      continue;
    }
    
    const { inserted, errors } = await insertBatch(table, data);
    console.log(`✅ ${inserted} | ❌ ${errors}`);
  }
  console.log();
  
  // ===== ÉTAPE 4: AUTH USERS =====
  console.log('🔐 ÉTAPE 4: AUTH USERS');
  console.log('-'.repeat(40));
  
  const { data: coolifyAuthData } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(coolifyAuthData?.users?.map(u => u.email) || []);
  
  let authCreated = 0;
  let authSkipped = 0;
  
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
        password: `TempMigration_${Math.random().toString(36).slice(2)}`
      });
      
      if (!error) authCreated++;
    } catch (e) {
      // ignore
    }
  }
  
  console.log(`   Créés: ${authCreated} | Existants: ${authSkipped}\n`);
  
  // ===== ÉTAPE 5: VÉRIFICATION =====
  console.log('🔍 ÉTAPE 5: VÉRIFICATION FINALE');
  console.log('-'.repeat(40));
  
  console.log('   Table'.padEnd(22), 'PROD'.padEnd(10), 'COOLIFY'.padEnd(10), 'STATUS');
  console.log('   ' + '-'.repeat(50));
  
  let allGood = true;
  
  for (const table of TABLES) {
    const prodCount = backup[table].length;
    const { count: coolCount } = await coolify.from(table).select('*', { count: 'exact', head: true });
    
    const diff = prodCount - (coolCount || 0);
    let status = '✅';
    if (diff !== 0) {
      status = diff > 0 ? `⚠️ -${diff}` : `➕ +${Math.abs(diff)}`;
      if (diff > 0) allGood = false;
    }
    
    console.log(`   ${table.padEnd(20)} ${String(prodCount).padEnd(10)} ${String(coolCount || 0).padEnd(10)} ${status}`);
  }
  
  const { data: finalAuth } = await coolify.auth.admin.listUsers();
  console.log(`\n   Auth Users: ${finalAuth?.users?.length || 0} / ${backup.auth_users.length}`);
  
  // Résumé
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(allGood ? '🎉 MIGRATION TERMINÉE AVEC SUCCÈS!' : '⚠️ Quelques erreurs - voir ci-dessus');
  console.log(`⏱️ Durée totale: ${duration}s`);
  console.log('='.repeat(60));
}

main().catch(console.error);
