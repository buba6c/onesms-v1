import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnose() {
  console.log('🔍 DIAGNOSTIC ACTIVATION FAILURE\n');
  console.log('='.repeat(80));
  
  // 1. Dernières activations
  console.log('\n1️⃣ DERNIÈRES ACTIVATIONS:');
  const { data: recentActs } = await supabase
    .from('activations')
    .select('id, status, service_name, country, price, frozen_amount, created_at, error_message')
    .order('created_at', { ascending: false })
    .limit(5);
  
  recentActs?.forEach(a => {
    console.log('   - ' + a.created_at.slice(0,19) + ' | ' + a.status + ' | ' + a.service_name + '/' + a.country + ' | ' + a.price + ' FCFA');
    if (a.error_message) console.log('     ERROR: ' + a.error_message);
  });
  
  // 2. Vérifier le solde utilisateur
  console.log('\n2️⃣ SOLDE UTILISATEUR (buba6c):');
  const { data: user } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('email', 'buba6c@gmail.com')
    .single();
  
  if (user) {
    console.log('   Balance: ' + user.balance + ' FCFA');
    console.log('   Frozen: ' + user.frozen_balance + ' FCFA');
    console.log('   Disponible: ' + (user.balance - user.frozen_balance) + ' FCFA');
  }
  
  // 3. Vérifier les RPC functions
  console.log('\n3️⃣ TEST RPC FUNCTIONS:');
  
  // Test atomic_freeze avec un user inexistant
  const { error: freezeErr } = await supabase.rpc('atomic_freeze', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_amount: 1,
    p_transaction_id: null
  });
  
  if (freezeErr?.message?.includes('User not found')) {
    console.log('   ✅ atomic_freeze: Fonctionne');
  } else {
    console.log('   ❌ atomic_freeze: ' + (freezeErr?.message || 'Erreur inconnue'));
  }
  
  // Test atomic_commit
  const { error: commitErr } = await supabase.rpc('atomic_commit', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_activation_id: '00000000-0000-0000-0000-000000000000'
  });
  
  if (commitErr?.message?.includes('User not found') || commitErr?.message?.includes('not found')) {
    console.log('   ✅ atomic_commit: Fonctionne');
  } else {
    console.log('   ❌ atomic_commit: ' + (commitErr?.message || 'Erreur inconnue'));
  }
  
  // Test atomic_refund
  const { error: refundErr } = await supabase.rpc('atomic_refund', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_activation_id: '00000000-0000-0000-0000-000000000000'
  });
  
  if (refundErr?.message?.includes('User not found') || refundErr?.message?.includes('not found')) {
    console.log('   ✅ atomic_refund: Fonctionne');
  } else {
    console.log('   ❌ atomic_refund: ' + (refundErr?.message || 'Erreur inconnue'));
  }
  
  // 4. Dernières transactions
  console.log('\n4️⃣ DERNIÈRES TRANSACTIONS:');
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, type, amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  txs?.forEach(t => {
    console.log('   - ' + t.created_at.slice(0,19) + ' | ' + t.status + ' | ' + t.type + ' | ' + t.amount + ' FCFA');
  });
  
  // 5. balance_operations
  console.log('\n5️⃣ BALANCE_OPERATIONS (audit):');
  const { data: balOps } = await supabase
    .from('balance_operations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!balOps || balOps.length === 0) {
    console.log('   ⚠️  Aucune opération - les nouvelles RPC pas encore utilisées');
  } else {
    balOps.forEach(o => console.log('   - ' + o.operation_type + ': ' + o.amount + ' FCFA'));
  }
  
  // 6. Test direct de la Edge Function
  console.log('\n6️⃣ TEST EDGE FUNCTION buy-sms-activate-number:');
  console.log('   URL: ' + process.env.VITE_SUPABASE_URL + '/functions/v1/buy-sms-activate-number');
  
  try {
    const response = await fetch(process.env.VITE_SUPABASE_URL + '/functions/v1/buy-sms-activate-number', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        userId: user?.id,
        serviceCode: 'tg',
        countryCode: 'russia',
        price: 5
      })
    });
    
    const text = await response.text();
    console.log('   Status: ' + response.status);
    console.log('   Response: ' + text.slice(0, 500));
  } catch (e) {
    console.log('   ❌ Erreur: ' + e.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 ACTIONS RECOMMANDÉES:');
  console.log('='.repeat(80));
  console.log('\n1. Vérifier les logs Edge Functions dans Supabase Dashboard');
  console.log('2. Si solde insuffisant, recharger le compte');
  console.log('3. Si RPC échoue, re-exécuter le SQL de migration');
}

diagnose().catch(console.error);
