#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔍 ANALYSE: Remboursement Automatique (kawdpc@gmail.com)    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. Trouver l'utilisateur
const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single();

if (!user) {
  console.log('❌ Utilisateur non trouvé');
  process.exit(1);
}

console.log('👤 USER:');
console.log(`   ID: ${user.id}`);
console.log(`   Email: ${user.email}`);
console.log(`   Balance: ${user.balance}Ⓐ`);
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`);
console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`);

// 2. Activations récentes
const { data: activations } = await sb
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`📱 ACTIVATIONS RÉCENTES (${activations?.length || 0}):\n`);

const now = new Date();

for (const act of activations || []) {
  const time = act.created_at.slice(11, 19);
  const expiresAt = new Date(act.expires_at);
  const isExpired = now > expiresAt;
  const timeLeft = isExpired ? 'EXPIRED' : Math.round((expiresAt - now) / 1000 / 60) + 'min';
  
  console.log(`[${time}] ${act.id.slice(0, 8)} | ${act.service_code} | ${act.status}`);
  console.log(`   Phone: ${act.phone}`);
  console.log(`   Frozen: ${act.frozen_amount}Ⓐ | Price: ${act.price}Ⓐ`);
  console.log(`   Expires: ${timeLeft} ${isExpired ? '⏰' : ''}`);
  
  // Chercher balance_operations
  const { data: freezeOp } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', act.id)
    .eq('operation_type', 'freeze')
    .single();
  
  const { data: refundOp } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', act.id)
    .eq('operation_type', 'refund')
    .single();
  
  console.log(`   Operations: FREEZE ${freezeOp ? '✅' : '❌'} | REFUND ${refundOp ? '✅' : '❌'}`);
  
  if (isExpired && act.status === 'pending' && !refundOp) {
    console.log('   ⚠️  PROBLÈME: Expired mais status=pending et pas de refund!');
  }
  
  console.log('');
}

// 3. Balance operations récentes
const { data: ops } = await sb
  .from('balance_operations')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(10);

console.log(`💰 BALANCE_OPERATIONS RÉCENTES (${ops?.length || 0}):\n`);

for (const op of ops || []) {
  const time = op.created_at.slice(11, 19);
  console.log(`[${time}] ${op.operation_type.toUpperCase()} ${op.amount}Ⓐ`);
  console.log(`   Balance: ${op.balance_before}→${op.balance_after}`);
  console.log(`   Frozen: ${op.frozen_before}→${op.frozen_after}`);
  if (op.activation_id) {
    console.log(`   Activation: ${op.activation_id.slice(0, 8)}`);
  }
  console.log('');
}

console.log('🔍 DIAGNOSTIC:\n');

// Compter les freeze sans refund
const { data: allFreezes } = await sb
  .from('balance_operations')
  .select('*')
  .eq('user_id', user.id)
  .eq('operation_type', 'freeze');

const { data: allRefunds } = await sb
  .from('balance_operations')
  .select('*')
  .eq('user_id', user.id)
  .eq('operation_type', 'refund');

console.log(`Total FREEZE: ${allFreezes?.length || 0}`);
console.log(`Total REFUND: ${allRefunds?.length || 0}`);
console.log(`Différence: ${(allFreezes?.length || 0) - (allRefunds?.length || 0)} freeze(s) sans refund\n`);

// Activations expirées sans refund
const expiredWithoutRefund = [];
for (const act of activations || []) {
  const expiresAt = new Date(act.expires_at);
  const isExpired = now > expiresAt;
  
  if (isExpired && ['pending', 'waiting'].includes(act.status)) {
    const { data: refundOp } = await sb
      .from('balance_operations')
      .select('*')
      .eq('activation_id', act.id)
      .eq('operation_type', 'refund')
      .single();
    
    if (!refundOp && act.frozen_amount > 0) {
      expiredWithoutRefund.push(act);
    }
  }
}

if (expiredWithoutRefund.length > 0) {
  console.log('⚠️  ACTIVATIONS EXPIRÉES SANS REFUND:');
  for (const act of expiredWithoutRefund) {
    console.log(`   - ${act.id.slice(0, 8)} | ${act.service_code} | frozen: ${act.frozen_amount}Ⓐ`);
  }
  console.log(`\nTotal: ${expiredWithoutRefund.length} activation(s) à rembourser`);
} else {
  console.log('✅ Aucune activation expirée en attente de refund');
}
