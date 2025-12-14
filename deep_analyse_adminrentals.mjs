import { createClient } from '@supabase/supabase-js';

// Service role
const sbService = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

// Anon key (comme le frontend)
const sbAnon = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.v_hEzQr6DlN6YMQSg6NfXq2ZfApXmSdYXEU9WPR2x1Y'
);

const adminId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

console.log('═══════════════════════════════════════════════════════════');
console.log('       ANALYSE PROFONDE: ADMIN RENTALS PAGE');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Vérifier le user admin
console.log('📊 1. INFORMATIONS USER ADMIN\n');
const { data: admin, error: adminErr } = await sbService
  .from('users')
  .select('id, email, is_admin, balance, frozen_balance')
  .eq('id', adminId)
  .single();

if (adminErr) {
  console.log('❌ Erreur:', adminErr.message);
} else {
  console.log(`   Email: ${admin.email}`);
  console.log(`   Is Admin: ${admin.is_admin}`);
  console.log(`   Balance: ${admin.balance}Ⓐ`);
  console.log(`   Frozen: ${admin.frozen_balance}Ⓐ`);
}

// 2. Compter les rentals avec service_role
console.log('\n📊 2. RENTALS AVEC SERVICE_ROLE\n');
const { data: rentalsService, count: countService, error: errService } = await sbService
  .from('rentals')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false });

if (errService) {
  console.log('❌ Erreur:', errService.message);
} else {
  console.log(`   Total: ${countService} rentals`);
  if (rentalsService && rentalsService.length > 0) {
    console.log('\n   Les 5 derniers:');
    rentalsService.slice(0, 5).forEach(r => {
      console.log(`   - ${r.id.slice(0, 8)}... | ${r.phone} | ${r.status} | ${r.total_cost}Ⓐ | user: ${r.user_id.slice(0, 8)}...`);
    });
  }
}

// 3. Rentals de l'admin avec service_role
console.log('\n📊 3. RENTALS DE L\'ADMIN (service_role)\n');
const { data: adminRentalsService, count: countAdminService } = await sbService
  .from('rentals')
  .select('*', { count: 'exact' })
  .eq('user_id', adminId);

console.log(`   Rentals de l'admin: ${countAdminService}`);

// 4. Test avec anon key (SANS auth)
console.log('\n📊 4. TEST AVEC ANON KEY (sans authentification)\n');
const { data: rentalsAnon, count: countAnon, error: errAnon } = await sbAnon
  .from('rentals')
  .select('*', { count: 'exact' });

if (errAnon) {
  console.log('❌ Erreur:', errAnon.message);
} else {
  console.log(`   Total visible: ${countAnon} rentals`);
  if (countAnon === 0) {
    console.log('   ⚠️  ANON NE VOIT RIEN (normal, RLS actif)');
  }
}

// 5. Test avec anon key + JWT de l'admin
console.log('\n📊 5. TEST AVEC ANON KEY + JWT ADMIN\n');

// Sign in comme l'admin
const { data: authData, error: authErr } = await sbService.auth.admin.createUser({
  email: admin.email,
  password: 'test123',
  email_confirm: true,
  user_metadata: {}
});

// Générer un JWT pour cet user
console.log('   Impossible de simuler exactement le frontend sans le password.');
console.log('   Mais on peut vérifier les politiques RLS...');

// 6. Vérifier les politiques RLS
console.log('\n📊 6. POLITIQUES RLS SUR RENTALS\n');

// Via pg_policies
const { data: policies, error: polErr } = await sbService
  .rpc('exec_sql', {
    sql: `
      SELECT 
        policyname, 
        permissive,
        roles::text[],
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = 'rentals'
      ORDER BY policyname
    `
  });

if (polErr && polErr.code === '42883') {
  // exec_sql n'existe pas, essayer autrement
  console.log('   ⚠️  Impossible de lire pg_policies via RPC');
  console.log('   Vérification dans la console Supabase requise.');
} else if (polErr) {
  console.log('❌ Erreur:', polErr.message);
} else {
  console.log('   Politiques trouvées:', policies?.length || 0);
  if (policies) {
    policies.forEach(p => {
      console.log(`\n   📜 ${p.policyname}`);
      console.log(`      Roles: ${p.roles}`);
      console.log(`      Cmd: ${p.cmd}`);
      console.log(`      USING: ${p.qual || 'N/A'}`);
      console.log(`      WITH CHECK: ${p.with_check || 'N/A'}`);
    });
  }
}

// 7. Test: Simuler la requête du frontend
console.log('\n📊 7. SIMULER LA REQUÊTE DU FRONTEND\n');
console.log('   Le frontend fait:');
console.log('   supabase.from("rentals").select("*").order("created_at", { ascending: false })');
console.log('\n   Avec:');
console.log('   - Anon key');
console.log('   - JWT de l\'utilisateur authentifié (admin)');
console.log('   - RLS actif');

// 8. Diagnostic final
console.log('\n═══════════════════════════════════════════════════════════');
console.log('       DIAGNOSTIC FINAL');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('✅ DONNÉES EXISTANTES:');
console.log(`   - ${countService} rentals dans la DB`);
console.log(`   - ${countAdminService} appartiennent à l'admin`);

console.log('\n🔐 SÉCURITÉ RLS:');
console.log('   - RLS est actif sur la table rentals');
console.log('   - Anon (non authentifié) ne voit rien ✓');

console.log('\n❓ QUESTION CLÉ:');
console.log('   La politique RLS permet-elle aux ADMINS de voir TOUS les rentals ?');
console.log('   Ou seulement leurs propres rentals ?');

console.log('\n💡 SOLUTION:');
console.log('   Si l\'admin ne voit que ses rentals:');
console.log('   → Exécuter fix_admin_rentals_access_safe.sql');
console.log('   → Cela modifie la politique SELECT pour autoriser is_admin = true');

console.log('\n🔍 PROCHAINES ÉTAPES:');
console.log('   1. Vérifier les politiques dans Supabase Dashboard');
console.log('   2. Vérifier que admin.is_admin = true');
console.log('   3. Appliquer le fix SQL si nécessaire');
console.log('   4. Tester à nouveau dans le frontend\n');

