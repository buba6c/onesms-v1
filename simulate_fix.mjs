import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('═══════════════════════════════════════════════════════════');
console.log('  SIMULATION: APPLIQUER LE FIX ET TESTER');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Vérifier l'état actuel
console.log('📊 AVANT LE FIX:\n');
const { data: userBefore } = await sb
  .from('users')
  .select('email, role')
  .eq('email', 'buba6c@gmail.com')
  .single();

console.log(`   buba6c@gmail.com → role: ${userBefore.role}`);

const { count: rentalsBefore } = await sb
  .from('rentals')
  .select('*', { count: 'exact', head: true });

console.log(`   Total rentals dans DB: ${rentalsBefore}`);

const { count: bubaRentalsBefore } = await sb
  .from('rentals')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', 'e108c02a-2012-4043-bbc2-fb09bb11f824');

console.log(`   Rentals de buba: ${bubaRentalsBefore}`);

// 2. Appliquer le fix (OPTION A)
console.log('\n🔧 APPLICATION DU FIX (OPTION A):\n');
console.log('   UPDATE users SET role = \'admin\' WHERE email = \'buba6c@gmail.com\'');

const { error: updateErr } = await sb
  .from('users')
  .update({ role: 'admin' })
  .eq('email', 'buba6c@gmail.com');

if (updateErr) {
  console.log('   ❌ Erreur:', updateErr.message);
} else {
  console.log('   ✅ Role mis à jour vers "admin"');
}

// 3. Vérifier après le fix
console.log('\n📊 APRÈS LE FIX:\n');
const { data: userAfter } = await sb
  .from('users')
  .select('email, role')
  .eq('email', 'buba6c@gmail.com')
  .single();

console.log(`   buba6c@gmail.com → role: ${userAfter.role} ✓`);

// 4. Note sur la politique RLS
console.log('\n⚠️  NOTE IMPORTANTE:');
console.log('   Le changement de role seul ne suffit pas !');
console.log('   Il faut AUSSI modifier la politique RLS pour utiliser:');
console.log('   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = \'admin\')');
console.log('\n   Pour cela, exécuter la partie OPTION B du fichier fix_admin_access_final.sql');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PROCHAINE ÉTAPE: Exécuter OPTION B dans Supabase SQL Editor');
console.log('═══════════════════════════════════════════════════════════\n');

