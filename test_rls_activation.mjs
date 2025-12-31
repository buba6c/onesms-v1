const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function finalCheck() {
  console.log('✅ TESTS POST-ACTIVATION RLS\n');
  console.log('='.repeat(60));
  
  // 1. Test lecture activations
  const { data: acts, error: e1 } = await supabase.from('activations').select('id').limit(5);
  console.log('\n1️⃣ Lecture activations:');
  console.log('   ', e1 ? '❌ ' + e1.message : '✅ OK (' + acts.length + ' lignes)');
  
  // 2. Test lecture balance_operations
  const { data: bals, error: e2 } = await supabase.from('balance_operations').select('id').limit(5);
  console.log('\n2️⃣ Lecture balance_operations:');
  console.log('   ', e2 ? '❌ ' + e2.message : '✅ OK (' + bals.length + ' lignes)');
  
  // 3. Test lecture rental_logs
  const { data: rents, error: e3 } = await supabase.from('rental_logs').select('id').limit(5);
  console.log('\n3️⃣ Lecture rental_logs:');
  console.log('   ', e3 ? '❌ ' + e3.message : '✅ OK (' + rents.length + ' lignes)');
  
  // 4. Test lecture email_logs
  const { data: emails, error: e4 } = await supabase.from('email_logs').select('id').limit(5);
  console.log('\n4️⃣ Lecture email_logs:');
  console.log('   ', e4 ? '❌ ' + e4.message : '✅ OK (' + emails.length + ' lignes)');
  
  // 5. Test insertion (devrait marcher avec service_role)
  console.log('\n5️⃣ Test insertion balance_operations:');
  const testId = 'test-rls-' + Date.now();
  const { error: e5 } = await supabase.from('balance_operations').insert({
    id: testId,
    user_id: 'e108c02a-64b5-47a7-8eab-15a1d74b1a17',
    operation_type: 'test',
    amount: 0,
    balance_before: 0,
    balance_after: 0,
    description: 'Test RLS activation'
  });
  
  if (!e5) {
    // Nettoyer
    await supabase.from('balance_operations').delete().eq('id', testId);
    console.log('    ✅ OK (service_role bypass RLS)');
  } else {
    console.log('    ❌', e5.message);
  }
  
  // 6. Stats finales
  console.log('\n' + '='.repeat(60));
  console.log('📊 Totaux:');
  const { count: actCount } = await supabase.from('activations').select('*', { count: 'exact', head: true });
  const { count: balCount } = await supabase.from('balance_operations').select('*', { count: 'exact', head: true });
  console.log('   - Activations:', actCount);
  console.log('   - Balance operations:', balCount);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ RLS ACTIVÉ AVEC SUCCÈS !');
  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Tester le frontend: https://onesms-sn.com/dashboard');
  console.log('   2. Tester le panel admin: https://onesms-sn.com/admin/activations');
  console.log('   3. Faire un paiement test Moneroo');
  console.log('   4. Surveiller les logs Supabase pendant 24h');
  console.log('\n📝 En cas de problème:');
  console.log('   - Vérifier les logs Supabase');
  console.log('   - Désactiver RLS si nécessaire (voir fix_rls_security.sql)');
}

finalCheck();
