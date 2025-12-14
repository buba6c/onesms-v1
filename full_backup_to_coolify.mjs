#!/usr/bin/env node
/**
 * 🔄 BACKUP COMPLET SUPABASE CLOUD → COOLIFY
 * 
 * Ce script fait un backup complet et importe tout sur Coolify
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;

// Configuration Production (Supabase Cloud)
const PROD = {
  url: 'https://htfqmamvmhdoixqcbbbw.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
};

// Configuration Coolify
const COOLIFY = {
  url: 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io',
  key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg',
  dbUrl: 'postgresql://postgres:E7UoY5167bMG3xlw7b0pDKfxIdkm1NE1@46.202.171.108:5432/postgres'
};

const prod = createClient(PROD.url, PROD.key);
const coolify = createClient(COOLIFY.url, COOLIFY.key);

// Pool PostgreSQL pour Coolify (pour les opérations directes)
const coolifyPool = new Pool({
  connectionString: COOLIFY.dbUrl,
  ssl: false
});

// Toutes les tables à synchroniser
const ALL_TABLES = [
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
  'wave_payments',
  'contact_messages',
  'logs_provider',
  'sync_history',
  'referral_earnings'
];

const backupData = {};

/**
 * Récupérer toutes les données d'une table
 */
async function fetchAllData(table) {
  const allData = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await prod
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.log(`   ⚠️ Table ${table}: ${error.message}`);
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
 * ÉTAPE 1: Backup complet de production
 */
async function backupProduction() {
  console.log('\n📦 ÉTAPE 1: BACKUP DE SUPABASE CLOUD');
  console.log('='.repeat(50));
  
  let totalRecords = 0;
  
  for (const table of ALL_TABLES) {
    process.stdout.write(`   📥 ${table}... `);
    const data = await fetchAllData(table);
    backupData[table] = data;
    console.log(`${data.length} enregistrements`);
    totalRecords += data.length;
  }
  
  // Auth users
  console.log(`   📥 auth.users... `);
  const { data: authData } = await prod.auth.admin.listUsers();
  backupData['auth_users'] = authData?.users || [];
  console.log(`${backupData['auth_users'].length} utilisateurs`);
  
  console.log(`\n   ✅ Total: ${totalRecords} enregistrements + ${backupData['auth_users'].length} auth users`);
  
  // Sauvegarder en JSON
  const backupFile = `backup_complete_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`   💾 Sauvegardé dans: ${backupFile}`);
  
  return backupData;
}

/**
 * ÉTAPE 2: Préparer Coolify (désactiver contraintes)
 */
async function prepareCoolify() {
  console.log('\n🔧 ÉTAPE 2: PRÉPARATION DE COOLIFY');
  console.log('='.repeat(50));
  
  const client = await coolifyPool.connect();
  
  try {
    // Désactiver les triggers et contraintes temporairement
    console.log('   🔓 Désactivation des contraintes FK...');
    
    await client.query('SET session_replication_role = replica;');
    
    // Vider les tables dans l'ordre inverse
    const tablesToClear = [...ALL_TABLES].reverse();
    
    for (const table of tablesToClear) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`   🗑️ ${table} vidée`);
      } catch (e) {
        console.log(`   ⚠️ ${table}: ${e.message}`);
      }
    }
    
    console.log('   ✅ Coolify prêt pour import');
    
  } finally {
    client.release();
  }
}

/**
 * ÉTAPE 3: Importer les données
 */
async function importToCoolify() {
  console.log('\n📤 ÉTAPE 3: IMPORT VERS COOLIFY');
  console.log('='.repeat(50));
  
  const client = await coolifyPool.connect();
  
  try {
    // S'assurer que les contraintes sont désactivées
    await client.query('SET session_replication_role = replica;');
    
    for (const table of ALL_TABLES) {
      const data = backupData[table];
      
      if (!data || data.length === 0) {
        console.log(`   ⏭️ ${table}: aucune donnée`);
        continue;
      }
      
      process.stdout.write(`   📤 ${table} (${data.length})... `);
      
      // Insérer par lots
      const batchSize = 100;
      let inserted = 0;
      let errors = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await coolify.from(table).upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
        
        if (error) {
          // Essayer un par un
          for (const row of batch) {
            const { error: singleError } = await coolify.from(table).upsert(row, {
              onConflict: 'id'
            });
            if (singleError) {
              errors++;
            } else {
              inserted++;
            }
          }
        } else {
          inserted += batch.length;
        }
      }
      
      console.log(`✅ ${inserted} | ❌ ${errors}`);
    }
    
    // Réactiver les contraintes
    await client.query('SET session_replication_role = DEFAULT;');
    
  } finally {
    client.release();
  }
}

/**
 * ÉTAPE 4: Synchroniser auth.users
 */
async function syncAuthUsers() {
  console.log('\n🔐 ÉTAPE 4: SYNC AUTH.USERS');
  console.log('='.repeat(50));
  
  const prodUsers = backupData['auth_users'];
  
  // Récupérer les users existants sur Coolify
  const { data: coolifyAuth } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(coolifyAuth?.users?.map(u => u.email) || []);
  
  console.log(`   📊 Production: ${prodUsers.length}`);
  console.log(`   📊 Coolify: ${existingEmails.size}`);
  
  let created = 0;
  let skipped = 0;
  
  for (const user of prodUsers) {
    if (existingEmails.has(user.email)) {
      skipped++;
      continue;
    }
    
    try {
      const { error } = await coolify.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: user.user_metadata || {},
        app_metadata: user.app_metadata || {},
        password: `Temp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      });
      
      if (!error) {
        created++;
      }
    } catch (e) {
      // Ignore
    }
  }
  
  console.log(`   ✅ Créés: ${created} | Existants: ${skipped}`);
}

