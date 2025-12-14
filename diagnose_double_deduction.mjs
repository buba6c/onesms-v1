/**
 * DIAGNOSTIC: Double déduction de solde
 * 
 * Problème: Solde initial 41, achat de 5, résultat 31 (devrait être 36)
 * 
 * Ce script analyse les opérations récentes pour trouver la double déduction
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 DIAGNOSTIC: Double déduction de solde\n');
  console.log('=' .repeat(60));

  // 1. Trouver l'utilisateur (buba6c@gmail.com)
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

  // 2. Afficher l'état actuel du wallet
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email, balance, frozen_balance')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('❌ Erreur récupération user:', userError);
    return;
  }

  console.log('\n📊 ÉTAT ACTUEL DU WALLET:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Balance (soldeTotal): ${user.balance}`);
  console.log(`   Frozen: ${user.frozen_balance}`);
  console.log(`   Disponible: ${user.balance - user.frozen_balance}`);

  // 3. Récupérer les 20 dernières opérations de balance
  console.log('\n\n📜 DERNIÈRES OPÉRATIONS (balance_operations):');
  console.log('-'.repeat(60));
  
  const { data: operations, error: opError } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (opError) {
    console.error('❌ Erreur récupération operations:', opError);
  } else if (operations && operations.length > 0) {
    operations.forEach((op, i) => {
      const date = new Date(op.created_at).toLocaleString('fr-FR');
      console.log(`\n[${i+1}] ${op.operation_type.toUpperCase()} - ${date}`);
      console.log(`    Montant: ${op.amount}`);
      console.log(`    Balance: ${op.balance_before} → ${op.balance_after}`);
      console.log(`    Frozen: ${op.frozen_before} → ${op.frozen_after}`);
      console.log(`    Raison: ${op.reason || '-'}`);
      if (op.activation_id) console.log(`    Activation: ${op.activation_id}`);
      if (op.related_transaction_id) console.log(`    Transaction: ${op.related_transaction_id}`);
    });
  } else {
    console.log('   Aucune opération trouvée');
  }

  // 4. Récupérer les dernières transactions
  console.log('\n\n📜 DERNIÈRES TRANSACTIONS:');
  console.log('-'.repeat(60));
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (txError) {
    console.error('❌ Erreur récupération transactions:', txError);
  } else if (transactions && transactions.length > 0) {
    transactions.forEach((tx, i) => {
      const date = new Date(tx.created_at).toLocaleString('fr-FR');
      console.log(`\n[${i+1}] ${tx.type.toUpperCase()} (${tx.status}) - ${date}`);
      console.log(`    Montant: ${tx.amount}`);
      console.log(`    Balance: ${tx.balance_before} → ${tx.balance_after}`);
      console.log(`    Description: ${tx.description || '-'}`);
      if (tx.related_activation_id) console.log(`    Activation: ${tx.related_activation_id}`);
    });
  } else {
    console.log('   Aucune transaction trouvée');
  }

  // 5. Vérifier les activations récentes
  console.log('\n\n📱 ACTIVATIONS RÉCENTES:');
  console.log('-'.repeat(60));
  
  const { data: activations, error: actError } = await supabase
    .from('activations')
    .select('id, order_id, phone, status, price, frozen_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (actError) {
    console.error('❌ Erreur récupération activations:', actError);
  } else if (activations && activations.length > 0) {
    activations.forEach((act, i) => {
      const date = new Date(act.created_at).toLocaleString('fr-FR');
      console.log(`\n[${i+1}] ${act.status.toUpperCase()} - ${date}`);
      console.log(`    ID: ${act.id}`);
      console.log(`    Phone: ${act.phone}`);
      console.log(`    Prix: ${act.price} | Frozen: ${act.frozen_amount}`);
    });
  } else {
    console.log('   Aucune activation trouvée');
  }

  // 6. Analyse du problème
  console.log('\n\n' + '='.repeat(60));
  console.log('🔍 ANALYSE DU PROBLÈME:');
  console.log('='.repeat(60));
  
  // Calculer la somme des frozen_amount des activations pending
  const { data: pendingAct } = await supabase
    .from('activations')
    .select('frozen_amount, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting']);

  const totalFrozenExpected = pendingAct?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0;
  
  console.log(`\n   Frozen actuel dans users: ${user.frozen_balance}`);
  console.log(`   Somme frozen_amount (pending/waiting): ${totalFrozenExpected}`);
  
  if (Math.abs(user.frozen_balance - totalFrozenExpected) > 0.01) {
    console.log(`\n   ⚠️ INCOHÉRENCE: Différence de ${user.frozen_balance - totalFrozenExpected}`);
  } else {
    console.log(`\n   ✅ Frozen cohérent`);
  }

  // Vérifier si le solde correspond aux opérations
  console.log('\n\n📊 VÉRIFICATION ARITHMÉTIQUE:');
  
  if (operations && operations.length > 0) {
    // Prendre la dernière opération
    const lastOp = operations[0];
    console.log(`   Dernière opération: balance_after = ${lastOp.balance_after}`);
    console.log(`   Balance actuelle: ${user.balance}`);
    
    if (Math.abs(lastOp.balance_after - user.balance) > 0.01) {
      console.log(`   ⚠️ INCOHÉRENCE entre la dernière opération et le solde actuel!`);
    }
  }
}

diagnose().catch(console.error);
