#!/usr/bin/env node
/**
 * 🚀 IMPORT DONNÉES VIA API - Production → Coolify
 * Transfère les données table par table via les APIs REST
 */

import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const COOLIFY_URL = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const COOLIFY_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y';

const prod = createClient(PROD_URL, PROD_KEY);
const coolify = createClient(COOLIFY_URL, COOLIFY_KEY);

// Tables dans l'ordre (respecter les FK)
const TABLES = [
  // Sans dépendances
  'countries',
  'services',
  'payment_providers',
  'promo_codes',
  'activation_packages',
  'contact_settings',
  'system_settings',
  'service_icons',
  'popular_services',
  // Users (base pour les autres)
  'users',
  // Dépendent de users
  'activations',
  'rentals',
  'transactions',
  'balance_operations',
  'notifications',
  'favorite_services',
  'referrals',
  'activity_logs',
  'promo_code_uses',
  'email_campaigns',
  'email_logs',
  'wave_payment_proofs',
  // Dépendent d'activations/rentals
  'sms_messages',
  'rental_messages',
  'rental_logs',
  // Logs
  'logs_provider',
  'payment_provider_logs',
  'contact_messages',
  'webhook_logs',
  'system_logs',
  'pricing_rules_archive',
  'virtual_numbers'
];

async function fetchAll(client, table) {
  const allData = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await client.from(table).select('*').range(offset, offset + 999);
    if (error) {
      if (error.message.includes('does not exist')) return null;
      break;
    }
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  
  return allData;
}

async function insertBatch(table, data, batchSize = 100) {
  let inserted = 0;
  let errors = 0;
  
  // Parallel batches (5 at a time)
  const chunks = [];
  for (let i = 0; i < data.length; i += batchSize) {
    chunks.push(data.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < chunks.length; i += 5) {
    const parallelBatches = chunks.slice(i, i + 5);
    
    const results = await Promise.all(
      parallelBatches.map(batch => 
        coolify.from(table).upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: true 
        })
      )
    );
    
    for (let j = 0; j < results.length; j++) {
      if (results[j].error) {
        errors += parallelBatches[j].length;
      } else {
        inserted += parallelBatches[j].length;
      }
    }
  }
  
  return { inserted, errors };
}

async function main() {
  console.log('🚀 IMPORT DONNÉES: PRODUCTION → COOLIFY');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  let totalProd = 0;
  let totalCool = 0;
  let totalErrors = 0;
  
  console.log('Table'.padEnd(25) + 'PROD'.padEnd(8) + 'COOL'.padEnd(8) + 'ERR'.padEnd(6) + 'STATUS');
  console.log('-'.repeat(60));
  
  for (const table of TABLES) {
    process.stdout.write(`${table.padEnd(25)}`);
    
    // Récupérer de prod
    const data = await fetchAll(prod, table);
    
    if (data === null) {
      console.log('N/A'.padEnd(8) + '-'.padEnd(8) + '-'.padEnd(6) + '⏭️ skip');
      continue;
    }
    
    if (data.length === 0) {
      console.log('0'.padEnd(8) + '0'.padEnd(8) + '0'.padEnd(6) + '✅ vide');
      continue;
    }
    
    process.stdout.write(`${String(data.length).padEnd(8)}`);
    totalProd += data.length;
    
    // Insérer sur Coolify
    const { inserted, errors } = await insertBatch(table, data);
    totalCool += inserted;
    totalErrors += errors;
    
    const status = errors === 0 ? '✅' : (inserted > 0 ? '⚠️' : '❌');
    console.log(`\r${table.padEnd(25)}${String(data.length).padEnd(8)}${String(inserted).padEnd(8)}${String(errors).padEnd(6)}${status}`);
  }
  
  console.log('-'.repeat(60));
  console.log(`${'TOTAL'.padEnd(25)}${String(totalProd).padEnd(8)}${String(totalCool).padEnd(8)}${String(totalErrors).padEnd(6)}`);
  
  // Auth users
  console.log('\n🔐 AUTH USERS...');
  const { data: authData } = await prod.auth.admin.listUsers();
  const authUsers = authData?.users || [];
  
  const { data: existingAuth } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(existingAuth?.users?.map(u => u.email) || []);
  
  let created = 0;
  for (const user of authUsers) {
    if (existingEmails.has(user.email)) continue;
    
    const { error } = await coolify.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: user.user_metadata || {}
    });
    if (!error) created++;
  }
  console.log(`   ${created} nouveaux / ${authUsers.length} total`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 IMPORT TERMINÉ!');
  console.log(`   📊 ${totalCool}/${totalProd} records importés`);
  if (totalErrors > 0) console.log(`   ⚠️ ${totalErrors} erreurs`);
}

main().catch(console.error);
