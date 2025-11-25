#!/usr/bin/env node

/**
 * Script de diagnostic pour identifier pourquoi les rentals ne s'affichent pas
 * 
 * Usage: node diagnose_rentals.mjs
 */

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

console.log('🔍 DIAGNOSTIC RENTALS - Pourquoi les numéros ne s\'affichent pas\n');
console.log('=' .repeat(80) + '\n');

// 1. Compter tous les rentals
console.log('📊 ÉTAPE 1: Compter tous les rentals dans la base');
const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/rentals?select=count`, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Prefer': 'count=exact'
  }
});

const countText = await countResponse.text();
console.log(`   Réponse brute: ${countText}`);

const countMatch = countResponse.headers.get('content-range');
console.log(`   Content-Range: ${countMatch}`);
console.log('');

// 2. Récupérer les 5 derniers rentals
console.log('📋 ÉTAPE 2: Récupérer les 5 derniers rentals (tous statuts)');
const allRentalsResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/rentals?order=created_at.desc&limit=5&select=*`,
  {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  }
);

const allRentals = await allRentalsResponse.json();

if (!Array.isArray(allRentals)) {
  console.error('   ❌ ERREUR:', allRentals);
} else if (allRentals.length === 0) {
  console.log('   ⚠️  AUCUN RENTAL TROUVÉ dans la table rentals');
  console.log('   ℹ️  Cela signifie que buy-sms-activate-rent n\'a jamais créé d\'enregistrement');
  console.log('   ℹ️  Ou que tous les rentals ont été supprimés');
} else {
  console.log(`   ✅ ${allRentals.length} rental(s) trouvé(s)\n`);
  
  allRentals.forEach((rental, i) => {
    console.log(`   📞 Rental ${i + 1}:`);
    console.log(`      ID: ${rental.id}`);
    console.log(`      User ID: ${rental.user_id}`);
    console.log(`      Rental ID: ${rental.rental_id || rental.rent_id || '❌ MANQUANT'}`);
    console.log(`      Phone: ${rental.phone || '❌ NULL'}`);
    console.log(`      Service: ${rental.service_code || '❌ NULL'}`);
    console.log(`      Country: ${rental.country_code || '❌ NULL'}`);
    console.log(`      Status: ${rental.status || '❌ NULL'}`);
    console.log(`      Provider: ${rental.provider || 'N/A'}`);
    console.log(`      Created: ${rental.created_at}`);
    console.log(`      Expires: ${rental.expires_at || rental.end_date || '❌ MANQUANT'}`);
    console.log(`      Duration: ${rental.duration_hours || rental.rent_hours || '❌ MANQUANT'}h`);
    console.log(`      Messages: ${rental.message_count || 0}`);
    
    // Vérifier les problèmes
    const issues = [];
    if (!rental.phone) issues.push('phone NULL');
    if (!rental.service_code) issues.push('service_code NULL');
    if (!rental.country_code) issues.push('country_code NULL');
    if (rental.status !== 'active') issues.push(`status=${rental.status} (devrait être 'active')`);
    
    if (issues.length > 0) {
      console.log(`      ⚠️  PROBLÈMES: ${issues.join(', ')}`);
    } else {
      console.log(`      ✅ Toutes les colonnes requises sont OK`);
    }
    console.log('');
  });
}

console.log('');

// 3. Compter les rentals actifs par statut
console.log('📊 ÉTAPE 3: Distribution par statut');
const statusResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/rentals?select=status`,
  {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  }
);

const statusData = await statusResponse.json();
if (Array.isArray(statusData)) {
  const statusCounts = statusData.reduce((acc, r) => {
    const status = r.status || 'null';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    const icon = status === 'active' ? '✅' : '⚠️';
    console.log(`   ${icon} ${status}: ${count}`);
  });
  
  if (!statusCounts['active'] || statusCounts['active'] === 0) {
    console.log('\n   ❌ PROBLÈME IDENTIFIÉ: Aucun rental avec status="active"');
    console.log('   💡 Solution: Les rentals ont peut-être expiré ou ont un autre statut');
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n🔍 DIAGNOSTIC TERMINÉ\n');

// 4. Recommandations
console.log('💡 RECOMMANDATIONS:\n');

if (!allRentals || allRentals.length === 0) {
  console.log('   1. ❌ La table rentals est vide');
  console.log('   2. ✅ Essayer de louer un nouveau numéro');
  console.log('   3. ✅ Vérifier les logs de buy-sms-activate-rent:');
  console.log('      supabase functions logs buy-sms-activate-rent');
  console.log('');
} else {
  const hasPhoneIssues = allRentals.some(r => !r.phone);
  const hasServiceIssues = allRentals.some(r => !r.service_code);
  const hasCountryIssues = allRentals.some(r => !r.country_code);
  const hasStatusIssues = allRentals.every(r => r.status !== 'active');
  
  if (hasPhoneIssues || hasServiceIssues || hasCountryIssues) {
    console.log('   1. ❌ Colonnes NULL détectées dans buy-sms-activate-rent');
    console.log('   2. ✅ Vérifier que l\'API SMS-Activate retourne bien phone, service, country');
    console.log('   3. ✅ Vérifier les logs de la dernière location');
    console.log('');
  }
  
  if (hasStatusIssues) {
    console.log('   1. ❌ Aucun rental avec status="active"');
    console.log('   2. ✅ Vérifier si les rentals ont expiré (expires_at < now)');
    console.log('   3. ✅ Ou modifier le filtre dans DashboardPage.tsx:');
    console.log('      .in(\'status\', [\'active\', \'pending\', \'waiting\'])');
    console.log('');
  }
  
  if (!hasPhoneIssues && !hasServiceIssues && !hasCountryIssues && !hasStatusIssues) {
    console.log('   ✅ Les données dans la base semblent correctes');
    console.log('   ℹ️  Le problème est probablement:');
    console.log('      1. User ID différent (location liée à un autre utilisateur)');
    console.log('      2. Cache React Query pas rafraîchi');
    console.log('      3. Erreur dans le mapping Frontend');
    console.log('');
    console.log('   🔧 Actions:');
    console.log('      1. Vérifier user_id actuel dans la console navigateur:');
    console.log('         const { data: { user } } = await supabase.auth.getUser();');
    console.log('         console.log(user.id);');
    console.log('      2. Comparer avec les user_id dans la table rentals ci-dessus');
    console.log('      3. Rafraîchir la page avec Cmd+Shift+R (clear cache)');
    console.log('');
  }
}

console.log('📝 LOGS À VÉRIFIER:\n');
console.log('   1. Console navigateur:');
console.log('      • Chercher: "🏠 [LOAD] Chargement rentals DB..."');
console.log('      • Chercher: "✅ [LOAD] Rentals chargés: X"');
console.log('      • Si X = 0: problème de query ou données');
console.log('      • Si X > 0: problème d\'affichage Frontend');
console.log('');
console.log('   2. Logs Edge Function:');
console.log('      • supabase functions logs buy-sms-activate-rent');
console.log('      • Chercher: "✅ [BUY-RENT] Rental créé avec succès:"');
console.log('      • Vérifier que phone, service_code, country_code sont présents');
console.log('');
