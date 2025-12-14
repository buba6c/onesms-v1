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

console.log('🔬 ANALYSE: POURQUOI CRON N\'A PAS REFUND ?\n');
console.log('='.repeat(80));

async function analyzeWhyNoRefund() {
  await client.connect();
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  
  // 1. LES 3 ACTIVATIONS EXPIRÉES
  console.log('\n📊 1. LES 3 ACTIVATIONS PENDING EXPIRÉES');
  console.log('-'.repeat(80));
  
  const { rows: expiredActs } = await client.query(`
    SELECT 
      id,
      order_id,
      status,
      frozen_amount,
      price,
      created_at,
      updated_at,
      expires_at,
      EXTRACT(EPOCH FROM (NOW() - expires_at)) / 60 as expired_minutes
    FROM activations
    WHERE user_id = $1
      AND status IN ('pending', 'waiting')
      AND frozen_amount > 0
    ORDER BY created_at DESC
  `, [userId]);
  
  console.log(`\n📋 ${expiredActs.length} activations pending avec frozen > 0:\n`);
  
  for (const act of expiredActs) {
    const hasExpired = act.expired_minutes > 0;
    console.log(`${hasExpired ? '⏰' : '⏳'} ${act.order_id}:`);
    console.log(`   Status: ${act.status}`);
    console.log(`   Frozen: ${act.frozen_amount} XOF`);
    console.log(`   Créé: ${new Date(act.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Expire: ${new Date(act.expires_at).toLocaleString('fr-FR')}`);
    console.log(`   ${hasExpired ? `Expiré depuis ${Math.floor(act.expired_minutes)} min` : `Expire dans ${Math.abs(Math.floor(act.expired_minutes))} min`}`);
    
    // Balance operations
    const { rows: ops } = await client.query(`
      SELECT operation_type, amount, created_at
      FROM balance_operations
      WHERE activation_id = $1
      ORDER BY created_at ASC
    `, [act.id]);
    
    console.log(`   Operations: ${ops.map(o => o.operation_type).join(', ') || 'AUCUNE'}`);
    
    if (hasExpired && ops.length === 1 && ops[0].operation_type === 'freeze') {
      console.log(`   ❌ PROBLÈME: Expiré mais pas de refund !`);
    }
    console.log('');
  }
  
  // 2. VÉRIFIER pg_cron
  console.log('\n📊 2. CONFIGURATION pg_cron');
  console.log('-'.repeat(80));
  
  try {
    const { rows: cronJobs } = await client.query(`
      SELECT 
        jobid,
        schedule,
        command,
        active
      FROM cron.job
      ORDER BY jobid;
    `);
    
    console.log(`\n✅ ${cronJobs.length} CRON jobs configurés:\n`);
    
    let hasPendingSMS = false;
    for (const job of cronJobs) {
      const isPendingSMS = job.command.includes('check-pending') || job.command.includes('cron-check');
      if (isPendingSMS) hasPendingSMS = true;
      
      console.log(`${job.active ? '✅' : '❌'} Job ${job.jobid}:`);
      console.log(`   Schedule: ${job.schedule}`);
      console.log(`   Active: ${job.active}`);
      console.log(`   Command: ${job.command.substring(0, 150)}...`);
      console.log('');
    }
    
    if (!hasPendingSMS) {
      console.log('❌ AUCUN CRON pour check-pending-sms trouvé !');
    }
  } catch (error) {
    console.log('⚠️  Extension pg_cron pas installée ou pas accessible');
    console.log('   Error:', error.message);
  }
  
  // 3. VÉRIFIER DERNIÈRES EXÉCUTIONS
  console.log('\n\n📊 3. HISTORIQUE EXÉCUTIONS CRON');
  console.log('-'.repeat(80));
  
  try {
    const { rows: cronRuns } = await client.query(`
      SELECT 
        runid,
        jobid,
        status,
        return_message,
        start_time,
        end_time
      FROM cron.job_run_details
      ORDER BY start_time DESC
      LIMIT 10;
    `);
    
    console.log(`\n📋 ${cronRuns.length} exécutions récentes:\n`);
    
    for (const run of cronRuns) {
      console.log(`Run ${run.runid} - Job ${run.jobid}:`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Start: ${new Date(run.start_time).toLocaleString('fr-FR')}`);
      if (run.end_time) {
        console.log(`   End: ${new Date(run.end_time).toLocaleString('fr-FR')}`);
      }
      if (run.return_message) {
        console.log(`   Message: ${run.return_message.substring(0, 200)}`);
      }
      console.log('');
    }
  } catch (error) {
    console.log('⚠️  Impossible de lire job_run_details');
  }
  
  // 4. TESTER LA REQUÊTE QUE LE CRON UTILISE
  console.log('\n\n📊 4. SIMULATION REQUÊTE CRON');
  console.log('-'.repeat(80));
  
  const { rows: shouldExpire } = await client.query(`
    SELECT 
      id,
      order_id,
      status,
      frozen_amount,
      user_id,
      created_at,
      expires_at
    FROM activations
    WHERE status IN ('pending', 'waiting')
      AND expires_at < NOW()
    ORDER BY created_at DESC
    LIMIT 10;
  `);
  
  console.log(`\n📋 ${shouldExpire.length} activations devraient être timeout par CRON:\n`);
  
  for (const act of shouldExpire) {
    const isOurUser = act.user_id === userId;
    console.log(`${isOurUser ? '👤' : '  '} ${act.order_id}:`);
    console.log(`   Status: ${act.status}`);
    console.log(`   Frozen: ${act.frozen_amount} XOF`);
    console.log(`   Expiré: ${new Date(act.expires_at).toLocaleString('fr-FR')}`);
    console.log('');
  }
  
  // 5. DIAGNOSTIC FINAL
  console.log('\n\n📊 5. DIAGNOSTIC FINAL');
  console.log('='.repeat(80));
  
  const hasExpiredActivations = expiredActs.filter(a => a.expired_minutes > 0).length > 0;
  const cronFindsActivations = shouldExpire.length > 0;
  
  console.log('\n🎯 RÉSUMÉ:\n');
  console.log(`${hasExpiredActivations ? '❌' : '✅'} ${expiredActs.length} activations expirées non traitées`);
  console.log(`${cronFindsActivations ? '✅' : '❌'} Requête CRON trouve ${shouldExpire.length} activations`);
  
  console.log('\n🔍 CAUSE RACINE:\n');
  
  if (hasExpiredActivations && cronFindsActivations) {
    console.log('❌ Le CRON NE TOURNE PAS ou NE TRAITE PAS les activations');
    console.log('');
    console.log('Hypothèses:');
    console.log('1. pg_cron non configuré (pas de scheduled job)');
    console.log('2. Edge Function cron-check-pending-sms non appelée');
    console.log('3. Supabase webhook/scheduled trigger manquant');
    console.log('4. Erreur silencieuse dans l\'exécution');
  }
  
  console.log('\n💡 VÉRIFICATIONS:');
  console.log('');
  console.log('1. Vérifier Edge Function déployée:');
  console.log('   $ npx supabase functions list | grep cron-check-pending-sms');
  console.log('');
  console.log('2. Tester manuellement:');
  console.log('   $ node test_cron_polling.mjs');
  console.log('');
  console.log('3. Vérifier dans Supabase Dashboard > Database > Cron Jobs');
  console.log('');
  console.log('4. Ou configurer pg_cron manuellement:');
  console.log('   SELECT cron.schedule(');
  console.log('     \'check-pending-sms\',');
  console.log('     \'* * * * *\',  -- Chaque minute');
  console.log('     $$SELECT net.http_post(');
  console.log('       url := \'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms\',');
  console.log('       headers := \'{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}\'::jsonb');
  console.log('     )$$');
  console.log('   );');
  
  await client.end();
}

analyzeWhyNoRefund().catch(console.error);
