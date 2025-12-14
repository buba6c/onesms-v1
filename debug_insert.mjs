#!/usr/bin/env node
/**
 * Debug: Voir pourquoi l'insert échoue
 */

import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const COOLIFY_URL = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const COOLIFY_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y';

const prod = createClient(PROD_URL, PROD_KEY);
const coolify = createClient(COOLIFY_URL, COOLIFY_KEY);

async function main() {
  // Test avec un user
  console.log('🔍 Test insert users...');
  const { data: users, error: fetchErr } = await prod.from('users').select('*').limit(1);
  
  if (fetchErr) {
    console.log('Erreur fetch:', fetchErr);
    return;
  }
  
  console.log('User à insérer:', JSON.stringify(users[0], null, 2));
  
  const { error } = await coolify.from('users').upsert(users[0], { 
    onConflict: 'id' 
  });
  
  if (error) {
    console.log('\n❌ Erreur insert:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('\n✅ Insert réussi!');
  }
  
  // Test payment_providers
  console.log('\n🔍 Test insert payment_providers...');
  const { data: pp } = await prod.from('payment_providers').select('*').limit(1);
  console.log('Payment provider:', JSON.stringify(pp[0], null, 2));
  
  const { error: ppErr } = await coolify.from('payment_providers').upsert(pp[0], { 
    onConflict: 'id' 
  });
  
  if (ppErr) {
    console.log('\n❌ Erreur:', ppErr.message);
  } else {
    console.log('\n✅ Insert réussi!');
  }
}

main().catch(console.error);
