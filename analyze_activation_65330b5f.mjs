/* eslint-env node */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

const ACTIVATION_ID = process.argv[2];

if (!ACTIVATION_ID) {
  console.error('Usage: node analyze_activation_65330b5f.mjs <activation_id>');
  process.exit(1);
}

console.log('🔍 ANALYSE DÉTAILLÉE DE L\'ACTIVATION\n');
console.log(`ID: ${ACTIVATION_ID}\n`);
console.log('='.repeat(70));

try {
  // 1. Récupérer l'activation complète
  const { data: activation, error: activationError } = await supabase
    .from('activations')
    .select('*')
    .eq('id', ACTIVATION_ID)
    .maybeSingle();

  if (activationError) {
    console.log('❌ Erreur:', activationError.message);
    process.exit(1);
  }

  if (!activation) {
    console.log('❌ Activation non trouvée!');
    process.exit(1);
  }

  console.log('\n📋 INFORMATIONS GÉNÉRALES:\n');
  console.log(`   User ID:        ${activation.user_id}`);
  console.log(`   Provider:       ${activation.provider || 'N/A'}`);
  console.log(`   External ID:    ${activation.external_id || 'N/A'}`);
  console.log(`   Order ID:       ${activation.order_id || 'N/A'}`);

  console.log('\n📱 DÉTAILS SERVICE:\n');
  console.log(`   Service Code:   ${activation.service_code}`);
  console.log(`   Country Code:   ${activation.country_code}`);
  console.log(`   Phone:          ${activation.phone || 'PAS ENCORE REÇU'}`);
  console.log(`   Operator:       ${activation.operator || 'N/A'}`);

  console.log('\n💰 FINANCES:\n');
  console.log(`   Price:          ${activation.price} Ⓐ`);
  console.log(`   Frozen Amount:  ${activation.frozen_amount} Ⓐ`);
  console.log(`   Charged:        ${activation.charged ? 'OUI ✅' : 'NON ❌'}`);

  console.log('\n📊 STATUS & TIMING:\n');
  console.log(`   Status:         ${activation.status.toUpperCase()}`);
  console.log(`   Created At:     ${activation.created_at}`);
  console.log(`   Expires At:     ${activation.expires_at}`);
  console.log(`   SMS Received:   ${activation.sms_received_at || 'Jamais'}`);
  console.log(`   Cancelled At:   ${activation.cancelled_at || 'N/A'}`);
  console.log(`   Updated At:     ${activation.updated_at}`);

  // Calculer si expiré
  const now = new Date();
  const expiresAt = new Date(activation.expires_at);
  const isExpired = now > expiresAt;
  const timeLeft = Math.floor((expiresAt - now) / 60000);

  if (isExpired) {
    const expiredSince = Math.floor((now - expiresAt) / 60000);
    console.log(`\n   ⏰ EXPIRÉ depuis ${expiredSince} minutes`);
  } else {
    console.log(`\n   ⏰ Expire dans ${timeLeft} minutes`);
  }

  console.log('\n📨 SMS REÇU:\n');
  if (activation.sms_code || activation.sms_text) {
    console.log(`   Code:           ${activation.sms_code || 'N/A'}`);
    console.log(`   Text:           ${activation.sms_text || 'N/A'}`);
  } else {
    console.log('   ❌ Aucun SMS reçu');
  }

  // 2. Vérifier l'utilisateur
  console.log('\n' + '='.repeat(70));
  console.log('\n👤 UTILISATEUR:\n');

  const { data: user } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance, created_at')
    .eq('id', activation.user_id)
    .single();

  if (user) {
    console.log(`   Email:          ${user.email}`);
    console.log(`   Balance:        ${user.balance} Ⓐ`);
    console.log(`   Frozen:         ${user.frozen_balance} Ⓐ`);
    console.log(`   Disponible:     ${parseFloat(user.balance) - parseFloat(user.frozen_balance)} Ⓐ`);
    console.log(`   Membre depuis:  ${user.created_at}`);
  } else {
    console.log('   ⚠️ Utilisateur non trouvé');
  }

  // 3. Historique des operations
  console.log('\n' + '='.repeat(70));
  console.log('\n💳 OPÉRATIONS DE BALANCE:\n');

  const { data: operations } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('activation_id', ACTIVATION_ID)
    .order('created_at', { ascending: true });

  if (operations && operations.length > 0) {
    operations.forEach((op, i) => {
      const sign = op.operation_type === 'freeze' || op.operation_type === 'charge' ? '-' : '+';
      console.log(`   ${i + 1}. [${op.operation_type.toUpperCase()}] ${sign}${op.amount} Ⓐ`);
      console.log(`      Raison: ${op.reason || 'N/A'}`);
      console.log(`      Date: ${op.created_at}`);
      console.log(`      ID: ${op.id}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ Aucune opération trouvée');
  }

  // 4. Historique des transactions
  console.log('='.repeat(70));
  console.log('\n💸 TRANSACTIONS LIÉES:\n');

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('activation_id', ACTIVATION_ID)
    .order('created_at', { ascending: true });

  if (transactions && transactions.length > 0) {
    transactions.forEach((tx, i) => {
      console.log(`   ${i + 1}. [${tx.type.toUpperCase()}] ${tx.amount} Ⓐ`);
      console.log(`      Status: ${tx.status}`);
      console.log(`      Description: ${tx.description || 'N/A'}`);
      console.log(`      Date: ${tx.created_at}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ Aucune transaction trouvée');
  }

  // 5. DIAGNOSTIC
  console.log('='.repeat(70));
  console.log('\n🔧 DIAGNOSTIC:\n');

  const issues = [];

  // Check 1: Frozen amount vs status
  if (activation.status === 'timeout' && parseFloat(activation.frozen_amount) > 0) {
    issues.push('❌ Status=timeout mais frozen_amount > 0 (tokens non libérés!)');
  }

  if (activation.status === 'received' && parseFloat(activation.frozen_amount) > 0) {
    issues.push('❌ Status=received mais frozen_amount > 0 (pas chargé!)');
  }

  if (activation.status === 'cancelled' && parseFloat(activation.frozen_amount) > 0) {
    issues.push('❌ Status=cancelled mais frozen_amount > 0 (pas remboursé!)');
  }

  // Check 2: Expiration
  if (isExpired && activation.status === 'pending') {
    issues.push('❌ Activation expirée mais toujours en status "pending"!');
  }

  // Check 3: Charged flag
  if (activation.status === 'received' && !activation.charged) {
    issues.push('⚠️ SMS reçu mais pas marqué comme "charged"');
  }

  // Check 4: Balance operations
  const freezeOps = operations?.filter(op => op.operation_type === 'freeze') || [];
  const unfreezeOps = operations?.filter(op => op.operation_type === 'unfreeze') || [];
  const chargeOps = operations?.filter(op => op.operation_type === 'charge') || [];
  const refundOps = operations?.filter(op => op.operation_type === 'refund') || [];

  if (freezeOps.length === 0) {
    issues.push('⚠️ Aucune opération de freeze (balance jamais gelée?)');
  }

  if (activation.status === 'received' && chargeOps.length === 0) {
    issues.push('❌ SMS reçu mais aucune opération de charge!');
  }

  if ((activation.status === 'timeout' || activation.status === 'cancelled') && refundOps.length === 0 && unfreezeOps.length === 0) {
    issues.push('❌ Activation expirée/annulée mais aucun refund/unfreeze!');
  }

  // Check 5: User balance health
  if (user) {
    const totalFrozenActivations = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', user.id);

    if (totalFrozenActivations.data) {
      const sumFrozen = totalFrozenActivations.data.reduce((sum, a) => sum + parseFloat(a.frozen_amount), 0);
      const userFrozen = parseFloat(user.frozen_balance);

      if (Math.abs(sumFrozen - userFrozen) > 0.01) {
        issues.push(`❌ Incohérence: User frozen_balance=${userFrozen} mais sum(activations.frozen_amount)=${sumFrozen}`);
      }
    }
  }

  if (issues.length > 0) {
    console.log('   🚨 PROBLÈMES DÉTECTÉS:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('   ✅ Aucun problème détecté - Activation saine');
  }

  // 6. RECOMMANDATIONS
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 RECOMMANDATIONS:\n');

  if (activation.status === 'timeout' && parseFloat(activation.frozen_amount) > 0) {
    console.log('   🔧 ACTION REQUISE:');
    console.log(`   → Exécuter: SELECT secure_unfreeze_balance('${activation.user_id}', '${ACTIVATION_ID}', true, 'Manual timeout fix');`);
  } else if (activation.status === 'received' && parseFloat(activation.frozen_amount) > 0 && !activation.charged) {
    console.log('   🔧 ACTION REQUISE:');
    console.log(`   → Marquer comme chargé et débiter la balance`);
  } else if (isExpired && activation.status === 'pending') {
    console.log('   🔧 ACTION REQUISE:');
    console.log(`   → Appeler cleanup-expired-activations ou process_expired_activations()`);
  } else {
    console.log('   ✅ Aucune action nécessaire');
  }

  console.log('\n' + '='.repeat(70));

} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.error(err.stack);
}
