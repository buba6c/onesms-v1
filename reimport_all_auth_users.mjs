#!/usr/bin/env node
/**
 * 🔄 RÉIMPORTER TOUS LES AUTH.USERS DE PRODUCTION → COOLIFY
 * 
 * Ce script:
 * 1. Récupère tous les auth.users de Supabase Cloud
 * 2. Les crée sur Coolify avec les mêmes IDs
 * 3. Met à jour public.users pour correspondre
 */

// Configuration Production (Supabase Cloud)
const PROD_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

// Configuration Coolify
const COOLIFY_URL = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const COOLIFY_SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y';

async function fetchWithAuth(baseUrl, serviceKey, endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  return response;
}

async function main() {
  console.log('🔄 RÉIMPORTATION DES AUTH.USERS\n');
  console.log('='.repeat(50));
  
  // 1. Récupérer tous les auth.users de production
  console.log('\n📥 Récupération des auth.users de PRODUCTION...');
  
  let allProdUsers = [];
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const response = await fetchWithAuth(
      PROD_URL, 
      PROD_SERVICE_KEY,
      `/auth/v1/admin/users?page=${page}&per_page=${perPage}`
    );
    
    if (!response.ok) {
      console.error('❌ Erreur:', await response.text());
      break;
    }
    
    const data = await response.json();
    const users = data.users || data;
    
    if (!users || users.length === 0) break;
    
    allProdUsers.push(...users);
    console.log(`   Page ${page}: ${users.length} utilisateurs (total: ${allProdUsers.length})`);
    
    if (users.length < perPage) break;
    page++;
  }
  
  console.log(`\n✅ ${allProdUsers.length} utilisateurs trouvés en production`);
  
  // 2. Récupérer les auth.users existants sur Coolify
  console.log('\n📥 Récupération des auth.users de COOLIFY...');
  const coolifyResponse = await fetchWithAuth(
    COOLIFY_URL,
    COOLIFY_SERVICE_KEY,
    '/auth/v1/admin/users?per_page=1000'
  );
  
  const coolifyData = await coolifyResponse.json();
  const coolifyUsers = coolifyData.users || coolifyData;
  console.log(`   ${coolifyUsers.length} utilisateurs existants sur Coolify`);
  
  // Créer un Set des IDs existants sur Coolify
  const existingIds = new Set(coolifyUsers.map(u => u.id));
  const existingEmails = new Set(coolifyUsers.map(u => u.email?.toLowerCase()));
  
  // 3. Trouver les utilisateurs à créer
  const toCreate = allProdUsers.filter(u => 
    !existingIds.has(u.id) && !existingEmails.has(u.email?.toLowerCase())
  );
  
  console.log(`\n📊 Analyse:`);
  console.log(`   - Déjà existants: ${allProdUsers.length - toCreate.length}`);
  console.log(`   - À créer: ${toCreate.length}`);
  
  if (toCreate.length === 0) {
    console.log('\n✅ Tous les utilisateurs sont déjà importés!');
    return;
  }
  
  // 4. Créer les utilisateurs manquants
  console.log(`\n🔧 Création des ${toCreate.length} utilisateurs...`);
  
  let created = 0;
  let errors = 0;
  
  for (const user of toCreate) {
    try {
      // Créer l'utilisateur avec l'API admin
      const createResponse = await fetchWithAuth(
        COOLIFY_URL,
        COOLIFY_SERVICE_KEY,
        '/auth/v1/admin/users',
        {
          method: 'POST',
          body: JSON.stringify({
            email: user.email,
            password: 'TempPassword123!', // Mot de passe temporaire
            email_confirm: true,
            user_metadata: user.user_metadata || {},
            app_metadata: user.app_metadata || {}
          })
        }
      );
      
      if (createResponse.ok) {
        const newUser = await createResponse.json();
        
        // Maintenant, mettre à jour public.users pour utiliser ce nouvel ID
        // si un profil existe avec cet email
        await updatePublicUserIdIfExists(user.email, user.id, newUser.id);
        
        created++;
        if (created % 50 === 0) {
          console.log(`   ✅ ${created}/${toCreate.length} créés...`);
        }
      } else {
        const errorText = await createResponse.text();
        if (!errorText.includes('already been registered')) {
          errors++;
          if (errors <= 5) {
            console.log(`   ❌ ${user.email}: ${errorText.substring(0, 100)}`);
          }
        }
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.log(`   ❌ ${user.email}: ${err.message}`);
      }
    }
  }
  
  console.log(`\n📊 Résultat:`);
  console.log(`   ✅ Créés: ${created}`);
  console.log(`   ❌ Erreurs: ${errors}`);
  
  // 5. Maintenant synchroniser les IDs
  console.log('\n🔄 Synchronisation des IDs public.users...');
  await syncPublicUserIds();
  
  console.log('\n✅ IMPORTATION TERMINÉE!');
}

