#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 RECHERCHE TRANSACTIONS RÉCENTES (2 dernières heures)\n');
console.log('='.repeat(80));

// Check last 2 hours
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

const { data: txs, error } = await supabase
  .from('transactions')
  .select('*')
  .gte('created_at', twoHoursAgo)
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

if (!txs || txs.length === 0) {
  console.log('❌ Aucune transaction trouvée dans les 2 dernières heures');
} else {
  console.log(`✅ ${txs.length} transaction(s) trouvée(s)\n`);
  
  // Filter for recharge/deposit type
  const rechargeTxs = txs.filter(tx => 
    tx.type === 'recharge' || 
    tx.type === 'deposit' || 
    tx.type === 'topup' ||
    tx.type === 'credit'
  );
  
  if (rechargeTxs.length === 0) {
    console.log('⚠️  Aucune transaction de recharge trouvée\n');
    console.log('Autres types de transactions:');
    txs.slice(0, 5).forEach((tx, i) => {
      console.log(`   ${i+1}. ${tx.type} - ${tx.status} - ${new Date(tx.created_at).toLocaleString('fr-FR')}`);
    });
  } else {
    console.log('💰 TRANSACTIONS DE RECHARGE:\n');
    
    rechargeTxs.forEach((tx, i) => {
      const time = new Date(tx.created_at).toLocaleString('fr-FR');
      const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / 60000);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔹 Transaction ${i + 1} (il y a ${timeAgo} minutes)`);
      console.log(`${'='.repeat(80)}`);
      console.log(`   ID: ${tx.id}`);
      console.log(`   User ID: ${tx.user_id}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ${tx.amount}Ⓐ`);
      
      // Status with icon
      let statusIcon = '⏳';
      if (tx.status === 'completed') statusIcon = '✅';
      if (tx.status === 'failed') statusIcon = '❌';
      console.log(`   Status: ${tx.status} ${statusIcon}`);
      
      console.log(`   Created: ${time}`);
      console.log(`   Reference: ${tx.reference || tx.payment_ref || 'N/A'}`);
      
      if (tx.metadata) {
        console.log('\n   📋 Metadata:');
        console.log(`      - MoneyFusion Token: ${tx.metadata.moneyfusion_token || 'N/A'}`);
        console.log(`      - Activations: ${tx.metadata.activations || 'N/A'} Ⓐ`);
        console.log(`      - Amount XOF: ${tx.metadata.amount_xof || 'N/A'} FCFA`);
        console.log(`      - Provider: ${tx.metadata.payment_provider || tx.metadata.provider || 'N/A'}`);
        console.log(`      - Checkout URL: ${tx.metadata.checkout_url ? 'Présent' : 'N/A'}`);
      }
      
      // Diagnostic
      if (tx.status === 'pending') {
        console.log('\n   ⚠️  PROBLÈME: Transaction en attente');
        console.log('   Raisons possibles:');
        console.log('      1. Paiement pas encore effectué sur MoneyFusion');
        console.log('      2. Webhook pas encore reçu');
        console.log('      3. Webhook reçu mais a échoué');
        
        if (!tx.metadata?.activations || tx.metadata.activations === 0) {
          console.log('\n   🚨 ALERTE CRITIQUE: metadata.activations manquant ou = 0');
          console.log('      → Même si webhook arrive, 0 crédit sera ajouté!');
        }
        
        if (!tx.metadata?.moneyfusion_token) {
          console.log('\n   🚨 ALERTE: metadata.moneyfusion_token manquant');
          console.log('      → Webhook ne pourra pas identifier cette transaction');
        }
      } else if (tx.status === 'completed') {
        console.log('\n   ✅ Transaction complétée avec succès');
      } else if (tx.status === 'failed') {
        console.log('\n   ❌ Transaction échouée');
      }
    });
  }
}

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('📊 RÉSUMÉ');
console.log('='.repeat(80));

const pending = txs?.filter(tx => tx.status === 'pending' && ['recharge', 'deposit', 'topup', 'credit'].includes(tx.type)).length || 0;
const completed = txs?.filter(tx => tx.status === 'completed' && ['recharge', 'deposit', 'topup', 'credit'].includes(tx.type)).length || 0;
const failed = txs?.filter(tx => tx.status === 'failed' && ['recharge', 'deposit', 'topup', 'credit'].includes(tx.type)).length || 0;

console.log(`Recharges en attente: ${pending}`);
console.log(`Recharges complétées: ${completed}`);
console.log(`Recharges échouées: ${failed}`);

if (pending > 0) {
  console.log('\n💡 ACTIONS RECOMMANDÉES:');
  console.log('   1. Vérifier le statut du paiement sur MoneyFusion');
  console.log('   2. Vérifier les logs webhook: https://supabase.com/dashboard/project/.../functions');
  console.log('   3. Si paiement confirmé, re-trigger le webhook manuellement');
}

console.log('\n' + '='.repeat(80));
