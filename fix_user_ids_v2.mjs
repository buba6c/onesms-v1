#!/usr/bin/env node
/**
 * 🔧 FIX USER IDs - Synchroniser auth.users avec public.users
 * Version corrigée avec pagination
 */

const COOLIFY_URL = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const COOLIFY_SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y';

async function fetchWithAuth(endpoint, options = {}) {
  const url = `${COOLIFY_URL}${endpoint}`;
  const headers = {
    'apikey': COOLIFY_SERVICE_KEY,
    'Authorization': `Bearer ${COOLIFY_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  return response;
}

async function main() {
  console.log('🔧 Fix User IDs - Coolify (avec pagination)\n');
  
  // 1. Récupérer TOUS les auth.users avec pagination
  console.log('📥 Fetching ALL auth.users...');
  let allAuthUsers = [];
  let page = 1;
  
  while (true) {
    const response = await fetchWithAuth(`/auth/v1/admin/users?per_page=1000&page=${page}`);
    if (!response.ok) break;
    
    const data = await response.json();
    const users = data.users || data;
    
    if (!users || users.length === 0) break;
    allAuthUsers.push(...users);
    
    console.log(`   Page ${page}: ${users.length} users (total: ${allAuthUsers.length})`);
    
    if (users.length < 1000) break;
    page++;
  }
  console.log(`   ✅ Total: ${allAuthUsers.length} auth users`);
  
  // 2. Récupérer tous les public.users
  console.log('\n📥 Fetching public.users...');
  const publicResponse = await fetchWithAuth('/rest/v1/users?select=id,email');
  if (!publicResponse.ok) {
    console.error('❌ Failed to fetch public.users');
    return;
  }
  const publicUsers = await publicResponse.json();
  console.log(`   ✅ ${publicUsers.length} public users`);
  
  // 3. Créer mapping email -> auth.id
  const emailToAuthId = new Map();
  for (const authUser of allAuthUsers) {
    if (authUser.email) {
      emailToAuthId.set(authUser.email.toLowerCase(), authUser.id);
    }
  }
  
  // 4. Trouver les mismatches
  console.log('\n🔍 Analyzing...');
  const mismatches = [];
  const matched = [];
  const missing = [];
  
  for (const publicUser of publicUsers) {
    const email = publicUser.email?.toLowerCase();
    if (!email) continue;
    
    const authId = emailToAuthId.get(email);
    if (!authId) {
      missing.push({ email: publicUser.email, publicId: publicUser.id });
    } else if (authId !== publicUser.id) {
      mismatches.push({
        email: publicUser.email,
        oldId: publicUser.id,
        newId: authId
      });
    } else {
      matched.push(publicUser);
    }
  }
  
  console.log(`   ✅ Matched: ${matched.length}`);
  console.log(`   ⚠️ Mismatched IDs: ${mismatches.length}`);
  console.log(`   ❌ No auth account: ${missing.length}`);
  
  if (mismatches.length === 0) {
    console.log('\n✅ All user IDs are synchronized!');
    return;
  }
  
  // 5. Corriger les IDs
  console.log(`\n🔧 Fixing ${mismatches.length} user IDs...`);
  
  let fixed = 0;
  let errors = 0;
  
  for (const m of mismatches) {
    try {
      // Récupérer les données complètes
      const userDataRes = await fetchWithAuth(`/rest/v1/users?select=*&id=eq.${m.oldId}`);
      const userData = await userDataRes.json();
      
      if (!userData || userData.length === 0) {
        errors++;
        continue;
      }
      
      const user = userData[0];
      const newUserData = { ...user, id: m.newId };
      
      // Supprimer l'ancien
      const deleteRes = await fetchWithAuth(`/rest/v1/users?id=eq.${m.oldId}`, {
        method: 'DELETE'
      });
      
      if (!deleteRes.ok) {
        errors++;
        continue;
      }
      
      // Insérer avec le nouveau ID
      const insertRes = await fetchWithAuth('/rest/v1/users', {
        method: 'POST',
        body: JSON.stringify(newUserData)
      });
      
      if (!insertRes.ok) {
        errors++;
        continue;
      }
      
      // Mettre à jour les tables liées
      await fixRelatedTables(m.oldId, m.newId);
      
      fixed++;
      if (fixed % 100 === 0) {
        console.log(`   ✅ ${fixed}/${mismatches.length} fixed...`);
      }
    } catch (err) {
      errors++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  // Vérification finale
  console.log('\n🔍 Verification...');
  const verifyResponse = await fetchWithAuth('/rest/v1/users?select=id,email');
  const verifyUsers = await verifyResponse.json();
  
  let verifyMatched = 0;
  for (const pu of verifyUsers) {
    const authId = emailToAuthId.get(pu.email?.toLowerCase());
    if (authId === pu.id) verifyMatched++;
  }
  
  console.log(`   ${verifyMatched}/${verifyUsers.length} users now synchronized`);
}

async function fixRelatedTables(oldId, newId) {
  const tables = [
    { name: 'activations', column: 'user_id' },
    { name: 'rentals', column: 'user_id' },
    { name: 'transactions', column: 'user_id' },
    { name: 'balance_operations', column: 'user_id' },
    { name: 'notifications', column: 'user_id' },
    { name: 'favorite_services', column: 'user_id' },
    { name: 'activity_logs', column: 'user_id' },
    { name: 'promo_code_uses', column: 'user_id' },
    { name: 'wave_payment_proofs', column: 'user_id' },
    { name: 'email_logs', column: 'user_id' },
    { name: 'referral_earnings', column: 'user_id' },
    { name: 'logs_provider', column: 'user_id' },
  ];
  
  for (const table of tables) {
    try {
      await fetchWithAuth(
        `/rest/v1/${table.name}?${table.column}=eq.${oldId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ [table.column]: newId }),
          headers: { 'Prefer': 'return=minimal' }
        }
      );
    } catch (e) {}
  }
  
  // Referrals a deux colonnes
  try {
    await fetchWithAuth(
      `/rest/v1/referrals?referrer_id=eq.${oldId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ referrer_id: newId }),
        headers: { 'Prefer': 'return=minimal' }
      }
    );
    await fetchWithAuth(
      `/rest/v1/referrals?referred_id=eq.${oldId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ referred_id: newId }),
        headers: { 'Prefer': 'return=minimal' }
      }
    );
  } catch (e) {}
  
  // users.referred_by
  try {
    await fetchWithAuth(
      `/rest/v1/users?referred_by=eq.${oldId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ referred_by: newId }),
        headers: { 'Prefer': 'return=minimal' }
      }
    );
  } catch (e) {}
}

main().catch(console.error);
