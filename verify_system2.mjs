import { createClient } from '@supabase/supabase-js';

// Self-hosted Supabase via Coolify
const supabaseUrl = 'https://api.onesms-sn.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzM1MjU2MDAsCiAgImV4cCI6IDE4OTEyOTIwMDAKfQ.GuvPrqpMIvmRbGFPpgFKUC_0gIb3TxXmhoh9KPpCtbI';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VÉRIFICATION COMPLÈTE DU SYSTÈME\n');
console.log('═'.repeat(60));

// 1. Test secure_freeze_balance
console.log('\n🧪 1. TEST secure_freeze_balance\n');

const { data: testUser } = await supabase
  .from('users')
  .select('id, email, balance, frozen_balance')
  .gt('balance', 1)
  .limit(1)
  .single();

if (testUser) {
  console.log(`  User: ${testUser.email}`);
  console.log(`  Balance: ${testUser.balance} | Frozen: ${testUser.frozen_balance || 0}`);
  
  const { data: freezeTest, error: freezeErr } = await supabase.rpc('secure_freeze_balance', {
    p_user_id: testUser.id,
    p_amount: 0.01,
    p_reason: 'System verification test'
  });
  
  if (freezeErr) {
    console.log(`  ❌ ERREUR: ${freezeErr.message}`);
  } else if (freezeTest?.success) {
    console.log(`  ✅ secure_freeze_balance FONCTIONNE`);
    
    // Rollback
    const { data: unfreezeTest, error: unfreezeErr } = await supabase.rpc('secure_unfreeze_balance', {
      p_user_id: testUser.id,
      p_refund_to_balance: true,
      p_refund_reason: 'Rollback test'
    });
    
    if (unfreezeErr) {
      console.log(`  ⚠️ Rollback échoué: ${unfreezeErr.message}`);
    } else if (unfreezeTest?.success || unfreezeTest?.idempotent) {
      console.log(`  ✅ secure_unfreeze_balance FONCTIONNE`);
    }
  } else {
    console.log(`  ⚠️ Résultat: ${JSON.stringify(freezeTest)}`);
  }
} else {
  console.log('  ⚠️ Aucun utilisateur avec balance > 1');
}

// 2. Vérifier Edge Functions
console.log('\n🚀 2. EDGE FUNCTIONS\n');

const edgeFunctions = [
  'buy-sms-activate-rent',
  'continue-sms-activate-rent',
  'buy-sms-activate-number',
  'cancel-sms-activate-order'
];

for (const fn of edgeFunctions) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: 'OPTIONS',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`  ${response.status === 200 ? '✅' : '⚠️'} ${fn} (${response.status})`);
  } catch (e) {
    console.log(`  ❌ ${fn}: ${e.message}`);
  }
}

// 3. Rentals actifs
console.log('\n📊 3. RENTALS ACTIFS\n');

const { data: rentals, count } = await supabase
  .from('rentals')
  .select('phone, status, frozen_amount, expires_at', { count: 'exact' })
  .eq('status', 'active')
  .limit(5);

console.log(`  Total: ${count || 0}`);
(rentals || []).forEach(r => {
  const mins = Math.round((new Date(r.expires_at) - new Date()) / 60000);
  console.log(`  • ${r.phone} | frozen: ${r.frozen_amount} | ${mins > 0 ? mins + 'min' : 'expiré'}`);
});

// 4. Cohérence frozen_balance
console.log('\n💰 4. COHÉRENCE FROZEN_BALANCE\n');

const { data: usersWithFrozen } = await supabase
  .from('users')
  .select('id, email, frozen_balance')
  .gt('frozen_balance', 0);

let issues = 0;
for (const user of usersWithFrozen || []) {
  const { data: acts } = await supabase
    .from('activations')
    .select('frozen_amount')
    .eq('user_id', user.id)
    .gt('frozen_amount', 0);
  
  const { data: rents } = await supabase
    .from('rentals')
    .select('frozen_amount')
    .eq('user_id', user.id)
    .gt('frozen_amount', 0);
    
  const sum = (acts || []).reduce((s, a) => s + (a.frozen_amount || 0), 0)
            + (rents || []).reduce((s, r) => s + (r.frozen_amount || 0), 0);
  
  const ok = Math.abs(user.frozen_balance - sum) < 0.01;
  if (!ok) issues++;
  console.log(`  ${ok ? '✅' : '❌'} ${user.email}: frozen=${user.frozen_balance} vs sum=${sum}`);
}

console.log('\n' + '═'.repeat(60));
console.log(`\n🏁 RÉSULTAT: ${issues === 0 ? '✅ TOUT EST OK' : `❌ ${issues} problème(s)`}\n`);
