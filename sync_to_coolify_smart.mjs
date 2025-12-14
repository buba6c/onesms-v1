#!/usr/bin/env node
/**
 * 🔄 SYNCHRONISATION INTELLIGENTE PRODUCTION → COOLIFY
 * 
 * Ce script synchronise toutes les données de Supabase Production vers Coolify
 * de manière intelligente (sans doublons, dans le bon ordre)
 */

import { createClient } from '@supabase/supabase-js';

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

// Tables dans l'ordre des dépendances (les parents d'abord)
const TABLES_ORDER = [
  // Tables indépendantes (pas de FK)
  'countries',
  'services', 
  'operators',
  'settings',
  'pricing_rules',
  'promo_codes',
  'referral_settings',
  'payment_providers',
  'packages',
  'email_campaigns',
  
  // Tables dépendantes de users
  'users',
  
  // Tables dépendantes de users + services
  'activations',
  'rentals',
  'transactions',
  'referral_earnings',
  'sms_messages',
  'wave_payments',
  'contact_messages',
  'logs_provider',
  'sync_history'
];

// Stats globales
const stats = {
  synced: 0,
  skipped: 0,
  errors: 0,
  tables: {}
};

/**
 * Récupérer tous les IDs existants sur Coolify pour une table
 */
async function getExistingIds(table, idField = 'id') {
  const { data, error } = await coolify.from(table).select(idField);
  if (error) return new Set();
  return new Set(data.map(row => row[idField]));
}

/**
 * Récupérer toutes les données d'une table en production
 */
async function getProductionData(table) {
  const allData = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await prod
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error(`   ❌ Erreur lecture ${table}:`, error.message);
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
 * Synchroniser une table
 */
async function syncTable(table) {
  console.log(`\n📦 Synchronisation: ${table}`);
  
  // Récupérer les données de production
  const prodData = await getProductionData(table);
  console.log(`   📥 Production: ${prodData.length} enregistrements`);
  
  if (prodData.length === 0) {
    console.log(`   ⏭️ Aucune donnée à synchroniser`);
    stats.tables[table] = { synced: 0, skipped: 0, total: 0 };
    return;
  }
  
  // Récupérer les IDs existants sur Coolify
  const existingIds = await getExistingIds(table);
  console.log(`   📊 Coolify existants: ${existingIds.size}`);
  
  // Filtrer les nouvelles données
  const newData = prodData.filter(row => !existingIds.has(row.id));
  console.log(`   🆕 Nouveaux à insérer: ${newData.length}`);
  
  if (newData.length === 0) {
    console.log(`   ✅ Déjà synchronisé`);
    stats.tables[table] = { synced: 0, skipped: prodData.length, total: prodData.length };
    stats.skipped += prodData.length;
    return;
  }
  
  // Insérer par lots de 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < newData.length; i += batchSize) {
    const batch = newData.slice(i, i + batchSize);
    
    const { error } = await coolify.from(table).upsert(batch, { 
      onConflict: 'id',
      ignoreDuplicates: true 
    });
    
    if (error) {
      console.error(`   ❌ Erreur lot ${i}-${i + batch.length}:`, error.message);
      errors += batch.length;
      
      // Essayer un par un si le lot échoue
      for (const row of batch) {
        const { error: singleError } = await coolify.from(table).upsert(row, { 
          onConflict: 'id',
          ignoreDuplicates: true 
        });
        if (!singleError) {
          inserted++;
          errors--;
        }
      }
    } else {
      inserted += batch.length;
    }
    
    // Afficher la progression
    if (newData.length > 100) {
      process.stdout.write(`\r   ⏳ Progression: ${Math.min(i + batchSize, newData.length)}/${newData.length}`);
    }
  }
  
  if (newData.length > 100) console.log('');
  
  console.log(`   ✅ Insérés: ${inserted} | ❌ Erreurs: ${errors}`);
  
  stats.tables[table] = { synced: inserted, skipped: prodData.length - newData.length, total: prodData.length, errors };
  stats.synced += inserted;
  stats.errors += errors;
}

/**
 * Synchroniser les auth.users (table spéciale)
 */
