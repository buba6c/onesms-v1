import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'aws-1-eu-central-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.htfqmamvmhdoixqcbbbw',
  password: 'Workeverytime@4##',
  ssl: { rejectUnauthorized: false }
});

console.log('🧪 TEST COMPLET SCENARIOS WALLET ATOMIQUE\n');
console.log('='.repeat(80));

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'; // buba6c

async function testAllScenarios() {
  await client.connect();
  
  console.log('\n📊 ÉTAT INITIAL');
  console.log('-'.repeat(80));
  
  const { rows: initialUser } = await client.query(`
    SELECT balance, frozen_balance FROM users WHERE id = $1
  `, [userId]);
  
  console.log(`Balance: ${initialUser[0].balance} XOF`);
  console.log(`Frozen: ${initialUser[0].frozen_balance} XOF`);
  
  // ========================================
  // SCENARIO 1: ACTIVATION REÇOIT SMS
  // ========================================
  console.log('\n\n🧪 SCÉNARIO 1: ACTIVATION REÇOIT SMS');
  console.log('='.repeat(80));
  console.log('✅ ATTENDU: atomic_commit appelé, frozen libéré, balance débitée, SMS affiché\n');
  
  const { rows: activationsReceived } = await client.query(`
    SELECT 
      a.id,
      a.order_id,
      a.status,
      a.frozen_amount,
      a.price,
      a.charged,
      a.sms_code,
      a.sms_text,
      u.balance,
      u.frozen_balance,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id AND operation_type = 'commit') as has_commit,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id) as total_ops
    FROM activations a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id = $1
      AND a.status = 'received'
      AND a.sms_code IS NOT NULL
    ORDER BY a.created_at DESC
    LIMIT 5
  `, [userId]);
  
  console.log(`📋 ${activationsReceived.length} activations "received" avec SMS:\n`);
  
  let scenario1Pass = 0;
  let scenario1Fail = 0;
  
  for (const act of activationsReceived) {
    const hasCommit = parseInt(act.has_commit) > 0;
    const frozenLibere = parseFloat(act.frozen_amount) === 0;
    const charged = act.charged === true;
    const hasSMS = act.sms_code !== null;
    
    const allGood = hasCommit && frozenLibere && charged && hasSMS;
    
    console.log(`${allGood ? '✅' : '❌'} ${act.order_id}:`);
    console.log(`   SMS: ${hasSMS ? '✅ ' + act.sms_code : '❌ MANQUANT'}`);
    console.log(`   atomic_commit: ${hasCommit ? '✅ appelé' : '❌ MANQUANT'}`);
    console.log(`   Frozen libéré: ${frozenLibere ? '✅ 0 XOF' : '❌ ' + act.frozen_amount + ' XOF bloqué'}`);
    console.log(`   Charged: ${charged ? '✅ true' : '❌ false'}`);
    console.log(`   Balance operations: ${act.total_ops}`);
    
    if (allGood) scenario1Pass++;
    else scenario1Fail++;
    console.log('');
  }
  
  console.log(`📊 Résultat: ${scenario1Pass} ✅ / ${scenario1Fail} ❌`);
  
  // ========================================
  // SCENARIO 2: ACTIVATION TIMEOUT (PAS DE SMS)
  // ========================================
  console.log('\n\n🧪 SCÉNARIO 2: ACTIVATION TIMEOUT (PAS DE SMS)');
  console.log('='.repeat(80));
  console.log('✅ ATTENDU: atomic_refund appelé, frozen libéré, balance non débitée\n');
  
  const { rows: activationsTimeout } = await client.query(`
    SELECT 
      a.id,
      a.order_id,
      a.status,
      a.frozen_amount,
      a.charged,
      a.sms_code,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id AND operation_type = 'refund') as has_refund,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id) as total_ops
    FROM activations a
    WHERE a.user_id = $1
      AND a.status = 'timeout'
    ORDER BY a.created_at DESC
    LIMIT 5
  `, [userId]);
  
  console.log(`📋 ${activationsTimeout.length} activations "timeout":\n`);
  
  let scenario2Pass = 0;
  let scenario2Fail = 0;
  
  for (const act of activationsTimeout) {
    const hasRefund = parseInt(act.has_refund) > 0;
    const frozenLibere = parseFloat(act.frozen_amount) === 0;
    const notCharged = act.charged === false;
    const noSMS = act.sms_code === null;
    
    const allGood = hasRefund && frozenLibere && notCharged && noSMS;
    
    console.log(`${allGood ? '✅' : '❌'} ${act.order_id}:`);
    console.log(`   Pas de SMS: ${noSMS ? '✅' : '❌ SMS présent'}`);
    console.log(`   atomic_refund: ${hasRefund ? '✅ appelé' : '❌ MANQUANT'}`);
    console.log(`   Frozen libéré: ${frozenLibere ? '✅ 0 XOF' : '❌ ' + act.frozen_amount + ' XOF bloqué'}`);
    console.log(`   Pas charged: ${notCharged ? '✅ false' : '❌ true'}`);
    console.log(`   Balance operations: ${act.total_ops}`);
    
    if (allGood) scenario2Pass++;
    else scenario2Fail++;
    console.log('');
  }
  
  console.log(`📊 Résultat: ${scenario2Pass} ✅ / ${scenario2Fail} ❌`);
  
  // ========================================
  // SCENARIO 3: ACTIVATION CANCELLED
  // ========================================
  console.log('\n\n🧪 SCÉNARIO 3: ACTIVATION CANCELLED');
  console.log('='.repeat(80));
  console.log('✅ ATTENDU: atomic_refund appelé, frozen libéré\n');
  
  const { rows: activationsCancelled } = await client.query(`
    SELECT 
      a.id,
      a.order_id,
      a.status,
      a.frozen_amount,
      a.charged,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id AND operation_type = 'refund') as has_refund,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id) as total_ops
    FROM activations a
    WHERE a.user_id = $1
      AND a.status = 'cancelled'
    ORDER BY a.created_at DESC
    LIMIT 5
  `, [userId]);
  
  console.log(`📋 ${activationsCancelled.length} activations "cancelled":\n`);
  
  let scenario3Pass = 0;
  let scenario3Fail = 0;
  
  for (const act of activationsCancelled) {
    const hasRefund = parseInt(act.has_refund) > 0;
    const frozenLibere = parseFloat(act.frozen_amount) === 0;
    const notCharged = act.charged === false;
    
    const allGood = hasRefund && frozenLibere && notCharged;
    
    console.log(`${allGood ? '✅' : '❌'} ${act.order_id}:`);
    console.log(`   atomic_refund: ${hasRefund ? '✅ appelé' : '❌ MANQUANT'}`);
    console.log(`   Frozen libéré: ${frozenLibere ? '✅ 0 XOF' : '❌ ' + act.frozen_amount + ' XOF bloqué'}`);
    console.log(`   Pas charged: ${notCharged ? '✅ false' : '❌ true'}`);
    console.log(`   Balance operations: ${act.total_ops}`);
    
    if (allGood) scenario3Pass++;
    else scenario3Fail++;
    console.log('');
  }
  
  console.log(`📊 Résultat: ${scenario3Pass} ✅ / ${scenario3Fail} ❌`);
  
  // ========================================
  // SCENARIO 4: RENTAL ACTIF AVEC SMS
  // ========================================
  console.log('\n\n🧪 SCÉNARIO 4: RENTAL ACTIF AVEC SMS');
  console.log('='.repeat(80));
  console.log('✅ ATTENDU: SMS reçus, PAS de refund, frozen reste\n');
  
  const { rows: rentalsActive } = await client.query(`
    SELECT 
      r.id,
      r.phone_number,
      r.status,
      r.frozen_amount,
      r.price,
      (SELECT COUNT(*) FROM rental_messages WHERE rental_id = r.id) as message_count,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id AND operation_type = 'refund') as has_refund,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id) as total_ops
    FROM rentals r
    WHERE r.user_id = $1
      AND r.status = 'active'
    ORDER BY r.created_at DESC
    LIMIT 5
  `, [userId]);
  
  console.log(`📋 ${rentalsActive.length} rentals "active":\n`);
  
  let scenario4Pass = 0;
  let scenario4Fail = 0;
  
  for (const rental of rentalsActive) {
    const hasSMS = parseInt(rental.message_count) > 0;
    const noRefund = parseInt(rental.has_refund) === 0;
    const frozenPresent = parseFloat(rental.frozen_amount) > 0;
    
    const allGood = noRefund && frozenPresent;
    
    console.log(`${allGood ? '✅' : '❌'} ${rental.phone_number}:`);
    console.log(`   SMS reçus: ${hasSMS ? '✅ ' + rental.message_count : '⚠️  0'}`);
    console.log(`   PAS de refund: ${noRefund ? '✅' : '❌ refund présent'}`);
    console.log(`   Frozen présent: ${frozenPresent ? '✅ ' + rental.frozen_amount + ' XOF' : '❌ 0 XOF'}`);
    console.log(`   Balance operations: ${rental.total_ops}`);
    
    if (allGood) scenario4Pass++;
    else scenario4Fail++;
    console.log('');
  }
  
  console.log(`📊 Résultat: ${scenario4Pass} ✅ / ${scenario4Fail} ❌`);
  
  // ========================================
  // SCENARIO 5: RENTAL EXPIRED
  // ========================================
  console.log('\n\n🧪 SCÉNARIO 5: RENTAL EXPIRED (AVEC OU SANS SMS)');
  console.log('='.repeat(80));
  console.log('✅ ATTENDU: atomic_commit appelé, frozen libéré, balance débitée (PAS de refund)\n');
  
  const { rows: rentalsExpired } = await client.query(`
    SELECT 
      r.id,
      r.phone_number,
      r.status,
      r.frozen_amount,
      (SELECT COUNT(*) FROM rental_messages WHERE rental_id = r.id) as message_count,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id AND operation_type = 'commit') as has_commit,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id AND operation_type = 'refund') as has_refund,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id) as total_ops
    FROM rentals r
    WHERE r.user_id = $1
      AND r.status = 'expired'
    ORDER BY r.created_at DESC
    LIMIT 5
  `, [userId]);
  
  console.log(`📋 ${rentalsExpired.length} rentals "expired":\n`);
  
  let scenario5Pass = 0;
  let scenario5Fail = 0;
  
  for (const rental of rentalsExpired) {
    const hasCommit = parseInt(rental.has_commit) > 0;
    const noRefund = parseInt(rental.has_refund) === 0;
    const frozenLibere = parseFloat(rental.frozen_amount) === 0;
    
    const allGood = hasCommit && noRefund && frozenLibere;
    
    console.log(`${allGood ? '✅' : '❌'} ${rental.phone_number}:`);
    console.log(`   SMS reçus: ${parseInt(rental.message_count)}`);
    console.log(`   atomic_commit: ${hasCommit ? '✅ appelé' : '❌ MANQUANT'}`);
    console.log(`   PAS de refund: ${noRefund ? '✅' : '❌ refund présent'}`);
    console.log(`   Frozen libéré: ${frozenLibere ? '✅ 0 XOF' : '❌ ' + rental.frozen_amount + ' XOF'}`);
    console.log(`   Balance operations: ${rental.total_ops}`);
    
    if (allGood) scenario5Pass++;
    else scenario5Fail++;
    console.log('');
  }
  
  console.log(`📊 Résultat: ${scenario5Pass} ✅ / ${scenario5Fail} ❌`);
  
  // ========================================
  // SCENARIO 6: RENTAL CANCELLED <20 MIN SANS SMS
  // ========================================
  console.log('\n\n🧪 SCÉNARIO 6: RENTAL CANCELLED <20 MIN SANS SMS');
  console.log('='.repeat(80));
  console.log('✅ ATTENDU: atomic_refund appelé, frozen libéré\n');
  
  const { rows: rentalsCancelled } = await client.query(`
    SELECT 
      r.id,
      r.phone_number,
      r.status,
      r.frozen_amount,
      r.created_at,
      r.updated_at,
      EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) / 60 as duration_minutes,
      (SELECT COUNT(*) FROM rental_messages WHERE rental_id = r.id) as message_count,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id AND operation_type = 'refund') as has_refund,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id) as total_ops
    FROM rentals r
    WHERE r.user_id = $1
      AND r.status = 'cancelled'
    ORDER BY r.created_at DESC
    LIMIT 10
  `, [userId]);
  
  console.log(`📋 ${rentalsCancelled.length} rentals "cancelled":\n`);
  
  let scenario6Pass = 0;
  let scenario6Fail = 0;
  
  for (const rental of rentalsCancelled) {
    const cancelledEarly = parseFloat(rental.duration_minutes) < 20;
    const noSMS = parseInt(rental.message_count) === 0;
    const hasRefund = parseInt(rental.has_refund) > 0;
    const frozenLibere = parseFloat(rental.frozen_amount) === 0;
    
    const shouldRefund = cancelledEarly && noSMS;
    const allGood = shouldRefund ? (hasRefund && frozenLibere) : true;
    
    console.log(`${allGood ? '✅' : '❌'} ${rental.phone_number || 'N/A'}:`);
    console.log(`   Durée: ${Math.floor(parseFloat(rental.duration_minutes))} min ${cancelledEarly ? '(<20)' : '(>20)'}`);
    console.log(`   SMS: ${noSMS ? 'Non' : 'Oui (' + rental.message_count + ')'}`);
    console.log(`   Devrait refund: ${shouldRefund ? 'Oui' : 'Non'}`);
    console.log(`   atomic_refund: ${hasRefund ? '✅ appelé' : (shouldRefund ? '❌ MANQUANT' : '✅ pas nécessaire')}`);
    console.log(`   Frozen: ${rental.frozen_amount} XOF`);
    console.log(`   Balance operations: ${rental.total_ops}`);
    
    if (allGood) scenario6Pass++;
    else scenario6Fail++;
    console.log('');
  }
  
  console.log(`📊 Résultat: ${scenario6Pass} ✅ / ${scenario6Fail} ❌`);
  
  // ========================================
  // RÉSUMÉ FINAL
  // ========================================
  console.log('\n\n📊 RÉSUMÉ FINAL');
  console.log('='.repeat(80));
  
  const totalPass = scenario1Pass + scenario2Pass + scenario3Pass + scenario4Pass + scenario5Pass + scenario6Pass;
  const totalFail = scenario1Fail + scenario2Fail + scenario3Fail + scenario4Fail + scenario5Fail + scenario6Fail;
  const totalTests = totalPass + totalFail;
  
  console.log(`\n✅ Tests réussis: ${totalPass}/${totalTests}`);
  console.log(`❌ Tests échoués: ${totalFail}/${totalTests}`);
  console.log('');
  console.log('Détail par scénario:');
  console.log(`  1. Activation reçoit SMS: ${scenario1Pass} ✅ / ${scenario1Fail} ❌`);
  console.log(`  2. Activation timeout: ${scenario2Pass} ✅ / ${scenario2Fail} ❌`);
  console.log(`  3. Activation cancelled: ${scenario3Pass} ✅ / ${scenario3Fail} ❌`);
  console.log(`  4. Rental actif avec SMS: ${scenario4Pass} ✅ / ${scenario4Fail} ❌`);
  console.log(`  5. Rental expired: ${scenario5Pass} ✅ / ${scenario5Fail} ❌`);
  console.log(`  6. Rental cancelled <20min: ${scenario6Pass} ✅ / ${scenario6Fail} ❌`);
  
  if (totalFail > 0) {
    console.log('\n⚠️  PROBLÈMES DÉTECTÉS À CORRIGER');
  } else {
    console.log('\n🎉 TOUS LES SCÉNARIOS SONT CORRECTS !');
  }
  
  await client.end();
}

testAllScenarios().catch(console.error);
