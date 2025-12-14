#!/usr/bin/env node
/* eslint-env node */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for full access
);

const targetId = '96f0a369-138f-4207-a435-119440ca18e5';

console.log('🔍 ANALYSE APPROFONDIE DE:', targetId);
console.log('='.repeat(80));

// 1. Check if it's a user
console.log('\n1️⃣ VÉRIFICATION UTILISATEUR...\n');
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', targetId)
  .single();

if (user) {
  console.log('✅ UTILISATEUR TROUVÉ');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Name:', user.name || 'N/A');
  console.log('   Balance:', user.balance, 'Ⓐ');
  console.log('   Frozen Balance:', user.frozen_balance || 0, 'Ⓐ');
  console.log('   Disponible:', (user.balance || 0) - (user.frozen_balance || 0), 'Ⓐ');
  console.log('   Created:', new Date(user.created_at).toLocaleString('fr-FR'));
  console.log('   Role:', user.role || 'user');
} else {
  console.log('❌ Pas un utilisateur');
}

// 2. Check if it's a transaction
console.log('\n2️⃣ VÉRIFICATION TRANSACTION...\n');
const { data: transaction } = await supabase
  .from('transactions')
  .select('*')
  .eq('id', targetId)
  .single();

if (transaction) {
  console.log('✅ TRANSACTION TROUVÉE');
  console.log('   ID:', transaction.id);
  console.log('   User ID:', transaction.user_id);
  console.log('   Type:', transaction.type);
  console.log('   Amount:', transaction.amount, 'Ⓐ');
  console.log('   Status:', transaction.status);
  console.log('   Payment Method:', transaction.payment_method || 'N/A');
  console.log('   Reference:', transaction.reference || transaction.payment_ref || 'N/A');
  console.log('   Description:', transaction.description || 'N/A');
  console.log('   Created:', new Date(transaction.created_at).toLocaleString('fr-FR'));
  
  if (transaction.metadata) {
    console.log('\n   📋 Metadata:');
    console.log(JSON.stringify(transaction.metadata, null, 6));
  }
  
  // Check related balance operations
  const { data: ops } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('related_transaction_id', transaction.id)
    .order('created_at', { ascending: false });
  
  if (ops && ops.length > 0) {
    console.log('\n   💵 Opérations Balance Associées:', ops.length);
    ops.forEach((op, i) => {
      console.log(`\n   ${i + 1}. ${op.operation_type.toUpperCase()}`);
      console.log(`      Amount: ${op.amount}Ⓐ`);
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}`);
      console.log(`      Frozen: ${op.frozen_before || 0} → ${op.frozen_after || 0}`);
      console.log(`      Reason: ${op.reason}`);
      console.log(`      Created: ${new Date(op.created_at).toLocaleString('fr-FR')}`);
    });
  } else {
    console.log('\n   ⚠️  Aucune opération balance associée');
  }
} else {
  console.log('❌ Pas une transaction');
}

// 3. Check if it's an activation
console.log('\n3️⃣ VÉRIFICATION ACTIVATION...\n');
const { data: activation } = await supabase
  .from('activations')
  .select('*')
  .eq('id', targetId)
  .single();

if (activation) {
  console.log('✅ ACTIVATION TROUVÉE');
  console.log('   ID:', activation.id);
  console.log('   User ID:', activation.user_id);
  console.log('   Order ID:', activation.order_id);
  console.log('   Phone:', activation.phone);
  console.log('   Service:', activation.service_code);
  console.log('   Country:', activation.country_code);
  console.log('   Status:', activation.status);
  console.log('   Price:', activation.price, 'Ⓐ');
  console.log('   Charged:', activation.charged ? '✅' : '❌');
  console.log('   Frozen Amount:', activation.frozen_amount || 0, 'Ⓐ');
  console.log('   SMS Code:', activation.sms_code || 'N/A');
  console.log('   SMS Text:', activation.sms_text || 'N/A');
  console.log('   Created:', new Date(activation.created_at).toLocaleString('fr-FR'));
  console.log('   Expires:', new Date(activation.expires_at).toLocaleString('fr-FR'));
  
  const now = new Date();
  const expires = new Date(activation.expires_at);
  const isExpired = now > expires;
  console.log('   Expired:', isExpired ? '⏰ OUI' : '✅ NON');
  
  if (!isExpired) {
    const remainingMs = expires.getTime() - now.getTime();
    const remainingMin = Math.floor(remainingMs / 60000);
    console.log('   Temps restant:', remainingMin, 'minutes');
  }
  
  // Check related balance operations
  const { data: activOps } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('activation_id', activation.id)
    .order('created_at', { ascending: false });
  
  if (activOps && activOps.length > 0) {
    console.log('\n   💵 Opérations Balance:', activOps.length);
    activOps.forEach((op, i) => {
      console.log(`\n   ${i + 1}. ${op.operation_type.toUpperCase()}`);
      console.log(`      Amount: ${op.amount}Ⓐ`);
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}`);
      console.log(`      Frozen: ${op.frozen_before || 0} → ${op.frozen_after || 0}`);
      console.log(`      Reason: ${op.reason}`);
    });
  }
} else {
  console.log('❌ Pas une activation');
}

// 4. Check if it's a rental
console.log('\n4️⃣ VÉRIFICATION RENTAL...\n');
const { data: rental } = await supabase
  .from('rentals')
  .select('*')
  .eq('id', targetId)
  .single();