async function syncAuthUsers() {
  console.log(`\n🔐 Synchronisation: auth.users`);
  
  // Récupérer tous les users de production
  const { data: prodUsers, error: prodError } = await prod.auth.admin.listUsers();
  if (prodError) {
    console.error('   ❌ Erreur lecture auth.users prod:', prodError.message);
    return;
  }
  
  // Récupérer tous les users de Coolify
  const { data: coolifyUsers, error: coolError } = await coolify.auth.admin.listUsers();
  if (coolError) {
    console.error('   ❌ Erreur lecture auth.users Coolify:', coolError.message);
    return;
  }
  
  const prodEmails = new Set(prodUsers.users.map(u => u.email));
  const coolifyEmails = new Set(coolifyUsers.users.map(u => u.email));
  
  console.log(`   📥 Production: ${prodUsers.users.length} utilisateurs`);
  console.log(`   📊 Coolify: ${coolifyUsers.users.length} utilisateurs`);
  
  // Trouver les users manquants
  const missingUsers = prodUsers.users.filter(u => !coolifyEmails.has(u.email));
  console.log(`   🆕 Manquants: ${missingUsers.length}`);
  
  if (missingUsers.length === 0) {
    console.log(`   ✅ Tous les auth.users sont synchronisés`);
    return;
  }
  
  // Créer les users manquants
  let created = 0;
  for (const user of missingUsers) {
    try {
      // Créer avec un mot de passe temporaire (l'utilisateur devra reset)
      const { error } = await coolify.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: user.user_metadata || {},
        app_metadata: user.app_metadata || {},
        password: `TempPass_${Date.now()}_${Math.random().toString(36).slice(2)}`
      });
      
      if (error) {
        if (!error.message.includes('already been registered')) {
          console.error(`   ⚠️ ${user.email}:`, error.message);
        }
      } else {
        created++;
      }
    } catch (e) {
      console.error(`   ❌ ${user.email}:`, e.message);
    }
  }
  
  console.log(`   ✅ Auth users créés: ${created}`);
}

/**
 * Mettre à jour les données existantes (pour sync les modifications)
 */
async function updateExistingData(table) {
  console.log(`\n🔄 Mise à jour: ${table}`);
  
  const prodData = await getProductionData(table);
  const existingIds = await getExistingIds(table);
  
  // Ne mettre à jour que les données existantes
  const toUpdate = prodData.filter(row => existingIds.has(row.id));
  
  if (toUpdate.length === 0) {
    console.log(`   ⏭️ Rien à mettre à jour`);
    return;
  }
  
  console.log(`   📝 ${toUpdate.length} enregistrements à mettre à jour`);
  
  // Mettre à jour par lots
  const batchSize = 100;
  let updated = 0;
  
  for (let i = 0; i < toUpdate.length; i += batchSize) {
    const batch = toUpdate.slice(i, i + batchSize);
    
    const { error } = await coolify.from(table).upsert(batch, { 
      onConflict: 'id' 
    });
    
    if (error) {
      console.error(`   ❌ Erreur mise à jour:`, error.message);
    } else {
      updated += batch.length;
    }
  }
  
  console.log(`   ✅ Mis à jour: ${updated}`);
}

/**
 * Vérification finale
 */
async function verifySync() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 VÉRIFICATION FINALE\n');
  
  const tables = ['users', 'services', 'activations', 'transactions', 'rentals', 'countries', 'payment_providers'];
  
  console.log('Table'.padEnd(20), 'PROD'.padEnd(10), 'COOLIFY'.padEnd(10), 'STATUS');
  console.log('-'.repeat(55));
  
  let allGood = true;
  
  for (const table of tables) {
    const { count: prodCount } = await prod.from(table).select('*', { count: 'exact', head: true });
    const { count: coolCount } = await coolify.from(table).select('*', { count: 'exact', head: true });
    
    const status = prodCount === coolCount ? '✅' : '⚠️ -' + (prodCount - coolCount);
    if (prodCount !== coolCount) allGood = false;
    
    console.log(table.padEnd(20), String(prodCount || 0).padEnd(10), String(coolCount || 0).padEnd(10), status);
  }
  
  // Auth users
  const { data: prodAuth } = await prod.auth.admin.listUsers();
  const { data: coolAuth } = await coolify.auth.admin.listUsers();
  
  console.log('\n🔐 Auth Users:');
  console.log(`   Production: ${prodAuth?.users?.length || 0}`);
  console.log(`   Coolify: ${coolAuth?.users?.length || 0}`);
  
  return allGood;
}

/**
 * Main
 */
async function main() {
  console.log('🚀 SYNCHRONISATION INTELLIGENTE PRODUCTION → COOLIFY');
  console.log('='.repeat(60));
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔗 Production: ${PROD.url}`);
  console.log(`🔗 Coolify: ${COOLIFY.url}`);
  
  const startTime = Date.now();
  
  // 1. Synchroniser auth.users d'abord
  await syncAuthUsers();
  
  // 2. Synchroniser toutes les tables dans l'ordre
  for (const table of TABLES_ORDER) {
    try {
      await syncTable(table);
    } catch (e) {
      console.error(`   ❌ Erreur ${table}:`, e.message);
    }
  }
  
  // 3. Mettre à jour les tables importantes (pour syncer les modifications)
  const tablesToUpdate = ['users', 'activations', 'services'];
  for (const table of tablesToUpdate) {
    try {
      await updateExistingData(table);
    } catch (e) {
      console.error(`   ❌ Erreur update ${table}:`, e.message);
    }
  }
  
  // 4. Vérification finale
  const allGood = await verifySync();
  
  // 5. Résumé
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`   ✅ Synchronisés: ${stats.synced}`);
  console.log(`   ⏭️ Déjà présents: ${stats.skipped}`);
  console.log(`   ❌ Erreurs: ${stats.errors}`);
  console.log(`   ⏱️ Durée: ${duration}s`);
  console.log(`   ${allGood ? '🎉 SYNCHRONISATION COMPLÈTE!' : '⚠️ Vérifier les différences'}`);
}

main().catch(console.error);
