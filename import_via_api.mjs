#!/usr/bin/env node
/**
 * 🚀 IMPORT COMPLET VIA API pg/query
 * Utilise le backup JSON existant et l'importe via l'API
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

async function fetchAll(client, table) {
  const allData = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await client.from(table).select('*').range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    allData.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  
  return allData;
}

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function importTable(table, data) {
  if (!data || data.length === 0) return { inserted: 0, errors: 0 };
  
  // Récupérer les colonnes
  const columns = Object.keys(data[0]);
  
  let inserted = 0;
  let errors = 0;
  
  // Insérer par batch de 20
  for (let i = 0; i < data.length; i += 20) {
    const batch = data.slice(i, i + 20);
    
    const values = batch.map(row => {
      const vals = columns.map(col => escapeValue(row[col]));
      return `(${vals.join(', ')})`;
    }).join(',\n');
    
    const sql = `INSERT INTO public.${table} (${columns.join(', ')}) VALUES ${values} ON CONFLICT DO NOTHING`;
    
    try {
      await execSQL(sql);
      inserted += batch.length;
    } catch (e) {
      // Essayer un par un
      for (const row of batch) {
        const vals = columns.map(col => escapeValue(row[col]));
        const singleSql = `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`;
        try {
          await execSQL(singleSql);
          inserted++;
        } catch (e2) {
          errors++;
        }
      }
    }
    
    if (data.length > 100 && i % 100 === 0) {
      process.stdout.write(`\r      ${i}/${data.length}`);
    }
  }
  
  return { inserted, errors };
}

// Ordre d'import (respecter les FK)
const TABLES = [
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
  'contact_messages',
  'logs_provider'
];

async function main() {
  console.log('🚀 IMPORT VERS COOLIFY VIA pg/query');
  console.log('='.repeat(60));
  
  // D'abord vider les tables existantes (dans l'ordre inverse)
  console.log('\n🗑️ Nettoyage des tables existantes...');
  for (const table of [...TABLES].reverse()) {
    try {
      await execSQL(`TRUNCATE TABLE public.${table} CASCADE`);
      console.log(`   ✅ ${table}`);
    } catch (e) {
      console.log(`   ⚠️ ${table}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Récupérer et importer
  console.log('\n📦 IMPORT DES DONNÉES...');
  console.log('-'.repeat(50));
  
  let totalImported = 0;
  
  for (const table of TABLES) {
    process.stdout.write(`   ${table.padEnd(20)} ... `);
    
    // Récupérer de prod
    const data = await fetchAll(prod, table);
    
    if (data.length === 0) {
      console.log('vide');
      continue;
    }
    
    // Importer sur Coolify
    const { inserted, errors } = await importTable(table, data);
    totalImported += inserted;
    
    console.log(`\r   ${table.padEnd(20)} ... ✅ ${inserted}/${data.length} ${errors > 0 ? `(❌ ${errors})` : ''}`);
  }
  
  // Auth users
  console.log('\n🔐 AUTH USERS...');
  const { data: authData } = await prod.auth.admin.listUsers();
  const authUsers = authData?.users || [];
  
  let authCreated = 0;
  for (const user of authUsers) {
    const { error } = await coolify.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: user.user_metadata || {},
      password: `Temp_${Math.random().toString(36).slice(2, 10)}`
    });
    if (!error) authCreated++;
  }
  console.log(`   ✅ ${authCreated}/${authUsers.length} users créés`);
  
  // Vérification finale
  console.log('\n📊 VÉRIFICATION...');
  console.log('-'.repeat(50));
  
  for (const table of TABLES) {
    const prodData = await fetchAll(prod, table);
    const result = await execSQL(`SELECT COUNT(*) as count FROM public.${table}`);
    const coolCount = result[0]?.count || 0;
    
    const ok = prodData.length === parseInt(coolCount);
    console.log(`   ${table.padEnd(20)} PROD: ${String(prodData.length).padEnd(6)} COOL: ${String(coolCount).padEnd(6)} ${ok ? '✅' : '⚠️'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`🎉 IMPORT TERMINÉ! ${totalImported} records importés`);
}

main().catch(console.error);
