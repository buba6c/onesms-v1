import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk4MDMzNSwiZXhwIjoyMDQ4NTU2MzM1fQ.WME_-3PUjjMuSgcxVfaHHeC14LaQ1V1VVlFj7pHjx2g'
);

async function deepAnalyze() {
  const email = 'ududuzin@proton.me';
  
  console.log('🔍 DEEP ANALYSIS: ' + email);
  console.log('='.repeat(60));
  
  // 1. User info
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('\n📌 USER INFO');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Full Name:', user.full_name);
  console.log('Role:', user.role);
  console.log('Balance:', user.balance, 'Ⓐ');
  console.log('Frozen:', user.frozen_balance, 'Ⓐ');
  console.log('Available:', (user.balance || 0) - (user.frozen_balance || 0), 'Ⓐ');
  console.log('Created:', user.created_at);
  console.log('Referral Code:', user.referral_code);
  console.log('Referred By:', user.referred_by);
  
  const userId = user.id;
  
  // 2. ALL Balance Operations - trace complète
  console.log('\n📊 ALL BALANCE OPERATIONS (Chronological)');
  console.log('-'.repeat(60));
  const { data: allOps } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (allOps && allOps.length > 0) {
    allOps.forEach((op, i) => {
      const delta = (op.balance_after || 0) - (op.balance_before || 0);
      console.log(`[${i+1}] ${op.created_at?.substring(0, 19)} | ${op.operation_type.padEnd(12)} | ${delta >= 0 ? '+' : ''}${delta} | bal: ${op.balance_before} → ${op.balance_after} | frozen: ${op.frozen_before} → ${op.frozen_after}`);
      console.log(`     Reason: ${op.reason}`);
      if (op.related_transaction_id) console.log(`     Transaction: ${op.related_transaction_id}`);
      console.log('');
    });
    console.log('Total operations:', allOps.length);
  } else {
    console.log('❌ NO BALANCE OPERATIONS FOUND!');
  }
  
  // 3. ALL Transactions
  console.log('\n💳 ALL TRANSACTIONS');
  console.log('-'.repeat(60));
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (transactions && transactions.length > 0) {
    transactions.forEach((tx, i) => {
      console.log(`[${i+1}] ${tx.created_at?.substring(0, 19)} | ${tx.type.padEnd(10)} | ${tx.status.padEnd(10)} | ${tx.amount} Ⓐ | ${tx.payment_method || 'N/A'}`);
      console.log(`     ID: ${tx.id}`);
      if (tx.description) console.log(`     Desc: ${tx.description}`);
      if (tx.metadata) console.log(`     Meta: ${JSON.stringify(tx.metadata)}`);
      console.log('');
    });
  } else {
    console.log('❌ NO TRANSACTIONS FOUND!');
  }
  
  // 4. Check for referral bonus
  console.log('\n🎁 REFERRAL ANALYSIS');
  console.log('-'.repeat(60));
  
  // A-t-il été parrainé?
  if (user.referred_by) {
    const { data: referrer } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.referred_by)
      .single();
    console.log('Referred by:', referrer?.email, '(' + referrer?.full_name + ')');
  } else {
    console.log('Not referred by anyone');
  }
  
  // A-t-il parrainé quelqu'un?
  const { data: referrals } = await supabase
    .from('users')
    .select('id, email, full_name, created_at')
    .eq('referred_by', userId);
  
  if (referrals && referrals.length > 0) {
    console.log('\nUsers referred by this user:');
    referrals.forEach(r => console.log(`  - ${r.email} (${r.created_at?.substring(0, 10)})`));
  } else {
    console.log('Has not referred anyone');
  }
  
  // 5. Check admin credits
  console.log('\n👤 ADMIN CREDIT CHECKS');
  console.log('-'.repeat(60));
  
  const { data: adminCredits } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .in('operation_type', ['admin_credit', 'admin_add', 'credit', 'add_credit', 'manual_credit']);
  
  if (adminCredits && adminCredits.length > 0) {
    console.log('Admin credits found:');
    adminCredits.forEach(c => console.log(`  ${c.created_at} | +${c.amount} | ${c.reason}`));
  } else {
    console.log('No admin credits found');
  }
  
  // 6. Check if user exists in auth
  console.log('\n🔐 AUTH CHECK');
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  if (authUser?.user) {
    console.log('Auth user exists:', authUser.user.email);
    console.log('Auth created:', authUser.user.created_at);
    console.log('Last sign in:', authUser.user.last_sign_in_at);
    console.log('Identities:', authUser.user.identities?.map(i => i.provider).join(', '));
  }
  
  // 7. Reconstituer le solde
  console.log('\n🧮 BALANCE RECONSTRUCTION');
  console.log('-'.repeat(60));
  
  let reconstructed = 0;
  const sources = {
    recharge: 0,
    refund: 0,
    referral: 0,
    admin: 0,
    freeze: 0,
    commit: 0,
    other: 0
  };
  
  allOps?.forEach(op => {
    const delta = (op.balance_after || 0) - (op.balance_before || 0);
    reconstructed += delta;
    
    if (op.operation_type === 'recharge' || op.operation_type === 'deposit') {
      sources.recharge += delta;
    } else if (op.operation_type === 'refund') {
      sources.refund += delta;
    } else if (op.operation_type === 'referral_bonus' || op.operation_type === 'referral') {
      sources.referral += delta;
    } else if (op.operation_type.includes('admin')) {
      sources.admin += delta;
    } else if (op.operation_type === 'freeze') {
      sources.freeze += delta;
    } else if (op.operation_type === 'commit') {
      sources.commit += delta;
    } else {
      sources.other += delta;
    }
  });
  
  console.log('Sources breakdown:');
  Object.entries(sources).forEach(([k, v]) => {
    if (v !== 0) console.log(`  ${k}: ${v >= 0 ? '+' : ''}${v}`);
  });
  console.log('\nReconstructed balance:', reconstructed);
  console.log('Actual balance:', user.balance);
  console.log('Match:', reconstructed === user.balance ? '✅' : '❌ DISCREPANCY!');

  // 8. Check for direct balance modifications (bypass)
  console.log('\n⚠️ ANOMALY DETECTION');
  console.log('-'.repeat(60));
  
  // Check if balance was set without operations
  if (!allOps || allOps.length === 0) {
    if (user.balance > 0) {
      console.log('🚨 CRITICAL: User has balance but NO balance_operations!');
      console.log('   This means balance was set DIRECTLY bypassing the ledger!');
    }
  }
  
  // Check for gaps in balance history
  if (allOps && allOps.length > 0) {
    const firstOp = allOps[0];
    if (firstOp.balance_before > 0) {
      console.log(`🚨 First operation starts with balance_before = ${firstOp.balance_before}`);
      console.log('   Credits were added BEFORE the first logged operation!');
    }
    
    // Check for inconsistencies
    for (let i = 1; i < allOps.length; i++) {
      if (allOps[i].balance_before !== allOps[i-1].balance_after) {
        console.log(`🚨 Gap detected between op ${i} and ${i+1}:`);
        console.log(`   Op ${i} balance_after: ${allOps[i-1].balance_after}`);
        console.log(`   Op ${i+1} balance_before: ${allOps[i].balance_before}`);
      }
    }
  }
  
  // 9. Check all activations and spending
  console.log('\n📱 ACTIVATIONS SUMMARY');
  console.log('-'.repeat(60));
  const { data: activations } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (activations && activations.length > 0) {
    let totalSpent = 0;
    let totalRefunded = 0;
    activations.forEach((a, i) => {
      const status = a.status;
      if (['received', 'completed'].includes(status)) {
        totalSpent += a.price;
      } else if (['cancelled', 'expired'].includes(status)) {
        totalRefunded += a.price;
      }
      console.log(`[${i+1}] ${a.created_at?.substring(0, 19)} | ${a.status.padEnd(10)} | ${a.service_code} | ${a.price} Ⓐ | charged: ${a.charged}`);
    });
    console.log(`\nTotal spent on SMS: ${totalSpent} Ⓐ`);
    console.log(`Total refunded: ${totalRefunded} Ⓐ`);
  } else {
    console.log('No activations found');
  }
}

deepAnalyze().catch(console.error);
