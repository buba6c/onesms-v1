import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMxNzUyNiwiZXhwIjoyMDYyODkzNTI2fQ.SuhOrgIHD5p2vFKmKNH4T1vcNDBhEE5-JxbIvFopYhI'
);

// 1. Toutes les activations récentes
console.log('=== 10 DERNIÈRES ACTIVATIONS ===\n');
const { data: allActs } = await supabase
  .from('activations')
  .select('id, order_id, status, price, frozen_amount, charged, user_id, created_at, expires_at, service_code')
  .order('created_at', { ascending: false })
  .limit(10);

for (const act of allActs || []) {
  const now = new Date();
  const expires = new Date(act.expires_at);
  const isExpired = now > expires;
  
  console.log(`📱 ${act.service_code} - ${act.status} ${isExpired && act.status === 'pending' ? '⚠️ EXPIRÉ MAIS PENDING!' : ''}`);
  console.log(`   ID: ${act.id}`);
  console.log(`   Prix: ${act.price}Ⓐ | Frozen: ${act.frozen_amount}Ⓐ | Charged: ${act.charged}`);
  console.log(`   Créé: ${act.created_at}`);
  console.log(`   Expire: ${act.expires_at} ${isExpired ? '(EXPIRÉ)' : ''}`);
  
  // Transaction liée
  const { data: txn } = await supabase
    .from('transactions')
    .select('*')
    .eq('related_activation_id', act.id)
    .maybeSingle();
  
  if (txn) {
    console.log(`   📋 Txn: ${txn.status} - ${txn.amount}Ⓐ`);
  }
  console.log('');
}

// 2. État utilisateur
console.log('\n=== ÉTAT UTILISATEUR ===');
const userId = allActs?.[0]?.user_id;
if (userId) {
  const { data: user } = await supabase
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', userId)
    .single();
  
  console.log(`User: ${user?.email}`);
  console.log(`Balance: ${user?.balance}Ⓐ`);
  console.log(`Frozen: ${user?.frozen_balance}Ⓐ`);
  console.log(`Disponible: ${(user?.balance || 0) - (user?.frozen_balance || 0)}Ⓐ`);
  
  // Calculer le frozen réel
  const { data: pendingActs } = await supabase
    .from('activations')
    .select('frozen_amount, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting'])
    .gt('frozen_amount', 0);
  
  const realFrozen = pendingActs?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0;
  console.log(`\nFrozen réel (pending+waiting): ${realFrozen}Ⓐ`);
  
  if (Math.abs((user?.frozen_balance || 0) - realFrozen) > 0.01) {
    console.log(`⚠️ DÉSYNC! Différence: ${(user?.frozen_balance || 0) - realFrozen}Ⓐ`);
  } else {
    console.log('✅ frozen_balance correct');
  }
}

// 3. Vérifier les balance_operations récentes
console.log('\n\n=== 5 DERNIÈRES OPÉRATIONS BALANCE ===');
const { data: ops } = await supabase
  .from('balance_operations')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

for (const op of ops || []) {
  console.log(`\n${op.operation_type}: ${op.amount}Ⓐ`);
  console.log(`   Balance: ${op.balance_before} -> ${op.balance_after}`);
  console.log(`   Frozen: ${op.frozen_before} -> ${op.frozen_after}`);
  console.log(`   Raison: ${op.reason}`);
}
