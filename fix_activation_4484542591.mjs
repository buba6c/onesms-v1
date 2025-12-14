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

console.log('🔧 FIX ACTIVATION 4484542591 (received sans commit)\n');

async function fixActivation() {
  await client.connect();
  
  // 1. Récupérer l'activation problématique
  const { rows: activations } = await client.query(`
    SELECT * FROM activations 
    WHERE order_id = '4484542591'
  `);
  
  if (activations.length === 0) {
    console.log('❌ Activation introuvable');
    await client.end();
    return;
  }
  
  const activation = activations[0];
  console.log('📋 Activation trouvée:');
  console.log(`   ID: ${activation.id}`);
  console.log(`   User: ${activation.user_id}`);
  console.log(`   Status: ${activation.status}`);
  console.log(`   Frozen: ${activation.frozen_amount} XOF`);
  console.log(`   SMS Code: ${activation.sms_code}`);
  console.log('');
  
  // 2. Appeler atomic_commit
  console.log('🔄 Appel atomic_commit...');
  
  try {
    const { rows: result } = await client.query(`
      SELECT * FROM atomic_commit(
        $1::uuid,  -- p_user_id
        $2::uuid,  -- p_activation_id
        NULL::uuid,  -- p_rental_id
        NULL::uuid,  -- p_transaction_id
        'Fix: commit manquant webhook'  -- p_reason
      )
    `, [activation.user_id, activation.id]);
    
    console.log('✅ atomic_commit résultat:', result[0]);
    
    // 3. Vérifier état après
    const { rows: after } = await client.query(`
      SELECT 
        a.frozen_amount as activation_frozen,
        a.charged,
        u.balance,
        u.frozen_balance,
        (SELECT COUNT(*) FROM balance_operations WHERE activation_id = a.id) as operations_count
      FROM activations a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [activation.id]);
    
    console.log('\n📊 État après fix:');
    console.log(`   Activation frozen: ${after[0].activation_frozen} XOF`);
    console.log(`   Charged: ${after[0].charged}`);
    console.log(`   User balance: ${after[0].balance} XOF`);
    console.log(`   User frozen: ${after[0].frozen_balance} XOF`);
    console.log(`   Balance operations: ${after[0].operations_count}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  
  await client.end();
}

fixActivation().catch(console.error);
