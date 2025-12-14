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

console.log('🔬 ANALYSE COMPLÈTE WALLET ATOMIQUE\n');
console.log('='.repeat(80));

async function analyzeAtomicWallet() {
  await client.connect();
  console.log('✅ Connecté à PostgreSQL\n');

  // 1. VÉRIFIER LES FONCTIONS ATOMIQUES
  console.log('📋 1. FONCTIONS ATOMIQUES');
  console.log('-'.repeat(80));
  
  const { rows: functions } = await client.query(`
    SELECT 
      proname as function_name,
      pg_get_functiondef(oid) as definition
    FROM pg_proc
    WHERE proname IN ('atomic_freeze', 'atomic_commit', 'atomic_refund')
    ORDER BY proname;
  `);
  
  for (const func of functions) {
    console.log(`\n✅ ${func.function_name}:`);
    
    // Extraire les points clés
    const def = func.definition;
    
    if (def.includes('FOR UPDATE')) {
      console.log('   ✅ Utilise FOR UPDATE (lock pessimiste)');
    } else {
      console.log('   ⚠️  Pas de FOR UPDATE (risque race condition)');
    }
    
    if (def.includes('SECURITY DEFINER')) {
      console.log('   ✅ SECURITY DEFINER (bypass RLS)');
    }
    
    if (def.includes('ROLLBACK') || def.includes('EXCEPTION')) {
      console.log('   ✅ Gestion d\'erreurs avec ROLLBACK');
    }
    
    // Vérifier les UPDATE/INSERT
    const updateCount = (def.match(/UPDATE/g) || []).length;
    const insertCount = (def.match(/INSERT/g) || []).length;
    console.log(`   📊 ${updateCount} UPDATE, ${insertCount} INSERT`);
  }

  // 2. TESTER ATOMIC_FREEZE
  console.log('\n\n📋 2. TEST ATOMIC_FREEZE');
  console.log('-'.repeat(80));
  
  const { rows: users } = await client.query(`
    SELECT id, email, balance, frozen_balance 
    FROM users 
    WHERE balance > 0 
    LIMIT 1
  `);
  
  if (users.length > 0) {
    const user = users[0];
    console.log(`\n👤 Test user: ${user.email}`);
    console.log(`   Balance: ${user.balance} XOF`);
    console.log(`   Frozen: ${user.frozen_balance} XOF`);
    
    // Simuler freeze (sans vraiment freezer)
    console.log('\n🧪 Simulation atomic_freeze(50 XOF)...');
    
    try {
      const { rows: freezeResult } = await client.query(`
        SELECT * FROM atomic_freeze(
          p_user_id := $1::uuid,
          p_amount := 50,
          p_activation_id := NULL,
          p_rental_id := NULL,
          p_reason := 'TEST - Analyse wallet'
        );
      `, [user.id]);
      
      console.log('   ✅ atomic_freeze OK:', JSON.stringify(freezeResult[0], null, 2));
    } catch (error) {
      console.log('   ❌ atomic_freeze ERREUR:', error.message);
    }
  } else {
    console.log('⚠️  Aucun utilisateur avec balance > 0');
  }

  // 3. VÉRIFIER CONSISTENCY FROZEN AMOUNTS
  console.log('\n\n📋 3. CONSISTENCY FROZEN AMOUNTS');
  console.log('-'.repeat(80));
  
  const { rows: consistency } = await client.query(`
    WITH user_frozen AS (
      SELECT 
        id,
        email,
        balance,
        frozen_balance
      FROM users
    ),
    activation_frozen AS (
      SELECT 
        user_id,
        SUM(frozen_amount) as total_frozen_activations
      FROM activations
      WHERE status IN ('pending', 'waiting')
      GROUP BY user_id
    ),
    rental_frozen AS (
      SELECT 
        user_id,
        SUM(frozen_amount) as total_frozen_rentals
      FROM rentals
      WHERE status IN ('pending', 'rented')
      GROUP BY user_id
    )
    SELECT 
      u.id,
      u.email,
      u.balance,
      u.frozen_balance as user_frozen,
      COALESCE(a.total_frozen_activations, 0) as activations_frozen,
      COALESCE(r.total_frozen_rentals, 0) as rentals_frozen,
      COALESCE(a.total_frozen_activations, 0) + COALESCE(r.total_frozen_rentals, 0) as total_should_be_frozen,
      u.frozen_balance - (COALESCE(a.total_frozen_activations, 0) + COALESCE(r.total_frozen_rentals, 0)) as discrepancy
    FROM user_frozen u
    LEFT JOIN activation_frozen a ON u.id = a.user_id
    LEFT JOIN rental_frozen r ON u.id = r.user_id
    WHERE u.frozen_balance > 0 
       OR a.total_frozen_activations > 0 
       OR r.total_frozen_rentals > 0
    ORDER BY ABS(u.frozen_balance - (COALESCE(a.total_frozen_activations, 0) + COALESCE(r.total_frozen_rentals, 0))) DESC;
  `);
  
  console.log(`\n📊 Trouvé ${consistency.length} utilisateurs avec frozen amounts\n`);
  
  let hasDiscrepancy = false;
  for (const row of consistency) {
    const disc = parseFloat(row.discrepancy);
    if (Math.abs(disc) > 0.01) {
      hasDiscrepancy = true;
      console.log(`❌ ${row.email}:`);
      console.log(`   User frozen: ${row.user_frozen} XOF`);
      console.log(`   Activations: ${row.activations_frozen} XOF`);
      console.log(`   Rentals: ${row.rentals_frozen} XOF`);
      console.log(`   Should be: ${row.total_should_be_frozen} XOF`);
      console.log(`   Discrepancy: ${disc} XOF\n`);
    } else {
      console.log(`✅ ${row.email}: ${row.user_frozen} XOF (OK)`);
    }
  }
  
  if (!hasDiscrepancy && consistency.length > 0) {
    console.log('\n✅ Aucune discrepancy détectée !');
  }

  // 4. VÉRIFIER BALANCE OPERATIONS
  console.log('\n\n📋 4. BALANCE OPERATIONS (dernières 20)');
  console.log('-'.repeat(80));
  
  const { rows: operations } = await client.query(`
    SELECT 
      bo.id,
      bo.operation_type,
      bo.amount,
      bo.balance_before,
      bo.balance_after,
      bo.frozen_before,
      bo.frozen_after,
      bo.created_at,
      u.email,
      a.order_id as activation_order_id,
      r.phone_number as rental_phone
    FROM balance_operations bo
    JOIN users u ON bo.user_id = u.id
    LEFT JOIN activations a ON bo.activation_id = a.id
    LEFT JOIN rentals r ON bo.rental_id = r.id
    ORDER BY bo.created_at DESC
    LIMIT 20;
  `);
  
  console.log(`\n📊 ${operations.length} opérations récentes:\n`);
  
  for (const op of operations) {
    const balanceChange = op.balance_after - op.balance_before;
    const frozenChange = op.frozen_after - op.frozen_before;
    
    console.log(`${op.operation_type} - ${op.email}`);
    console.log(`   Montant: ${op.amount} XOF`);
    console.log(`   Balance: ${op.balance_before} → ${op.balance_after} (${balanceChange >= 0 ? '+' : ''}${balanceChange})`);
    console.log(`   Frozen: ${op.frozen_before} → ${op.frozen_after} (${frozenChange >= 0 ? '+' : ''}${frozenChange})`);
    if (op.activation_order_id) {
      console.log(`   Activation: ${op.activation_order_id}`);
    }
    if (op.rental_phone) {
      console.log(`   Rental: ${op.rental_phone}`);
    }
    console.log(`   Date: ${new Date(op.created_at).toLocaleString('fr-FR')}\n`);
  }

  // 5. VÉRIFIER ACTIVATIONS AVEC PROBLÈMES
  console.log('\n\n📋 5. ACTIVATIONS AVEC PROBLÈMES ATOMIC');
  console.log('-'.repeat(80));
  
  const { rows: problematicActivations } = await client.query(`
    SELECT 
      a.id,
      a.order_id,
      a.phone,
      a.status,
      a.frozen_amount,
      a.price,
      a.charged,
      a.sms_code,
      a.created_at,
      u.email,
      u.balance,
      u.frozen_balance,
      COUNT(bo.id) as balance_operations_count
    FROM activations a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN balance_operations bo ON bo.activation_id = a.id
    WHERE 
      -- Problème 1: received mais frozen_amount > 0
      (a.status = 'received' AND a.frozen_amount > 0)
      OR
      -- Problème 2: completed/timeout mais frozen_amount > 0
      (a.status IN ('completed', 'timeout', 'cancelled') AND a.frozen_amount > 0)
      OR
      -- Problème 3: received mais pas de balance_operation "commit"
      (a.status = 'received' AND NOT EXISTS (
        SELECT 1 FROM balance_operations 
        WHERE activation_id = a.id 
        AND operation_type = 'commit'
      ))
      OR
      -- Problème 4: timeout/cancelled mais pas de balance_operation "refund"
      (a.status IN ('timeout', 'cancelled') AND NOT EXISTS (
        SELECT 1 FROM balance_operations 
        WHERE activation_id = a.id 
        AND operation_type = 'refund'
      ))
    GROUP BY a.id, u.email, u.balance, u.frozen_balance
    ORDER BY a.created_at DESC
    LIMIT 20;
  `);
  
  console.log(`\n📊 ${problematicActivations.length} activations problématiques:\n`);
  
  if (problematicActivations.length === 0) {
    console.log('✅ Aucune activation problématique détectée !');
  } else {
    for (const act of problematicActivations) {
      console.log(`❌ Activation ${act.order_id}:`);
      console.log(`   Status: ${act.status}`);
      console.log(`   Frozen amount: ${act.frozen_amount} XOF`);
      console.log(`   Price: ${act.price} XOF`);
      console.log(`   Charged: ${act.charged}`);
      console.log(`   SMS: ${act.sms_code ? 'OUI' : 'NON'}`);
      console.log(`   Balance operations: ${act.balance_operations_count}`);
      console.log(`   User: ${act.email} (balance: ${act.balance}, frozen: ${act.frozen_balance})`);
      console.log(`   Créé: ${new Date(act.created_at).toLocaleString('fr-FR')}\n`);
    }
  }

  // 6. VÉRIFIER RENTALS AVEC PROBLÈMES
  console.log('\n\n📋 6. RENTALS AVEC PROBLÈMES ATOMIC');
  console.log('-'.repeat(80));
  
  const { rows: problematicRentals } = await client.query(`
    SELECT 
      r.id,
      r.phone_number,
      r.status,
      r.frozen_amount,
      r.price,
      r.created_at,
      u.email,
      u.balance,
      u.frozen_balance,
      COUNT(bo.id) as balance_operations_count
    FROM rentals r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN balance_operations bo ON bo.rental_id = r.id
    WHERE 
      -- Problème 1: expired/cancelled mais frozen_amount > 0
      (r.status IN ('expired', 'cancelled') AND r.frozen_amount > 0)
      OR
      -- Problème 2: expired/cancelled mais pas de balance_operation "refund"
      (r.status IN ('expired', 'cancelled') AND NOT EXISTS (
        SELECT 1 FROM balance_operations 
        WHERE rental_id = r.id 
        AND operation_type = 'refund'
      ))
    GROUP BY r.id, u.email, u.balance, u.frozen_balance
    ORDER BY r.created_at DESC
    LIMIT 20;
  `);
  
  console.log(`\n📊 ${problematicRentals.length} rentals problématiques:\n`);
  
  if (problematicRentals.length === 0) {
    console.log('✅ Aucun rental problématique détecté !');
  } else {
    for (const rental of problematicRentals) {
      console.log(`❌ Rental ${rental.phone_number}:`);
      console.log(`   Status: ${rental.status}`);
      console.log(`   Frozen amount: ${rental.frozen_amount} XOF`);
      console.log(`   Price: ${rental.price} XOF`);
      console.log(`   Balance operations: ${rental.balance_operations_count}`);
      console.log(`   User: ${rental.email} (balance: ${rental.balance}, frozen: ${rental.frozen_balance})`);
      console.log(`   Créé: ${new Date(rental.created_at).toLocaleString('fr-FR')}\n`);
    }
  }

  // 7. VÉRIFIER TRIGGERS DE PROTECTION
  console.log('\n\n📋 7. TRIGGERS DE PROTECTION');
  console.log('-'.repeat(80));
  
  const { rows: triggers } = await client.query(`
    SELECT 
      tgname as trigger_name,
      tgrelid::regclass as table_name,
      tgtype,
      tgenabled,
      pg_get_triggerdef(oid) as definition
    FROM pg_trigger
    WHERE tgname LIKE '%frozen%' OR tgname LIKE '%protect%'
    ORDER BY tgname;
  `);
  
  console.log(`\n📊 ${triggers.length} triggers de protection:\n`);
  
  for (const trigger of triggers) {
    const enabled = trigger.tgenabled === 'O' ? '✅ ACTIF' : '❌ DÉSACTIVÉ';
    console.log(`${enabled} ${trigger.trigger_name} sur ${trigger.table_name}`);
  }

  // 8. RÉCONCILIATION SUGGESTION
  console.log('\n\n📋 8. FONCTIONS DE RÉCONCILIATION');
  console.log('-'.repeat(80));
  
  const { rows: reconFunctions } = await client.query(`
    SELECT proname 
    FROM pg_proc 
    WHERE proname LIKE '%reconcile%'
    ORDER BY proname;
  `);
  
  console.log(`\n📊 ${reconFunctions.length} fonctions de réconciliation disponibles:\n`);
  
  for (const func of reconFunctions) {
    console.log(`✅ ${func.proname}()`);
  }
  
  console.log('\n💡 Pour lancer la réconciliation:');
  console.log('   SELECT * FROM reconcile_frozen_balance();');
  console.log('   SELECT * FROM reconcile_orphan_freezes();');

  // 9. RÉSUMÉ FINAL
  console.log('\n\n📋 9. RÉSUMÉ DIAGNOSTIC');
  console.log('='.repeat(80));
  
  const totalDiscrepancy = consistency.reduce((sum, row) => sum + Math.abs(parseFloat(row.discrepancy)), 0);
  
  console.log(`\n✅ Fonctions atomiques: ${functions.length}/3 présentes`);
  console.log(`${hasDiscrepancy ? '❌' : '✅'} Consistency frozen amounts: ${totalDiscrepancy.toFixed(2)} XOF discrepancy`);
  console.log(`${problematicActivations.length > 0 ? '❌' : '✅'} Activations problématiques: ${problematicActivations.length}`);
  console.log(`${problematicRentals.length > 0 ? '❌' : '✅'} Rentals problématiques: ${problematicRentals.length}`);
  console.log(`✅ Triggers protection: ${triggers.filter(t => t.tgenabled === 'O').length}/${triggers.length} actifs`);
  console.log(`✅ Balance operations: ${operations.length} récentes tracées`);

  await client.end();
}

analyzeAtomicWallet().catch(console.error);
