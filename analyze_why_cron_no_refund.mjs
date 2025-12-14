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

console.log('🔬 ANALYSE DEEP: POURQUOI CRON N\'A PAS REFUND LES ACTIVATIONS EXPIRÉES ?\n');
console.log('='.repeat(80));

async function analyzeWhyNoRefund() {
  await client.connect();
  
  const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  
  // 1. ANALYSER LES 3 ACTIVATIONS PENDING EXPIRÉES
  console.log('\n📊 1. LES 3 ACTIVATIONS PENDING EXPIRÉES');
  console.log('-'.repeat(80));
  
  const activationIds = [
    '4488735117', // 04/12/2025 16:30:33 (50 XOF)
    '4485725704', // 03/12/2025 22:02:24 (5 XOF)
    '4485640389'  // 03/12/2025 21:23:29 (5 XOF)
  ];
  
  for (const orderId of activationIds) {
    console.log(`\n🔍 Activation ${orderId}:`);
    
    const { rows: act } = await client.query(`
      SELECT 
        id,
        order_id,
        status,
        frozen_amount,
        price,
        created_at,
        updated_at,
        expires_at
      FROM activations
      WHERE order_id = $1
    `, [orderId]);
    
    if (act.length === 0) {
      console.log('   ❌ Introuvable');
      continue;
    }
    
    const activation = act[0];
    const now = new Date();
    const expiresAt = new Date(activation.expires_at);
    const createdAt = new Date(activation.created_at);
    const ageMinutes = Math.floor((now - createdAt) / 1000 / 60);
    const hasExpired = now > expiresAt;
    
    console.log(`   Status: ${activation.status}`);
    console.log(`   Frozen: ${activation.frozen_amount} XOF`);
    console.log(`   Créé: ${createdAt.toLocaleString('fr-FR')}`);
    console.log(`   Expire: ${expiresAt.toLocaleString('fr-FR')}`);
    console.log(`   Âge: ${ageMinutes} minutes`);
    console.log(`   ${hasExpired ? '⏰ EXPIRÉ' : '⏳ Pas encore expiré'}`);
    
    // Vérifier si le CRON a traité cette activation
    const { rows: logs } = await client.query(`
      SELECT * FROM logs_system
      WHERE (
        message LIKE '%${orderId}%'
        OR metadata::text LIKE '%${orderId}%'
      )
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n   📋 Logs système: ${logs.length}`);
    for (const log of logs) {
      console.log(`      ${log.level}: ${log.message.substring(0, 100)}`);
      console.log(`      ${new Date(log.created_at).toLocaleString('fr-FR')}`);
    }
    
    // Vérifier balance_operations
    const { rows: operations } = await client.query(`
      SELECT 
        operation_type,
        amount,
        created_at
      FROM balance_operations
      WHERE activation_id = $1
      ORDER BY created_at ASC
    `, [activation.id]);
    
    console.log(`\n   💰 Balance operations: ${operations.length}`);
    for (const op of operations) {
      console.log(`      ${op.operation_type}: ${op.amount} XOF - ${new Date(op.created_at).toLocaleString('fr-FR')}`);
    }
    
    if (operations.length === 1 && operations[0].operation_type === 'freeze') {
      console.log(`\n   ❌ PROBLÈME: Seulement freeze, PAS de refund !`);
      console.log(`      Le CRON n'a JAMAIS traité cette activation`);
    }
  }
  
  // 2. VÉRIFIER DERNIÈRE EXÉCUTION CRON
  console.log('\n\n📊 2. DERNIÈRE EXÉCUTION CRON-CHECK-PENDING-SMS');
  console.log('-'.repeat(80));
  
  const { rows: cronLogs } = await client.query(`
    SELECT 
      message,
      level,
      metadata,
      created_at
    FROM logs_system
    WHERE message LIKE '%CRON-CHECK%'
       OR message LIKE '%check-pending%'
    ORDER BY created_at DESC
    LIMIT 20
  `);
  
  console.log(`\n📋 ${cronLogs.length} logs CRON trouvés:\n`);
  
  if (cronLogs.length === 0) {
    console.log('❌ AUCUN LOG CRON TROUVÉ !');
    console.log('   → Le CRON ne s\'exécute peut-être PAS du tout');
  } else {
    for (const log of cronLogs.slice(0, 5)) {
      console.log(`${log.level}: ${log.message}`);
      console.log(`   ${new Date(log.created_at).toLocaleString('fr-FR')}`);
      if (log.metadata) {
        console.log(`   Metadata: ${JSON.stringify(log.metadata).substring(0, 200)}`);
      }
      console.log('');
    }
  }
  
  // 3. VÉRIFIER CRON JOBS CONFIGURÉS
  console.log('\n\n📊 3. CRON JOBS CONFIGURÉS (pg_cron)');
  console.log('-'.repeat(80));
  
  const { rows: cronJobs } = await client.query(`
    SELECT 
      jobid,
      schedule,
      command,
      nodename,
      nodeport,
      database,
      username,
      active
    FROM cron.job
    WHERE command LIKE '%check-pending%'
       OR command LIKE '%cron-check%'
    ORDER BY jobid;
  `).catch(() => ({ rows: [] }));
  
  if (cronJobs.length === 0) {
    console.log('\n❌ AUCUN CRON JOB CONFIGURÉ pour check-pending-sms !');
    console.log('   → Le CRON ne tourne PAS automatiquement');
    console.log('   → Il faut le configurer dans pg_cron ou via Supabase Dashboard');
  } else {
    console.log(`\n✅ ${cronJobs.length} CRON job(s) configuré(s):\n`);
    for (const job of cronJobs) {
      console.log(`Job ID: ${job.jobid}`);
      console.log(`   Schedule: ${job.schedule}`);
      console.log(`   Active: ${job.active ? '✅ OUI' : '❌ NON'}`);
      console.log(`   Command: ${job.command.substring(0, 100)}...`);
      console.log('');
    }
  }
  
  // 4. VÉRIFIER EXÉCUTIONS CRON RÉCENTES
  console.log('\n\n📊 4. HISTORIQUE EXÉCUTIONS CRON');
  console.log('-'.repeat(80));
  
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
  `).catch(() => ({ rows: [] }));
  
  if (cronRuns.length === 0) {
    console.log('\n⚠️  Aucune exécution CRON récente trouvée');
  } else {
    console.log(`\n📋 ${cronRuns.length} exécutions récentes:\n`);
    for (const run of cronRuns) {
      console.log(`Run ID: ${run.runid} - Job ID: ${run.jobid}`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Start: ${new Date(run.start_time).toLocaleString('fr-FR')}`);
      console.log(`   End: ${run.end_time ? new Date(run.end_time).toLocaleString('fr-FR') : 'N/A'}`);
      if (run.return_message) {
        console.log(`   Message: ${run.return_message.substring(0, 200)}`);
      }
      console.log('');
    }
  }
  
  // 5. TESTER MANUELLEMENT LA LOGIQUE EXPIRE
  console.log('\n\n📊 5. TEST LOGIQUE EXPIRATION (ce que le CRON devrait voir)');
  console.log('-'.repeat(80));
  
  const { rows: shouldExpire } = await client.query(`
    SELECT 
      id,
      order_id,
      status,
      frozen_amount,
      created_at,
      expires_at,
      EXTRACT(EPOCH FROM (NOW() - expires_at)) / 60 as expired_minutes
    FROM activations
    WHERE user_id = $1
      AND status IN ('pending', 'waiting')
      AND expires_at < NOW()
    ORDER BY expires_at ASC
  `, [userId]);
  
  console.log(`\n📋 ${shouldExpire.length} activations devraient être timeout:\n`);
  
  for (const act of shouldExpire) {
    console.log(`❌ ${act.order_id}:`);
    console.log(`   Status: ${act.status}`);
    console.log(`   Frozen: ${act.frozen_amount} XOF`);
    console.log(`   Expiré depuis: ${Math.floor(act.expired_minutes)} minutes`);
    console.log(`   Expires at: ${new Date(act.expires_at).toLocaleString('fr-FR')}`);
  }
  
  // 6. VÉRIFIER EDGE FUNCTION DEPLOYMENT
  console.log('\n\n📊 6. VÉRIFICATION EDGE FUNCTION');
  console.log('-'.repeat(80));
  
  console.log('\n💡 Pour vérifier si cron-check-pending-sms est déployé:');
  console.log('   npx supabase functions list | grep cron-check-pending-sms');
  
  console.log('\n💡 Pour tester manuellement:');
  console.log('   curl -X POST https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms \\');
  console.log('     -H "Authorization: Bearer YOUR_ANON_KEY"');
  
  // 7. DIAGNOSTIC FINAL
  console.log('\n\n📊 7. DIAGNOSTIC FINAL - POURQUOI PAS DE REFUND ?');
  console.log('='.repeat(80));
  
  console.log('\n🎯 HYPOTHÈSES:');
  
  console.log('\n1️⃣ CRON JOB NON CONFIGURÉ:');
  console.log(`   ${cronJobs.length === 0 ? '❌' : '✅'} CRON job dans pg_cron`);
  if (cronJobs.length === 0) {
    console.log('   → Le CRON ne tourne JAMAIS automatiquement');
    console.log('   → Besoin de configurer pg_cron ou Supabase Edge Function CRON');
  }
  
  console.log('\n2️⃣ CRON S\'EXÉCUTE MAIS ÉCHOUE:');
  console.log(`   ${cronLogs.length > 0 ? '✅' : '❌'} Logs CRON présents`);
  console.log(`   ${cronRuns.length > 0 ? '✅' : '❌'} Historique exécutions`);
  if (cronLogs.length === 0 && cronRuns.length === 0) {
    console.log('   → Aucune trace d\'exécution CRON');
    console.log('   → Soit pas configuré, soit erreur silencieuse');
  }
  
  console.log('\n3️⃣ LOGIQUE EXPIRE INCORRECTE:');
  console.log(`   ${shouldExpire.length} activations devraient être timeout`);
  if (shouldExpire.length > 0) {
    console.log('   → La requête SQL fonctionne (trouve les activations)');
    console.log('   → Mais le CRON ne les traite PAS');
  }
  
  console.log('\n4️⃣ EDGE FUNCTION NON DÉPLOYÉE:');
  console.log('   À vérifier manuellement avec supabase functions list');
  
  console.log('\n\n💡 SOLUTION RECOMMANDÉE:');
  console.log('   1. Vérifier deployment: npx supabase functions list');
  console.log('   2. Tester manuellement: node test_cron_polling.mjs');
  console.log('   3. Configurer pg_cron si pas actif');
  console.log('   4. Ou créer Supabase Edge Function scheduled hook');
  
  await client.end();
}

analyzeWhyNoRefund().catch(console.error);
