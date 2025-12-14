#!/usr/bin/env node
/**
 * 📊 COMPARAISON COMPLÈTE: Supabase Cloud vs Coolify
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
  'activation_packages', 'contact_settings', 'system_settings',
  'service_icons', 'popular_services', 'users', 'activations',
  'rentals', 'transactions', 'balance_operations', 'referrals',
  'email_campaigns', 'wave_payment_proofs', 'rental_messages',
  'rental_logs', 'logs_provider', 'contact_messages', 'webhook_logs',
  'notifications', 'favorite_services', 'activity_logs', 'promo_code_uses',
  'email_logs', 'sms_messages', 'virtual_numbers', 'pricing_rules_archive'
];

async function count(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count || 0;
}

async function main() {
  console.log('📊 COMPARAISON: SUPABASE CLOUD vs COOLIFY');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toISOString()}\n`);
  
  console.log('Table'.padEnd(25) + 'CLOUD'.padEnd(10) + 'COOLIFY'.padEnd(10) + 'DIFF'.padEnd(8) + 'STATUS');
  console.log('-'.repeat(60));
  
  let totalCloud = 0;
  let totalCoolify = 0;
  let matches = 0;
  let mismatches = 0;
  
  for (const table of TABLES) {
    const cloudCount = await count(prod, table);
    const coolCount = await count(coolify, table);
    
    if (cloudCount === -1 && coolCount === -1) continue;
    
    const diff = coolCount - cloudCount;
    const match = cloudCount === coolCount;
    
    if (match) matches++;
    else mismatches++;
    
    totalCloud += Math.max(0, cloudCount);
    totalCoolify += Math.max(0, coolCount);
    
    const diffStr = diff === 0 ? '0' : (diff > 0 ? `+${diff}` : `${diff}`);
    const status = match ? '✅' : (coolCount > cloudCount ? '⚠️ +' : '❌ -');
    
    console.log(
      table.padEnd(25) + 
      String(cloudCount === -1 ? 'N/A' : cloudCount).padEnd(10) + 
      String(coolCount === -1 ? 'N/A' : coolCount).padEnd(10) + 
      diffStr.padEnd(8) +
      status
    );
  }
  
  console.log('-'.repeat(60));
  console.log(
    'TOTAL'.padEnd(25) + 
    String(totalCloud).padEnd(10) + 
    String(totalCoolify).padEnd(10) + 
    String(totalCoolify - totalCloud).padEnd(8)
  );
  
  // Auth users
  console.log('\n🔐 AUTH USERS:');
  const { data: prodAuth } = await prod.auth.admin.listUsers();
  const { data: coolAuth } = await coolify.auth.admin.listUsers();
  
  const prodAuthCount = prodAuth?.users?.length || 0;
  const coolAuthCount = coolAuth?.users?.length || 0;
  
  console.log(`   Cloud:   ${prodAuthCount}`);
  console.log(`   Coolify: ${coolAuthCount}`);
  console.log(`   Status:  ${prodAuthCount === coolAuthCount ? '✅ Identique' : '⚠️ Différent'}`);
  
  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('📈 RÉSUMÉ:');
  console.log(`   Tables identiques: ${matches}`);
  console.log(`   Tables différentes: ${mismatches}`);
  console.log(`   Records Cloud: ${totalCloud.toLocaleString()}`);
  console.log(`   Records Coolify: ${totalCoolify.toLocaleString()}`);
  
  const pct = totalCloud > 0 ? ((totalCoolify / totalCloud) * 100).toFixed(1) : 0;
  console.log(`   Synchronisation: ${pct}%`);
  
  if (pct >= 99) {
    console.log('\n🎉 MIGRATION COMPLÈTE!');
  } else if (pct >= 90) {
    console.log('\n⚠️ Migration quasi-complète, quelques records manquants');
  } else {
    console.log('\n❌ Migration incomplète');
  }
}

main().catch(console.error);