if (rental) {
  console.log('✅ RENTAL TROUVÉ');
  console.log('   ID:', rental.id);
  console.log('   User ID:', rental.user_id);
  console.log('   Rental ID:', rental.rental_id);
  console.log('   Phone:', rental.phone);
  console.log('   Service:', rental.service_code);
  console.log('   Country:', rental.country_code);
  console.log('   Status:', rental.status);
  console.log('   Total Cost:', rental.total_cost || rental.price, 'Ⓐ');
  console.log('   Frozen Amount:', rental.frozen_amount || 0, 'Ⓐ');
  console.log('   Duration:', rental.duration_hours || rental.rent_hours, 'heures');
  console.log('   Messages:', rental.message_count || 0);
  console.log('   Created:', new Date(rental.created_at).toLocaleString('fr-FR'));
  console.log('   Expires:', new Date(rental.expires_at || rental.end_date).toLocaleString('fr-FR'));
  
  // Check related balance operations
  const { data: rentOps } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('rental_id', rental.id)
    .order('created_at', { ascending: false });
  
  if (rentOps && rentOps.length > 0) {
    console.log('\n   💵 Opérations Balance:', rentOps.length);
    rentOps.forEach((op, i) => {
      console.log(`\n   ${i + 1}. ${op.operation_type.toUpperCase()}`);
      console.log(`      Amount: ${op.amount}Ⓐ`);
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}`);
      console.log(`      Frozen: ${op.frozen_before || 0} → ${op.frozen_after || 0}`);
      console.log(`      Reason: ${op.reason}`);
    });
  }
} else {
  console.log('❌ Pas un rental');
}

// 5. If it's a user, get their activity
if (user) {
  console.log('\n\n5️⃣ ACTIVITÉ UTILISATEUR (30 derniers jours)...\n');
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  // Transactions
  const { data: userTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('💰 TRANSACTIONS RÉCENTES:', userTxs?.length || 0);
  if (userTxs && userTxs.length > 0) {
    userTxs.forEach((tx, i) => {
      console.log(`\n   ${i + 1}. ${tx.type.toUpperCase()} - ${tx.status}`);
      console.log(`      Amount: ${tx.amount}Ⓐ`);
      console.log(`      Date: ${new Date(tx.created_at).toLocaleString('fr-FR')}`);
      console.log(`      Ref: ${tx.reference || tx.payment_ref || 'N/A'}`);
    });
  }
  
  // Activations
  const { data: userActs } = await supabase
    .from('activations')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n📱 ACTIVATIONS RÉCENTES:', userActs?.length || 0);
  if (userActs && userActs.length > 0) {
    const byStatus = {
      pending: 0,
      received: 0,
      completed: 0,
      expired: 0,
      cancelled: 0,
      timeout: 0
    };
    
    userActs.forEach(act => {
      byStatus[act.status] = (byStatus[act.status] || 0) + 1;
    });
    
    console.log('   Par statut:');
    Object.entries(byStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`      ${status}: ${count}`);
      }
    });
    
    console.log('\n   Dernières:');
    userActs.slice(0, 5).forEach((act, i) => {
      console.log(`   ${i + 1}. ${act.service_code} ${act.country_code} - ${act.status} - ${act.phone}`);
    });
  }
  
  // Rentals
  const { data: userRents } = await supabase
    .from('rentals')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n🏠 RENTALS RÉCENTS:', userRents?.length || 0);
  if (userRents && userRents.length > 0) {
    userRents.slice(0, 5).forEach((rent, i) => {
      console.log(`   ${i + 1}. ${rent.service_code} ${rent.country_code} - ${rent.status} - ${rent.phone}`);
    });
  }
  
  // Balance operations
  const { data: userOps } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n💵 OPÉRATIONS BALANCE RÉCENTES:', userOps?.length || 0);
  if (userOps && userOps.length > 0) {
    console.log('   Dernières:');
    userOps.slice(0, 5).forEach((op, i) => {
      console.log(`   ${i + 1}. ${op.operation_type} ${op.amount}Ⓐ - ${op.reason}`);
    });
  }
  
  // Calculate totals
  const totalCredit = userOps?.filter(op => op.operation_type.includes('credit')).reduce((sum, op) => sum + op.amount, 0) || 0;
  const totalDebit = userOps?.filter(op => op.operation_type.includes('debit')).reduce((sum, op) => sum + op.amount, 0) || 0;
  const totalFreeze = userOps?.filter(op => op.operation_type === 'freeze').reduce((sum, op) => sum + op.amount, 0) || 0;
  const totalCommit = userOps?.filter(op => op.operation_type === 'commit').reduce((sum, op) => sum + op.amount, 0) || 0;
  const totalRefund = userOps?.filter(op => op.operation_type === 'refund').reduce((sum, op) => sum + op.amount, 0) || 0;
  
  console.log('\n📊 STATISTIQUES (30 derniers jours):');
  console.log(`   Total crédits: ${totalCredit}Ⓐ`);
  console.log(`   Total débits: ${totalDebit}Ⓐ`);
  console.log(`   Total freeze: ${totalFreeze}Ⓐ`);
  console.log(`   Total commit: ${totalCommit}Ⓐ`);
  console.log(`   Total refund: ${totalRefund}Ⓐ`);
}

console.log('\n' + '='.repeat(80));
console.log('Analyse terminée\n');
