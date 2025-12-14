#!/usr/bin/env node
/* eslint-env node */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 DIAGNOSTIC RECHARGE NON CRÉDITÉE\n');
console.log('='.repeat(80));

// 1. Check recent transactions
const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const { data: txs } = await supabase
  .from('transactions')
  .select('*')
  .gte('created_at', thirtyMinAgo)
  .order('created_at', { ascending: false });

console.log('\n📊 TRANSACTIONS RÉCENTES (30 dernières minutes):');
console.log('-'.repeat(80));

if (!txs || txs.length === 0) {
  console.log('❌ Aucune transaction trouvée dans les 30 dernières minutes');
  
  // Check last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recentTxs } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentTxs && recentTxs.length > 0) {
    console.log('\n📋 Dernières transactions (2 dernières heures):');
    recentTxs.forEach(tx => {
      const time = new Date(tx.created_at).toLocaleString('fr-FR');
      console.log(`\n   ${time}`);
      console.log(`   Type: ${tx.type} | Status: ${tx.status} | Amount: ${tx.amount}Ⓐ`);
      console.log(`   Payment: ${tx.payment_method || 'N/A'}`);
    });
  }
} else {
  console.log(`✅ ${txs.length} transaction(s) trouvée(s)\n`);
  
  txs.forEach((tx, i) => {
    console.log(`\n🔹 Transaction ${i + 1}:`);
    console.log(`   ID: ${tx.id}`);
    console.log(`   User ID: ${tx.user_id}`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Amount: ${tx.amount}Ⓐ`);
    console.log(`   Status: ${tx.status} ${tx.status === 'pending' ? '⏳' : tx.status === 'completed' ? '✅' : '❌'}`);
    console.log(`   Payment Method: ${tx.payment_method || 'N/A'}`);
    console.log(`   Created: ${new Date(tx.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Reference: ${tx.reference || tx.payment_ref || 'N/A'}`);
    
    if (tx.metadata) {
      console.log('   Metadata:');
      console.log(`      - Token: ${tx.metadata.moneyfusion_token || 'N/A'}`);
      console.log(`      - Activations: ${tx.metadata.activations || 'N/A'}`);
      console.log(`      - Provider: ${tx.metadata.provider || 'N/A'}`);
      console.log(`      - Amount XOF: ${tx.metadata.amount_xof || 'N/A'}`);
    }
    
    // Check if user was credited
    if (tx.status === 'pending') {
      console.log('   ⚠️  PROBLÈME: Transaction toujours en attente (pending)');
      console.log('   → Le webhook MoneyFusion n\'a pas été reçu ou a échoué');
    } else if (tx.status === 'completed' && tx.type === 'recharge') {
      console.log('   ✅ Transaction complétée, vérifier le solde utilisateur');
    }
  });
}

// 2. Check balance_operations
console.log('\n\n💵 OPÉRATIONS BALANCE (30 dernières minutes):');
console.log('-'.repeat(80));

const { data: ops } = await supabase
  .from('balance_operations')
  .select('*')
  .gte('created_at', thirtyMinAgo)
  .order('created_at', { ascending: false })
  .limit(10);

if (!ops || ops.length === 0) {
  console.log('❌ Aucune opération balance trouvée');
} else {
  console.log(`✅ ${ops.length} opération(s) trouvée(s)\n`);
  ops.forEach((op, i) => {
    console.log(`\n${i + 1}. ${op.operation_type.toUpperCase()}`);
    console.log(`   User: ${op.user_id}`);
    console.log(`   Amount: ${op.amount}Ⓐ`);
    console.log(`   Balance: ${op.balance_before} → ${op.balance_after}`);
    console.log(`   Frozen: ${op.frozen_before || 0} → ${op.frozen_after || 0}`);
    console.log(`   Reason: ${op.reason}`);
    console.log(`   Created: ${new Date(op.created_at).toLocaleString('fr-FR')}`);
  });
}

// 3. Check current user balance
console.log('\n\n👤 SOLDE UTILISATEUR ACTUEL:');
console.log('-'.repeat(80));

const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  console.log('❌ Non authentifié - impossible de vérifier le solde');
} else {
  console.log(`User ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  
  const { data: profile } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', user.id)
    .single();
    
  if (profile) {
    console.log(`\n💰 Balance: ${profile.balance}Ⓐ`);
    console.log(`🧊 Frozen: ${profile.frozen_balance || 0}Ⓐ`);
    console.log(`✅ Disponible: ${profile.balance - (profile.frozen_balance || 0)}Ⓐ`);
  }
}

// 4. Diagnostic
console.log('\n\n🔍 DIAGNOSTIC:');
console.log('='.repeat(80));

if (!txs || txs.length === 0) {
  console.log('\n❌ PROBLÈME 1: Aucune transaction créée');
  console.log('   → La fonction init-moneyfusion-payment n\'a pas été appelée');
  console.log('   → Ou la transaction n\'a pas été sauvegardée en base');
  console.log('\n💡 SOLUTION:');
  console.log('   1. Vérifier que le paiement a bien été initié');
  console.log('   2. Vérifier les logs de init-moneyfusion-payment');
  console.log('   3. Vérifier la connexion réseau');
} else {
  const pendingTx = txs.find(tx => tx.status === 'pending');
  const completedTx = txs.find(tx => tx.status === 'completed');
  
  if (pendingTx) {
    console.log('\n⚠️  PROBLÈME: Transaction en attente (pending)');
    console.log(`   Transaction ID: ${pendingTx.id}`);
    console.log(`   Créée: ${new Date(pendingTx.created_at).toLocaleString('fr-FR')}`);
    console.log('\n   Causes possibles:');
    console.log('   1. Webhook MoneyFusion pas encore reçu');
    console.log('   2. Signature webhook invalide');
    console.log('   3. Webhook reçu mais erreur de traitement');
    console.log('   4. Transaction pas trouvée dans webhook (token mismatch)');
    
    if (!pendingTx.metadata?.activations) {
      console.log('\n   ⚠️  ATTENTION: metadata.activations manquant!');
      console.log('   → Même si webhook arrive, 0 crédit sera ajouté');
    }
    
    if (!pendingTx.metadata?.moneyfusion_token) {
      console.log('\n   ⚠️  ATTENTION: metadata.moneyfusion_token manquant!');
      console.log('   → Webhook ne pourra pas retrouver cette transaction');
    }
    
    console.log('\n💡 ACTIONS À FAIRE:');
    console.log('   1. Vérifier les logs webhook: npx supabase functions logs moneyfusion-webhook');
    console.log('   2. Vérifier le statut du paiement sur MoneyFusion');
    console.log('   3. Re-trigger manuellement si paiement confirmé côté MoneyFusion');
  } else if (completedTx) {
    console.log('\n✅ Transaction marquée comme complétée');
    console.log(`   Transaction ID: ${completedTx.id}`);
    
    // Check if balance was actually updated
    const { data: relatedOps } = await supabase
      .from('balance_operations')
      .select('*')
      .eq('related_transaction_id', completedTx.id);
      
    if (!relatedOps || relatedOps.length === 0) {
      console.log('\n   ⚠️  PROBLÈME: Transaction complétée mais aucune opération balance');
      console.log('   → Le crédit n\'a pas été ajouté au solde');
      console.log('\n💡 SOLUTION:');
      console.log('   1. Vérifier les logs du webhook');
      console.log('   2. Créditer manuellement si nécessaire');
    } else {
      console.log('\n   ✅ Opération balance trouvée, crédit a été ajouté');
      console.log(`   Amount crédité: ${relatedOps[0].amount}Ⓐ`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('Diagnostic terminé\n');
