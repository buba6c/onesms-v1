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

console.log('🔬 ANALYSE DEEP: POURQUOI 55 XOF FROZEN ?\n');
console.log('='.repeat(80));

async function analyzeDeep() {
  await client.connect();
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'; // buba6c@gmail.com
  
  // 1. ÉTAT ACTUEL USER
  console.log('\n📊 1. ÉTAT ACTUEL USER');
  console.log('-'.repeat(80));
  
  const { rows: user } = await client.query(`
    SELECT 
      id,
      email,
      balance,
      frozen_balance,
      created_at
    FROM users
    WHERE id = $1
  `, [userId]);
  
  console.log(`User: ${user[0].email}`);
  console.log(`Balance: ${user[0].balance} XOF`);
  console.log(`Frozen: ${user[0].frozen_balance} XOF`);
  console.log(`Créé: ${new Date(user[0].created_at).toLocaleString('fr-FR')}`);
  
  // 2. TOUTES LES ACTIVATIONS AVEC FROZEN > 0
  console.log('\n\n📊 2. ACTIVATIONS AVEC FROZEN_AMOUNT > 0');
  console.log('-'.repeat(80));
  
  const { rows: activationsWithFrozen } = await client.query(`
    SELECT 
      id,
      order_id,
      service_code,
      status,
      price,
      frozen_amount,
      charged,
      sms_code,
      created_at,
      updated_at,
      (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id) as operations_count,
      (SELECT operation_type FROM balance_operations WHERE activation_id = a.id ORDER BY created_at DESC LIMIT 1) as last_operation
    FROM activations a
    WHERE user_id = $1
      AND frozen_amount > 0
    ORDER BY created_at DESC
  `, [userId]);
  
  console.log(`\n📋 Trouvé ${activationsWithFrozen.length} activations avec frozen > 0\n`);
  
  let totalFrozenActivations = 0;
  
  for (const act of activationsWithFrozen) {
    totalFrozenActivations += parseFloat(act.frozen_amount);
    
    console.log(`\n${act.status === 'pending' ? '⏳' : act.status === 'received' ? '✅' : '❌'} Activation ${act.order_id}`);
    console.log(`   ID: ${act.id}`);
    console.log(`   Service: ${act.service_code}`);
    console.log(`   Status: ${act.status}`);
    console.log(`   Price: ${act.price} XOF`);
    console.log(`   Frozen: ${act.frozen_amount} XOF`);
    console.log(`   Charged: ${act.charged}`);
    console.log(`   SMS: ${act.sms_code ? 'OUI' : 'NON'}`);
    console.log(`   Operations: ${act.operations_count} (dernière: ${act.last_operation})`);
    console.log(`   Créé: ${new Date(act.created_at).toLocaleString('fr-FR')}`);
    
    // Détail des balance_operations pour cette activation
    const { rows: operations } = await client.query(`
      SELECT 
        operation_type,
        amount,
        balance_before,
        balance_after,
        frozen_before,
        frozen_after,
        created_at
      FROM balance_operations
      WHERE activation_id = $1
      ORDER BY created_at ASC
    `, [act.id]);
    
    if (operations.length > 0) {
      console.log(`   Balance Operations:`);
      for (const op of operations) {
        console.log(`      ${op.operation_type}: ${op.amount} XOF`);
        console.log(`         Balance: ${op.balance_before} → ${op.balance_after}`);
        console.log(`         Frozen: ${op.frozen_before} → ${op.frozen_after}`);
        console.log(`         ${new Date(op.created_at).toLocaleString('fr-FR')}`);
      }
    }
  }
  
  console.log(`\n📊 TOTAL FROZEN dans activations: ${totalFrozenActivations.toFixed(2)} XOF`);
  
  // 3. TOUTES LES RENTALS AVEC FROZEN > 0
  console.log('\n\n📊 3. RENTALS AVEC FROZEN_AMOUNT > 0');
  console.log('-'.repeat(80));
  
  const { rows: rentalsWithFrozen } = await client.query(`
    SELECT 
      id,
      phone_number,
      service_code,
      status,
      price,
      frozen_amount,
      created_at,
      (SELECT COUNT(*) FROM balance_operations WHERE rental_id = r.id) as operations_count,
      (SELECT operation_type FROM balance_operations WHERE rental_id = r.id ORDER BY created_at DESC LIMIT 1) as last_operation
    FROM rentals r
    WHERE user_id = $1
      AND frozen_amount > 0
    ORDER BY created_at DESC
  `, [userId]);
  
  console.log(`\n📋 Trouvé ${rentalsWithFrozen.length} rentals avec frozen > 0\n`);
  
  let totalFrozenRentals = 0;
  
  for (const rental of rentalsWithFrozen) {
    totalFrozenRentals += parseFloat(rental.frozen_amount);
    
    console.log(`\n📱 Rental ${rental.phone_number}`);
    console.log(`   ID: ${rental.id}`);
    console.log(`   Service: ${rental.service_code}`);
    console.log(`   Status: ${rental.status}`);
    console.log(`   Price: ${rental.price} XOF`);
    console.log(`   Frozen: ${rental.frozen_amount} XOF`);
    console.log(`   Operations: ${rental.operations_count} (dernière: ${rental.last_operation})`);
    console.log(`   Créé: ${new Date(rental.created_at).toLocaleString('fr-FR')}`);
  }
  
  console.log(`\n📊 TOTAL FROZEN dans rentals: ${totalFrozenRentals.toFixed(2)} XOF`);
  
  // 4. CALCUL CONSISTENCY
  console.log('\n\n📊 4. VÉRIFICATION CONSISTENCY');
  console.log('-'.repeat(80));
  
  const userFrozen = parseFloat(user[0].frozen_balance);
  const shouldBeFrozen = totalFrozenActivations + totalFrozenRentals;
  const discrepancy = userFrozen - shouldBeFrozen;
  
  console.log(`\nUser frozen_balance: ${userFrozen.toFixed(2)} XOF`);
  console.log(`Activations frozen: ${totalFrozenActivations.toFixed(2)} XOF`);
  console.log(`Rentals frozen: ${totalFrozenRentals.toFixed(2)} XOF`);
  console.log(`TOTAL devrait être: ${shouldBeFrozen.toFixed(2)} XOF`);
  console.log(`Discrepancy: ${discrepancy.toFixed(2)} XOF ${Math.abs(discrepancy) < 0.01 ? '✅' : '❌'}`);
  
  // 5. HISTORIQUE BALANCE_OPERATIONS
  console.log('\n\n📊 5. HISTORIQUE BALANCE_OPERATIONS (20 dernières)');
  console.log('-'.repeat(80));
  
  const { rows: allOperations } = await client.query(`
    SELECT 
      bo.id,
      bo.operation_type,
      bo.amount,
      bo.balance_before,
      bo.balance_after,
      bo.frozen_before,
      bo.frozen_after,
      bo.created_at,
      a.order_id as activation_order_id,
      a.status as activation_status,
      r.phone_number as rental_phone
    FROM balance_operations bo
    LEFT JOIN activations a ON bo.activation_id = a.id
    LEFT JOIN rentals r ON bo.rental_id = r.id
    WHERE bo.user_id = $1
    ORDER BY bo.created_at DESC
    LIMIT 20
  `, [userId]);
  
  console.log(`\n📋 ${allOperations.length} opérations récentes:\n`);
  
  for (const op of allOperations) {
    const frozenChange = op.frozen_after - op.frozen_before;
    console.log(`${op.operation_type.toUpperCase()} - ${new Date(op.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Montant: ${op.amount} XOF`);
    console.log(`   Balance: ${op.balance_before} → ${op.balance_after} (${op.balance_after - op.balance_before >= 0 ? '+' : ''}${(op.balance_after - op.balance_before).toFixed(2)})`);
    console.log(`   Frozen: ${op.frozen_before} → ${op.frozen_after} (${frozenChange >= 0 ? '+' : ''}${frozenChange.toFixed(2)})`);
    if (op.activation_order_id) {
      console.log(`   Activation: ${op.activation_order_id} (${op.activation_status})`);
    }
    if (op.rental_phone) {
      console.log(`   Rental: ${op.rental_phone}`);
    }
    console.log('');
  }
  
  // 6. DÉTECTER PATTERNS ANORMAUX
  console.log('\n\n📊 6. PATTERNS ANORMAUX DÉTECTÉS');
  console.log('-'.repeat(80));
  
  const anomalies = [];
  
  // Anomalie 1: Activations received avec frozen > 0
  const receivedWithFrozen = activationsWithFrozen.filter(a => a.status === 'received' && parseFloat(a.frozen_amount) > 0);
  if (receivedWithFrozen.length > 0) {
    anomalies.push({
      type: 'Activations received avec frozen > 0',
      count: receivedWithFrozen.length,
      impact: receivedWithFrozen.reduce((sum, a) => sum + parseFloat(a.frozen_amount), 0),
      details: receivedWithFrozen.map(a => a.order_id)
    });
  }
  
  // Anomalie 2: Activations pending expirées
  const expiredPending = activationsWithFrozen.filter(a => a.status === 'pending' && new Date(a.created_at) < new Date(Date.now() - 20 * 60 * 1000));
  if (expiredPending.length > 0) {
    anomalies.push({
      type: 'Activations pending expirées (>20min)',
      count: expiredPending.length,
      impact: expiredPending.reduce((sum, a) => sum + parseFloat(a.frozen_amount), 0),
      details: expiredPending.map(a => a.order_id)
    });
  }
  
  // Anomalie 3: Operations freeze sans commit/refund
  const freezeOnly = activationsWithFrozen.filter(a => a.operations_count === 1 && a.last_operation === 'freeze');
  if (freezeOnly.length > 0) {
    anomalies.push({
      type: 'Activations avec freeze SANS commit/refund',
      count: freezeOnly.length,
      impact: freezeOnly.reduce((sum, a) => sum + parseFloat(a.frozen_amount), 0),
      details: freezeOnly.map(a => `${a.order_id} (${a.status})`)
    });
  }
  
  console.log(`\n🔍 Trouvé ${anomalies.length} types d'anomalies:\n`);
  
  for (const anomaly of anomalies) {
    console.log(`❌ ${anomaly.type}`);
    console.log(`   Count: ${anomaly.count}`);
    console.log(`   Impact: ${anomaly.impact.toFixed(2)} XOF frozen bloqués`);
    console.log(`   Détails: ${anomaly.details.join(', ')}`);
    console.log('');
  }
  
  // 7. RÉSUMÉ FINAL
  console.log('\n\n📊 7. RÉSUMÉ DIAGNOSTIC - POURQUOI 55 XOF ?');
  console.log('='.repeat(80));
  
  console.log(`\n✅ User frozen_balance: ${userFrozen} XOF`);
  console.log(`\n📊 Composition:`);
  console.log(`   ${activationsWithFrozen.length} activations × frozen_amount = ${totalFrozenActivations.toFixed(2)} XOF`);
  console.log(`   ${rentalsWithFrozen.length} rentals × frozen_amount = ${totalFrozenRentals.toFixed(2)} XOF`);
  console.log(`   TOTAL: ${shouldBeFrozen.toFixed(2)} XOF`);
  
  if (Math.abs(discrepancy) > 0.01) {
    console.log(`\n❌ DISCREPANCY: ${discrepancy.toFixed(2)} XOF`);
    console.log(`   → Besoin de réconciliation: SELECT * FROM reconcile_frozen_balance();`);
  } else {
    console.log(`\n✅ Consistency OK`);
  }
  
  console.log(`\n🎯 CAUSE RACINE:`);
  
  if (anomalies.length > 0) {
    console.log(`\n   Les ${userFrozen} XOF frozen sont BLOQUÉS car:`);
    for (const anomaly of anomalies) {
      console.log(`   • ${anomaly.type}: ${anomaly.impact.toFixed(2)} XOF`);
    }
    console.log(`\n   Ces activations ont été freeze mais jamais commit/refund.`);
    console.log(`   Cela signifie que atomic_commit/atomic_refund n'ont JAMAIS été appelés.`);
  }
  
  console.log(`\n💡 SOLUTION:`);
  console.log(`   1. Pour activations received: appeler atomic_commit`);
  console.log(`   2. Pour activations timeout/cancelled: appeler atomic_refund`);
  console.log(`   3. Pour activations pending expirées: marquer timeout + atomic_refund`);
  
  await client.end();
}

analyzeDeep().catch(console.error);
