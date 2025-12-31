const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://htfqmamvmhdoixqcbbbw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE');

async function analyze() {
  console.log('🔍 ANALYSE COMPLETE MONEROO\n');
  
  // 1. Check payment_providers config
  const { data: provider } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'moneroo')
    .single();
  
  console.log('1️⃣ Configuration payment_providers:');
  console.log('   - is_active:', provider?.is_active);
  console.log('   - test_mode:', provider?.config?.test_mode);
  console.log('   - display_name:', provider?.display_name);
  
  // 2. Check recent moneroo transactions
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, status, amount, payment_method, created_at, metadata')
    .eq('payment_method', 'moneroo')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\n2️⃣ Transactions Moneroo récentes:', txs?.length || 0);
  txs?.forEach(tx => {
    console.log('   -', tx.id.substring(0,8), '|', tx.status, '|', tx.amount, 'FCFA | activations:', tx.metadata?.activations || 'N/A');
  });
  
  // 3. Check if RPC functions exist
  const rpcs = ['admin_add_credit', 'secure_referral_payout', 'increment_promo_uses'];
  console.log('\n3️⃣ Fonctions RPC disponibles:');
  for (const rpc of rpcs) {
    try {
      const { error } = await supabase.rpc(rpc, {});
      const exists = !error || !error.message.includes('Could not find');
      console.log('   -', rpc + ':', exists ? '✅' : '❌');
    } catch (e) {
      console.log('   -', rpc + ':', '❌');
    }
  }
  
  // 4. Check balance_operations table exists
  const { data: ops, error: opsErr } = await supabase
    .from('balance_operations')
    .select('id')
    .limit(1);
  console.log('\n4️⃣ Table balance_operations:', opsErr ? '❌ ' + opsErr.message : '✅ existe');
  
  // 5. Test API key
  console.log('\n5️⃣ Test API Moneroo...');
  const testRes = await fetch('https://api.moneroo.io/v1/payments/initialize', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer pvk_1hreh7|01KCHZYV5P9WN4Q9T5384REGQH',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      amount: 100,
      currency: 'XOF',
      description: 'Test',
      customer: { email: 'test@test.com', first_name: 'Test', last_name: 'User' },
      return_url: 'https://onesms-sn.com'
    })
  });
  const pingData = await testRes.json().catch(() => ({}));
  console.log('   - Status:', testRes.status);
  console.log('   - Success:', pingData.data?.checkout_url ? '✅ API fonctionne' : '❌ ' + (pingData.message || 'Erreur'));
  
  // 6. Check constraint
  console.log('\n6️⃣ Test insertion payment_method moneroo...');
  const { data: user } = await supabase.from('users').select('id, balance').limit(1).single();
  const { error: insertErr } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'deposit',
      amount: 1,
      balance_before: user.balance || 0,
      balance_after: user.balance || 0,
      status: 'pending',
      payment_method: 'moneroo',
      reference: 'ANALYZE_TEST_' + Date.now()
    });
  
  if (insertErr) {
    console.log('   - ❌ Erreur:', insertErr.message);
  } else {
    console.log('   - ✅ Insertion OK (constraint moneroo valide)');
    // Cleanup
    await supabase.from('transactions').delete().eq('reference', 'ANALYZE_TEST_' + Date.now());
  }
  
  console.log('\n✅ Analyse terminée');
}
analyze();
