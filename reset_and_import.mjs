#!/usr/bin/env node
/**
 * 🔥 RESET COMPLET + IMPORT
 * 1. Drop toutes les tables
 * 2. Recréer depuis le dump
 * 3. Importer les données
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const COOLIFY_URL = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y';

const PROD_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const coolify = createClient(COOLIFY_URL, SERVICE_KEY);
const prod = createClient(PROD_URL, PROD_KEY);

async function execSQL(query) {
  const res = await fetch(`${COOLIFY_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

async function main() {
  console.log('🔥 RESET COMPLET COOLIFY');
  console.log('='.repeat(60));
  
  // ÉTAPE 1: DROP toutes les tables
  console.log('\n1️⃣ DROP TOUTES LES TABLES...');
  
  const tables = await execSQL(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  
  for (const t of tables) {
    try {
      await execSQL(`DROP TABLE IF EXISTS public."${t.table_name}" CASCADE`);
      console.log(`   ✅ ${t.table_name}`);
    } catch (e) {
      console.log(`   ⚠️ ${t.table_name}`);
    }
  }
  
  // Drop views
  const views = await execSQL(`
    SELECT table_name FROM information_schema.views 
    WHERE table_schema = 'public'
  `);
  
  for (const v of views) {
    try {
      await execSQL(`DROP VIEW IF EXISTS public."${v.table_name}" CASCADE`);
    } catch (e) {}
  }
  
  // Drop functions
  console.log('\n   Suppression des fonctions...');
  try {
    const funcs = await execSQL(`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    `);
    for (const f of funcs) {
      try {
        await execSQL(`DROP FUNCTION IF EXISTS public."${f.routine_name}" CASCADE`);
      } catch (e) {}
    }
  } catch (e) {}
  
  console.log('   ✅ Nettoyage terminé');
  
  // ÉTAPE 2: Appliquer le dump
  console.log('\n2️⃣ APPLICATION DU SCHÉMA...');
  
  const dumpPath = '/Users/mac/Desktop/ONE SMS V1/dump_production.sql';
  const sql = fs.readFileSync(dumpPath, 'utf-8');
  
  // Parser le SQL en statements individuels
  // On va extraire les CREATE TABLE et les exécuter
  const createTableRegex = /CREATE TABLE IF NOT EXISTS[^;]+;/gs;
  const createTables = sql.match(createTableRegex) || [];
  
  console.log(`   ${createTables.length} tables à créer...`);
  
  for (const stmt of createTables) {
    const tableName = stmt.match(/"public"\."(\w+)"/)?.[1] || 'unknown';
    try {
      // Remplacer extensions.uuid_generate_v4 par gen_random_uuid
      const cleanStmt = stmt.replace(/extensions\."uuid_generate_v4"\(\)/g, 'gen_random_uuid()');
      await execSQL(cleanStmt);
      console.log(`   ✅ ${tableName}`);
    } catch (e) {
      console.log(`   ❌ ${tableName}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // ÉTAPE 3: Vérifier
  console.log('\n3️⃣ VÉRIFICATION...');
  const newTables = await execSQL(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  console.log(`   ${newTables.length} tables créées`);
  
  // ÉTAPE 4: Import des données
  console.log('\n4️⃣ IMPORT DES DONNÉES...');
  
  const IMPORT_ORDER = [
    'countries', 'services', 'payment_providers', 'promo_codes', 
    'activation_packages', 'contact_settings', 'system_settings',
    'service_icons', 'popular_services', 'users', 'activations',
    'rentals', 'transactions', 'balance_operations', 'referrals',
    'email_campaigns', 'wave_payment_proofs', 'rental_messages',
    'rental_logs', 'logs_provider', 'contact_messages', 'webhook_logs'
  ];
  
  for (const table of IMPORT_ORDER) {
    process.stdout.write(`   ${table.padEnd(25)}`);
    
    try {
      // Fetch from prod
      const { data, error } = await prod.from(table).select('*');
      if (error || !data) {
        console.log('skip');
        continue;
      }
      
      if (data.length === 0) {
        console.log('vide');
        continue;
      }
      
      // Insert to coolify
      const { error: insertErr } = await coolify.from(table).insert(data);
      
      if (insertErr) {
        console.log(`❌ ${insertErr.message.slice(0, 40)}`);
      } else {
        console.log(`✅ ${data.length}`);
      }
    } catch (e) {
      console.log(`❌ ${e.message.slice(0, 40)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 TERMINÉ!');
}

main().catch(console.error);
