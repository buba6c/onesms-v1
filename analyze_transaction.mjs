import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const txId = process.argv[2];

if (!txId) {
  console.error('Usage: node analyze_transaction.mjs <transaction_id>');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

const bar = () => console.log('='.repeat(70));

try {
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txId)
    .maybeSingle();

  if (txError) {
    console.error('Erreur transaction:', txError.message);
    process.exit(1);
  }

  if (!tx) {
    console.error('Transaction introuvable');
    process.exit(1);
  }

  console.log('🔍 ANALYSE TRANSACTION');
  console.log(`ID: ${tx.id}`);
  console.log(`Type: ${tx.type}`);
  console.log(`Status: ${tx.status}`);
  console.log(`Amount: ${tx.amount}`);
  console.log(`Balance before: ${tx.balance_before}`);
  console.log(`Balance after: ${tx.balance_after}`);
  console.log(`Reference: ${tx.reference || 'N/A'}`);
  console.log('Metadata:', tx.metadata || {});
  bar();

  const { data: user } = await supabase
    .from('users')
    .select('id,email,balance,frozen_balance,created_at')
    .eq('id', tx.user_id)
    .maybeSingle();

  console.log('👤 Utilisateur:');
  if (user) {
    console.log(`Email: ${user.email}`);
    console.log(`Balance: ${user.balance} Ⓐ | Frozen: ${user.frozen_balance} Ⓐ`);
    console.log(`Membre depuis: ${user.created_at}`);
  } else {
    console.log('Non trouvé');
  }
  bar();

  const { data: ops, error: opsError } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('related_transaction_id', tx.id)
    .order('created_at', { ascending: true });

  if (opsError) {
    console.error('Erreur balance_operations:', opsError.message);
  }

  console.log('💳 Balance operations liées:');
  if (ops && ops.length) {
    ops.forEach((op, i) => {
      console.log(` ${i + 1}. ${op.operation_type} ${op.amount} Ⓐ`);
      console.log(`    reason=${op.reason || 'N/A'} created=${op.created_at}`);
      console.log(`    id=${op.id}`);
    });
  } else {
    console.log(' Aucune');
  }
  bar();

  if (tx.activation_id) {
    const { data: act } = await supabase
      .from('activations')
      .select('id,status,charged,frozen_amount,price,service_code,country_code,provider,operator,phone,created_at,expires_at,sms_received_at,cancelled_at')
      .eq('id', tx.activation_id)
      .maybeSingle();

    console.log('📱 Activation liée:');
    if (act) {
      console.log(`ID: ${act.id}`);
      console.log(`${act.status} | charged=${act.charged} | frozen=${act.frozen_amount} | price=${act.price}`);
      console.log(`service=${act.service_code} ${act.country_code} provider=${act.provider || 'N/A'} operator=${act.operator || 'N/A'}`);
      console.log(`phone=${act.phone || 'N/A'}`);
      console.log(`created=${act.created_at} expires=${act.expires_at}`);
      console.log(`sms_received_at=${act.sms_received_at || 'N/A'} cancelled_at=${act.cancelled_at || 'N/A'}`);
    } else {
      console.log('Non trouvée');
    }
    bar();
  }

  console.log('Terminé');
} catch (err) {
  console.error('Erreur:', err.message);
  process.exit(1);
}
