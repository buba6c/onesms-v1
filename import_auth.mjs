#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const prod = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const coolify = createClient(
  'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io', 
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y'
);

async function main() {
  console.log('🔐 Import Auth Users...');
  
  const { data: authData } = await prod.auth.admin.listUsers();
  const authUsers = authData?.users || [];
  console.log('Production:', authUsers.length, 'users');
  
  const { data: existing } = await coolify.auth.admin.listUsers();
  const existingEmails = new Set(existing?.users?.map(u => u.email) || []);
  console.log('Coolify:', existingEmails.size, 'existants');
  
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
  
  console.log('✅ Créés:', created);
  
  const { data: final } = await coolify.auth.admin.listUsers();
  console.log('Total Coolify:', final?.users?.length || 0);
}

main().catch(console.error);