/**
 * ÉTAPE 5: Vérification finale
 */
async function verifyImport() {
  console.log('\n🔍 ÉTAPE 5: VÉRIFICATION');
  console.log('='.repeat(50));
  
  console.log('\nTable'.padEnd(22), 'PROD'.padEnd(10), 'COOLIFY'.padEnd(10), 'STATUS');
  console.log('-'.repeat(55));
  
  let allGood = true;
  
  for (const table of ALL_TABLES) {
    const prodCount = backupData[table]?.length || 0;
    const { count: coolCount } = await coolify.from(table).select('*', { count: 'exact', head: true });
    
    const diff = prodCount - (coolCount || 0);
    let status = '✅';
    if (diff > 0) {
      status = `⚠️ -${diff}`;
      allGood = false;
    } else if (diff < 0) {
      status = `➕ +${Math.abs(diff)}`;
    }
    
    console.log(table.padEnd(22), String(prodCount).padEnd(10), String(coolCount || 0).padEnd(10), status);
  }
  
  // Auth users
  const { data: coolAuth } = await coolify.auth.admin.listUsers();
  console.log('\n🔐 Auth Users:');
  console.log(`   Production: ${backupData['auth_users'].length}`);
  console.log(`   Coolify: ${coolAuth?.users?.length || 0}`);
  
  return allGood;
}

/**
 * Main
 */
async function main() {
  console.log('🚀 BACKUP COMPLET & MIGRATION VERS COOLIFY');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Backup
    await backupProduction();
    
    // 2. Préparer Coolify
    await prepareCoolify();
    
    // 3. Import
    await importToCoolify();
    
    // 4. Auth users
    await syncAuthUsers();
    
    // 5. Vérifier
    const success = await verifyImport();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log(success ? '🎉 MIGRATION COMPLÈTE!' : '⚠️ Quelques différences à vérifier');
    console.log(`⏱️ Durée: ${duration}s`);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  } finally {
    await coolifyPool.end();
  }
}

main();
