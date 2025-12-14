import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function fullAnalysis() {
  console.log('🔍 ANALYSE COMPLÈTE DU SYSTÈME\n');
  console.log('='.repeat(60));

  // 1. État utilisateur
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'buba6c@gmail.com')
    .single();

  if (userErr) {
    console.error('❌ Erreur utilisateur:', userErr);
    return;
  }

  console.log('\n👤 UTILISATEUR:');
  console.log('   Email:', user.email);
  console.log('   Balance:', user.balance, 'FCFA');
  console.log('   Frozen:', user.frozen_balance, 'FCFA');
  console.log('   Disponible:', (user.balance - user.frozen_balance).toFixed(2), 'FCFA');

  // 2. Activations en cours
  const { data: pendingActivations } = await supabase
    .from('activations')
    .select('id, order_id, status, price, frozen_amount, created_at, phone, service_code')
    .eq('user_id', user.id)
    .in('status', ['pending', 'active', 'waiting'])
    .order('created_at', { ascending: false });

  console.log('\n📱 ACTIVATIONS EN COURS:', pendingActivations?.length || 0);
  let totalFrozenExpected = 0;
  if (pendingActivations && pendingActivations.length > 0) {
    pendingActivations.forEach((a, i) => {
      console.log(`   ${i+1}. ${a.service_code} - ${a.phone}`);
      console.log(`      Status: ${a.status}, Price: ${a.price}, Frozen: ${a.frozen_amount}`);
      console.log(`      Order ID: ${a.order_id}`);
      totalFrozenExpected += (a.frozen_amount || 0);
    });
  }

  // 3. Transactions pending
  const { data: pendingTxns } = await supabase
    .from('transactions')
    .select('id, type, amount, status, description, related_activation_id, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  console.log('\n💳 TRANSACTIONS PENDING:', pendingTxns?.length || 0);
  if (pendingTxns && pendingTxns.length > 0) {
    pendingTxns.forEach((t, i) => {
      console.log(`   ${i+1}. ${t.type} | ${t.amount} | ${t.description?.substring(0, 40)}`);
      console.log(`      Activation ID: ${t.related_activation_id}`);
    });
  }

  // 4. Balance operations récentes
  const { data: balanceOps } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n📊 BALANCE OPERATIONS (10 dernières):');
  if (balanceOps && balanceOps.length > 0) {
    balanceOps.forEach((op, i) => {
      console.log(`   ${i+1}. ${op.operation_type} | Amount: ${op.amount}`);
      console.log(`      Before: ${op.balance_before}/${op.frozen_before} → After: ${op.balance_after}/${op.frozen_after}`);
      console.log(`      Reason: ${op.reason?.substring(0, 50)}`);
    });
  } else {
    console.log('   Aucune opération enregistrée');
  }

  // 5. Analyse des incohérences
  console.log('\n⚠️ ANALYSE DES INCOHÉRENCES:');
  console.log('   Frozen actuel:', user.frozen_balance);
  console.log('   Frozen attendu (somme activations):', totalFrozenExpected);
  
  const excessFrozen = user.frozen_balance - totalFrozenExpected;
  if (excessFrozen > 0) {
    console.log('   ❌ EXCÈS DE FROZEN:', excessFrozen, 'FCFA à débloquer!');
  } else if (excessFrozen < 0) {
    console.log('   ⚠️ DÉFICIT DE FROZEN:', Math.abs(excessFrozen), 'FCFA');
  } else {
    console.log('   ✅ Frozen cohérent');
  }

  // 6. Vérifier les RPC functions
  console.log('\n🔧 TEST DES FONCTIONS RPC:');
  
  // Test atomic_freeze avec amount=0 (dry run)
  const { data: freezeTest, error: freezeErr } = await supabase.rpc('atomic_freeze', {
    p_user_id: user.id,
    p_amount: 0,
    p_transaction_id: null,
    p_reason: 'TEST - dry run'
  });
  
  if (freezeErr) {
    console.log('   ❌ atomic_freeze ERROR:', freezeErr.message);
  } else {
    console.log('   ✅ atomic_freeze OK');
  }

  // Correction suggérée
  console.log('\n💡 CORRECTION SUGGÉRÉE:');
  if (excessFrozen > 0) {
    const newBalance = user.balance + excessFrozen;
    const newFrozen = totalFrozenExpected;
    console.log(`   UPDATE users SET balance = ${newBalance}, frozen_balance = ${newFrozen}`);
    console.log(`   WHERE id = '${user.id}';`);
  }
}

fullAnalysis().catch(console.error);
