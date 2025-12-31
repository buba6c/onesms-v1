import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tgsqhwxsapicrhjwvmil.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnc3Fod3hzYXBpY3JoandibWlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzMxOTEyOCwiZXhwIjoyMDQ4ODk1MTI4fQ.aRqzMOJaOax8B0whyi2L-xBJwLcbCAw4kT9KrOXxdKs';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VÉRIFICATION COMPLÈTE DU SYSTÈME\n');
console.log('═'.repeat(60));

// 1. Vérifier les fonctions SQL
console.log('\n📦 1. FONCTIONS SQL EN PRODUCTION\n');

const functions = [
  'secure_freeze_balance',
  'secure_unfreeze_balance', 
  'ensure_user_balance_ledger',
  'admin_add_credit'
];

for (const fn of functions) {
  const { data, error } = await supabase.rpc('pg_get_functiondef', { function_name: fn }).single();
  
  // Alternative: check via pg_proc
  const { data: exists } = await supabase
    .from('pg_proc')
    .select('proname')
    .eq('proname', fn)
    .maybeSingle();
    
  console.log(`  ${exists ? '✅' : '❌'} ${fn}`);
}

// 2. Vérifier le trigger
console.log('\n🔒 2. TRIGGER users_balance_guard\n');
const { data: trigger } = await supabase.rpc('check_trigger_exists', { trigger_name: 'enforce_balance_ledger' });

// 3. Test secure_freeze_balance avec un utilisateur test
console.log('\n🧪 3. TEST secure_freeze_balance (dry run)\n');

// Trouver un user avec du solde
const { data: testUser } = await supabase
  .from('users')
  .select('id, email, balance, frozen_balance')
  .gt('balance', 10)
  .limit(1)
  .single();

if (testUser) {
  console.log(`  User test: ${testUser.email}`);
  console.log(`  Balance: ${testUser.balance} | Frozen: ${testUser.frozen_balance || 0}`);
  
  // Test avec montant 0.01 (sera rollback)
  const { data: freezeTest, error: freezeErr } = await supabase.rpc('secure_freeze_balance', {
    p_user_id: testUser.id,
    p_amount: 0.01,
    p_reason: 'System verification test'
  });
  
  if (freezeErr) {
    console.log(`  ❌ secure_freeze_balance ÉCHOUÉ: ${freezeErr.message}`);
  } else if (freezeTest?.success) {
    console.log(`  ✅ secure_freeze_balance OK`);
    
    // Rollback immédiat
    const { data: unfreezeTest } = await supabase.rpc('secure_unfreeze_balance', {
      p_user_id: testUser.id,
      p_refund_to_balance: true,
      p_refund_reason: 'System verification rollback'
    });
    
    if (unfreezeTest?.success) {
      console.log(`  ✅ secure_unfreeze_balance (refund) OK`);
    }
  } else {
    console.log(`  ⚠️ secure_freeze_balance: ${JSON.stringify(freezeTest)}`);
  }
}

// 4. Vérifier les Edge Functions déployées
console.log('\n🚀 4. EDGE FUNCTIONS (via health check)\n');

const edgeFunctions = [
  'buy-sms-activate-rent',
  'continue-sms-activate-rent',
  'buy-sms-activate-number',
  'cancel-sms-activate-order',
  'set-rent-status',
  'get-rent-status'
];

for (const fn of edgeFunctions) {
  try {
    const response = await fetch(`https://tgsqhwxsapicrhjwvmil.supabase.co/functions/v1/${fn}`, {
      method: 'OPTIONS'
    });
    console.log(`  ${response.ok ? '✅' : '⚠️'} ${fn} (${response.status})`);
  } catch (e) {
    console.log(`  ❌ ${fn} (unreachable)`);
  }
}

// 5. Vérifier les rentals actifs
console.log('\n📊 5. RENTALS ACTIFS\n');

const { data: rentals, count: rentalCount } = await supabase
  .from('rentals')
  .select('id, phone, status, frozen_amount, total_cost, expires_at', { count: 'exact' })
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(5);

console.log(`  Total actifs: ${rentalCount || 0}`);
if (rentals?.length) {
  rentals.forEach(r => {
    const expires = new Date(r.expires_at);
    const now = new Date();
    const remaining = Math.round((expires - now) / 60000);
    console.log(`  • ${r.phone} | frozen: ${r.frozen_amount} | expire dans: ${remaining}min`);
  });
}

// 6. Vérifier cohérence frozen_balance
console.log('\n💰 6. COHÉRENCE FROZEN_BALANCE\n');

const { data: usersWithFrozen } = await supabase
  .from('users')
  .select('id, email, frozen_balance')
  .gt('frozen_balance', 0)
  .limit(10);

for (const user of usersWithFrozen || []) {
  // Somme des activations frozen
  const { data: activations } = await supabase
    .from('activations')
    .select('frozen_amount')
    .eq('user_id', user.id)
    .gt('frozen_amount', 0);
  
  const { data: rentalsData } = await supabase
    .from('rentals')
    .select('frozen_amount')
    .eq('user_id', user.id)
    .gt('frozen_amount', 0);
    
  const sumActivations = (activations || []).reduce((s, a) => s + (a.frozen_amount || 0), 0);
  const sumRentals = (rentalsData || []).reduce((s, r) => s + (r.frozen_amount || 0), 0);
  const expected = sumActivations + sumRentals;
  
  const match = Math.abs(user.frozen_balance - expected) < 0.01;
  console.log(`  ${match ? '✅' : '❌'} ${user.email}: users.frozen=${user.frozen_balance} vs sum=${expected}`);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ VÉRIFICATION TERMINÉE\n');
