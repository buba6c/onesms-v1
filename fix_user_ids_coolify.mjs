#!/usr/bin/env node
/**
 * 🔧 FIX USER IDs - Synchroniser auth.users avec public.users
 * 
 * Problème: Les auth.users sur Coolify ont de nouveaux IDs,
 * mais public.users garde les anciens IDs.
 * 
 * Solution: Pour chaque utilisateur, mettre à jour public.users.id
 * pour correspondre à auth.users.id basé sur l'email.
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
  console.log('🔧 Fix User IDs - Coolify Migration\n');
  
  // 1. Récupérer tous les auth.users
  console.log('📥 Fetching auth.users...');
  const authResponse = await fetchWithAuth('/auth/v1/admin/users');
  if (!authResponse.ok) {
    console.error('❌ Failed to fetch auth.users:', await authResponse.text());
    return;
  }
  const authData = await authResponse.json();
  const authUsers = authData.users || authData;
  console.log(`   Found ${authUsers.length} auth users`);
  
  // 2. Récupérer tous les public.users
  console.log('📥 Fetching public.users...');
  const publicResponse = await fetchWithAuth('/rest/v1/users?select=*');
  if (!publicResponse.ok) {
    console.error('❌ Failed to fetch public.users:', await publicResponse.text());
    return;
  }
  const publicUsers = await publicResponse.json();
  console.log(`   Found ${publicUsers.length} public users`);
  
  // 3. Créer un mapping email -> auth.id
  const emailToAuthId = new Map();
  for (const authUser of authUsers) {
    if (authUser.email) {
      emailToAuthId.set(authUser.email.toLowerCase(), authUser.id);
    }
  }
  
  // 4. Trouver les désynchronisations
  console.log('\n🔍 Analyzing mismatches...');
  const mismatches = [];
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
    }
  }
  
  console.log(`   ✅ Matched: ${publicUsers.length - mismatches.length - missing.length}`);
  console.log(`   ⚠️ Mismatched IDs: ${mismatches.length}`);
  console.log(`   ❌ No auth account: ${missing.length}`);
  
  if (mismatches.length === 0) {
    console.log('\n✅ All user IDs are synchronized!');
    return;
  }
  
  // 5. Afficher les problèmes
  console.log('\n📋 Mismatched Users:');
  for (const m of mismatches.slice(0, 10)) {
    console.log(`   ${m.email}`);
    console.log(`      Old ID: ${m.oldId}`);
    console.log(`      New ID: ${m.newId}`);
  }
  if (mismatches.length > 10) {
    console.log(`   ... and ${mismatches.length - 10} more`);
  }
  
  // 6. Corriger les IDs
  console.log('\n🔧 Fixing user IDs...');
  
  // Comme on ne peut pas changer les PKs directement, on va:
  // a) Supprimer les anciens enregistrements
  // b) Réinsérer avec les nouveaux IDs
  
  let fixed = 0;
  let errors = 0;
  
  for (const m of mismatches) {
    // Récupérer les données complètes de l'utilisateur
    const userDataRes = await fetchWithAuth(`/rest/v1/users?select=*&id=eq.${m.oldId}`);
    const userData = await userDataRes.json();
    
    if (!userData || userData.length === 0) {
      console.log(`   ⚠️ Could not find user data for ${m.email}`);
      errors++;
      continue;
    }
    
    const user = userData[0];
    
    // Préparer les nouvelles données avec le bon ID
    const newUserData = { ...user, id: m.newId };
    delete newUserData.created_at; // Laisser la DB générer si nécessaire
    
    // Supprimer l'ancien enregistrement
    const deleteRes = await fetchWithAuth(`/rest/v1/users?id=eq.${m.oldId}`, {
      method: 'DELETE'
    });
    
    if (!deleteRes.ok) {
      console.log(`   ❌ Failed to delete old user ${m.email}: ${await deleteRes.text()}`);
      errors++;
      continue;
    }
    
    // Insérer avec le nouveau ID
    const insertRes = await fetchWithAuth('/rest/v1/users', {
      method: 'POST',
      body: JSON.stringify(newUserData)
    });
    
    if (!insertRes.ok) {
      console.log(`   ❌ Failed to insert new user ${m.email}: ${await insertRes.text()}`);
      errors++;
      continue;
    }
    
    console.log(`   ✅ Fixed: ${m.email}`);
    fixed++;
    
    // Maintenant corriger les tables liées
    await fixRelatedTables(m.oldId, m.newId);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
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
    { name: 'referrals', column: 'referrer_id' },
    { name: 'referrals', column: 'referred_id' },
    { name: 'promo_code_uses', column: 'user_id' },
    { name: 'wave_payment_proofs', column: 'user_id' },
    { name: 'email_logs', column: 'user_id' },
  ];
  
  for (const table of tables) {
    try {
      const updateRes = await fetchWithAuth(
        `/rest/v1/${table.name}?${table.column}=eq.${oldId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ [table.column]: newId }),
          headers: { 'Prefer': 'return=minimal' }
        }
      );
      
      if (!updateRes.ok && updateRes.status !== 404) {
        console.log(`      ⚠️ Failed to update ${table.name}.${table.column}`);
      }
    } catch (e) {
      // Ignore errors for tables that might not exist
    }
  }
}

main().catch(console.error);