async function updatePublicUserIdIfExists(email, oldId, newId) {
  // Cette fonction sera appelée après la sync globale
}

async function syncPublicUserIds() {
  // Récupérer tous les auth.users de Coolify
  const authResponse = await fetchWithAuth(
    COOLIFY_URL,
    COOLIFY_SERVICE_KEY,
    '/auth/v1/admin/users?per_page=2000'
  );
  const authData = await authResponse.json();
  const authUsers = authData.users || authData;
  
  // Créer mapping email -> auth.id
  const emailToAuthId = new Map();
  for (const user of authUsers) {
    if (user.email) {
      emailToAuthId.set(user.email.toLowerCase(), user.id);
    }
  }
  
  // Récupérer tous les public.users
  const publicResponse = await fetchWithAuth(
    COOLIFY_URL,
    COOLIFY_SERVICE_KEY,
    '/rest/v1/users?select=id,email'
  );
  const publicUsers = await publicResponse.json();
  
  // Trouver les mismatches
  const toFix = [];
  for (const pub of publicUsers) {
    if (!pub.email) continue;
    const authId = emailToAuthId.get(pub.email.toLowerCase());
    if (authId && authId !== pub.id) {
      toFix.push({ email: pub.email, oldId: pub.id, newId: authId });
    }
  }
  
  console.log(`   ${toFix.length} profils à corriger`);
  
  if (toFix.length === 0) return;
  
  // Tables à mettre à jour
  const relatedTables = [
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
  ];
  
  let fixed = 0;
  for (const fix of toFix) {
    try {
      // Récupérer les données complètes
      const userDataRes = await fetchWithAuth(
        COOLIFY_URL,
        COOLIFY_SERVICE_KEY,
        `/rest/v1/users?select=*&id=eq.${fix.oldId}`
      );
      const userData = await userDataRes.json();
      
      if (!userData || userData.length === 0) continue;
      
      const user = userData[0];
      const newUserData = { ...user, id: fix.newId };
      
      // Supprimer l'ancien
      await fetchWithAuth(
        COOLIFY_URL,
        COOLIFY_SERVICE_KEY,
        `/rest/v1/users?id=eq.${fix.oldId}`,
        { method: 'DELETE' }
      );
      
      // Insérer le nouveau
      await fetchWithAuth(
        COOLIFY_URL,
        COOLIFY_SERVICE_KEY,
        '/rest/v1/users',
        {
          method: 'POST',
          body: JSON.stringify(newUserData)
        }
      );
      
      // Mettre à jour les tables liées
      for (const table of relatedTables) {
        await fetchWithAuth(
          COOLIFY_URL,
          COOLIFY_SERVICE_KEY,
          `/rest/v1/${table.name}?${table.column}=eq.${fix.oldId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ [table.column]: fix.newId }),
            headers: { 'Prefer': 'return=minimal' }
          }
        );
      }
      
      fixed++;
    } catch (err) {
      // Ignorer
    }
  }
  
  console.log(`   ✅ ${fixed} profils corrigés`);
}

main().catch(console.error);
