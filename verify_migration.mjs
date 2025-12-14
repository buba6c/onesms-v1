#!/usr/bin/env node
/**
 * 📊 VÉRIFICATION FINALE - Comparer Prod vs Coolify
 */

import { createClient } from '@supabase/supabase-js';

const prod = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const coolify = createClient(
  'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io', 
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y'
);

const TABLES = [
  'countries', 'services', 'payment_providers', 'promo_codes',
  'activation_packages', 'users', 'activations', 'rentals',
  'transactions', 'balance_operations', 'referrals', 'logs_provider',
  'contact_messages', 'email_campaigns'
];

async function count(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count || 0;
}

async function main() {
  console.log('📊 COMPARAISON PROD vs COOLIFY');
  console.log('='.repeat(50));
  console.log();
  console.log('Table'.padEnd(25) + 'PROD'.padEnd(10) + 'COOLIFY'.padEnd(10) + 'STATUS');
  console.log('-'.repeat(50));
  
  let allGood = true;
  
  for (const table of TABLES) {
    const prodCount = await count(prod, table);
    const coolCount = await count(coolify, table);
    
    const match = prodCount === coolCount;
    if (!match) allGood = false;
    
    console.log(
      table.padEnd(25) + 
      String(prodCount).padEnd(10) + 
      String(coolCount).padEnd(10) + 
      (match ? '✅' : '⚠️')
    );
  }
  
  // Auth users
  const { data: prodAuth } = await prod.auth.admin.listUsers();
  const { data: coolAuth } = await coolify.auth.admin.listUsers();
  
  const prodAuthCount = prodAuth?.users?.length || 0;
  const coolAuthCount = coolAuth?.users?.length || 0;
  
  console.log('-'.repeat(50));
  console.log(
    'auth.users'.padEnd(25) + 
    String(prodAuthCount).padEnd(10) + 
    String(coolAuthCount).padEnd(10) + 
    (prodAuthCount === coolAuthCount ? '✅' : '⚠️')
  );
  
  console.log('\n' + '='.repeat(50));
  if (allGood && prodAuthCount === coolAuthCount) {
    console.log('🎉 MIGRATION COMPLÈTE ET VÉRIFIÉE!');
  } else {
    console.log('⚠️ Quelques différences (peut être dû à des données en cours)');
  }
}

main().catch(console.error);
