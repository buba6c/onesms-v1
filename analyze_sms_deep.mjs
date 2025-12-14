#!/usr/bin/env node

/**
 * 🔬 ANALYSE ULTRA-PROFONDE - PROBLÈME SMS NON AFFICHÉS
 * ======================================================
 * Investigation complète du flux SMS de bout en bout
 */

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

console.log('🔬 ANALYSE ULTRA-PROFONDE - PROBLÈME SMS');
console.log('='.repeat(80));
console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
console.log('='.repeat(80));
console.log('');

// ============================================
// 1. ÉTAT DES ACTIVATIONS AVEC SMS
// ============================================
async function analyzeSMSActivations() {
  console.log('📱 1. ÉTAT DES ACTIVATIONS AVEC SMS');
  console.log('-'.repeat(80));

  try {
    // Activations qui devraient avoir un SMS
    const query = `
      SELECT 
        a.id,
        a.user_id,
        u.email,
        a.order_id,
        a.phone,
        a.service_code,
        a.country_code,
        a.status,
        a.sms_code,
        a.sms_text,
        a.sms_received_at,
        a.price,
        a.frozen_amount,
        a.charged,
        a.provider,
        a.created_at,
        a.updated_at,
        a.expires_at,
        (NOW() > a.expires_at) as is_expired,
        EXTRACT(EPOCH FROM (NOW() - a.created_at))/60 as age_minutes
      FROM activations a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 50;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Dernières 50 activations:\n`);

    // Stats par statut
    const stats = {};
    let withSMS = 0;
    let withoutSMS = 0;
    let shouldHaveSMS = 0;

    result.rows.forEach(act => {
      stats[act.status] = (stats[act.status] || 0) + 1;
      
      if (act.sms_code || act.sms_text) {
        withSMS++;
      } else {
        withoutSMS++;
        if (act.status === 'received' || act.status === 'completed') {
          shouldHaveSMS++;
        }
      }
    });

    console.log('📊 Statistiques:');
    Object.entries(stats).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log(`\n💬 SMS:`);
    console.log(`   Avec SMS: ${withSMS}`);
    console.log(`   Sans SMS: ${withoutSMS}`);
    console.log(`   ⚠️  Devraient avoir SMS: ${shouldHaveSMS}`);

    // Détails activations problématiques
    console.log('\n\n🚨 ACTIVATIONS PROBLÉMATIQUES (received/completed SANS SMS):\n');
    
    const problematic = result.rows.filter(a => 
      (a.status === 'received' || a.status === 'completed') && 
      !a.sms_code && !a.sms_text
    );

    if (problematic.length > 0) {
      problematic.forEach((act, i) => {
        console.log(`${i + 1}. ID: ${act.id.substring(0, 8)}... - ${act.status}`);
        console.log(`   User: ${act.email}`);
        console.log(`   Service: ${act.service_code} (${act.country_code})`);
        console.log(`   Phone: ${act.phone}`);
        console.log(`   Order ID: ${act.order_id}`);
        console.log(`   Créé: ${new Date(act.created_at).toLocaleString('fr-FR')}`);
        console.log(`   Âge: ${Math.round(act.age_minutes)} minutes`);
        console.log(`   Frozen: ${act.frozen_amount} XOF (charged: ${act.charged})`);
        console.log('');
      });
    } else {
      console.log('✅ Aucune incohérence détectée');
    }

    // Activations avec SMS (les bonnes)
    console.log('\n✅ ACTIVATIONS AVEC SMS (working):\n');
    
    const withSMSList = result.rows.filter(a => a.sms_code || a.sms_text).slice(0, 5);
    
    if (withSMSList.length > 0) {
      withSMSList.forEach((act, i) => {
        console.log(`${i + 1}. ${act.status} - ${act.service_code} (${act.country_code})`);
        console.log(`   Code: ${act.sms_code || 'N/A'}`);
        console.log(`   Texte: ${act.sms_text ? act.sms_text.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`   Reçu: ${act.sms_received_at ? new Date(act.sms_received_at).toLocaleString('fr-FR') : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ AUCUN SMS TROUVÉ DANS LES 50 DERNIÈRES ACTIVATIONS !');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 2. VÉRIFIER TABLE SMS_MESSAGES
// ============================================
async function analyzeSMSMessagesTable() {
  console.log('📨 2. TABLE SMS_MESSAGES');
  console.log('-'.repeat(80));

  try {
    const countQuery = `SELECT COUNT(*) as count FROM sms_messages;`;
    const countResult = await client.query(countQuery);
    
    console.log(`📊 Total messages dans sms_messages: ${countResult.rows[0].count}\n`);

    if (countResult.rows[0].count > 0) {
      const query = `
        SELECT 
          sm.*,
          u.email as user_email,
          vn.phone as virtual_number_phone
        FROM sms_messages sm
        LEFT JOIN users u ON u.id = sm.user_id
        LEFT JOIN virtual_numbers vn ON vn.id = sm.virtual_number_id
        ORDER BY sm.received_at DESC
        LIMIT 20;
      `;

      const result = await client.query(query);
      
      console.log('📋 Derniers 20 messages:\n');
      result.rows.forEach((msg, i) => {
        console.log(`${i + 1}. De: ${msg.sender || 'N/A'}`);
        console.log(`   Pour: ${msg.virtual_number_phone || 'N/A'}`);
        console.log(`   User: ${msg.user_email || 'N/A'}`);
        console.log(`   Code: ${msg.code || 'N/A'}`);
        console.log(`   Message: ${msg.message ? msg.message.substring(0, 50) : 'N/A'}`);
        console.log(`   Reçu: ${new Date(msg.received_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    } else {
      console.log('❌ TABLE SMS_MESSAGES EST VIDE !');
      console.log('⚠️  Cela signifie que les SMS ne sont PAS stockés dans cette table');
      console.log('✅ Les SMS sont stockés directement dans activations.sms_code/sms_text');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 3. ANALYSER RENTAL_MESSAGES
// ============================================
async function analyzeRentalMessages() {
  console.log('🏠 3. RENTAL MESSAGES');
  console.log('-'.repeat(80));

  try {
    const countQuery = `SELECT COUNT(*) as count FROM rental_messages;`;
    const countResult = await client.query(countQuery);
    
    console.log(`📊 Total rental messages: ${countResult.rows[0].count}\n`);

    if (countResult.rows[0].count > 0) {
      const query = `
        SELECT 
          rm.*,
          r.phone,
          r.service_code,
          u.email
        FROM rental_messages rm
        JOIN rentals r ON r.id = rm.rental_id
        JOIN users u ON u.id = r.user_id
        ORDER BY rm.received_at DESC;
      `;

      const result = await client.query(query);
      
      console.log('📋 Tous les messages de rentals:\n');
      result.rows.forEach((msg, i) => {
        console.log(`${i + 1}. Rental ID: ${msg.rental_id.substring(0, 8)}...`);
        console.log(`   Phone: ${msg.phone}`);
        console.log(`   Service: ${msg.service_code}`);
        console.log(`   User: ${msg.email}`);
        console.log(`   De: ${msg.sender || 'N/A'}`);
        console.log(`   Message: ${msg.message ? msg.message.substring(0, 60) : 'N/A'}`);
        console.log(`   Code: ${msg.code || 'N/A'}`);
        console.log(`   Reçu: ${new Date(msg.received_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Aucun message de rental');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 4. ANALYSER LES LOGS PROVIDER
// ============================================
async function analyzeProviderLogs() {
  console.log('📝 4. LOGS PROVIDER (API Calls)');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        lp.*,
        u.email as user_email
      FROM logs_provider lp
      LEFT JOIN users u ON u.id = lp.user_id
      ORDER BY lp.created_at DESC
      LIMIT 50;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total logs: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      // Stats par action
      const actionStats = {};
      const statusStats = {};

      result.rows.forEach(log => {
        actionStats[log.action] = (actionStats[log.action] || 0) + 1;
        statusStats[log.status] = (statusStats[log.status] || 0) + 1;
      });

      console.log('📊 Par action:');
      Object.entries(actionStats).forEach(([action, count]) => {
        console.log(`   ${action}: ${count}`);
      });

      console.log('\n📊 Par statut:');
      Object.entries(statusStats).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      // Logs d'erreur
      const errors = result.rows.filter(l => l.status === 'error' || l.error_message);
      
      if (errors.length > 0) {
        console.log('\n\n🚨 ERREURS API:\n');
        errors.forEach((log, i) => {
          console.log(`${i + 1}. ${log.action} - ${log.provider}`);
          console.log(`   Activation: ${log.activation_id ? log.activation_id.substring(0, 8) + '...' : 'N/A'}`);
          console.log(`   User: ${log.user_email || 'N/A'}`);
          console.log(`   Erreur: ${log.error_message || 'N/A'}`);
          console.log(`   Date: ${new Date(log.created_at).toLocaleString('fr-FR')}`);
          console.log('');
        });
      }

      // Logs getStatus (check SMS)
      const getStatusLogs = result.rows.filter(l => l.action === 'getStatus');
      console.log(`\n📊 Logs getStatus (vérification SMS): ${getStatusLogs.length}`);
      
      if (getStatusLogs.length > 0) {
        console.log('\nDerniers checks SMS:\n');
        getStatusLogs.slice(0, 10).forEach((log, i) => {
          console.log(`${i + 1}. ${log.provider} - ${log.status}`);
          console.log(`   Activation: ${log.activation_id ? log.activation_id.substring(0, 8) + '...' : 'N/A'}`);
          console.log(`   Response: ${log.response_data ? JSON.stringify(log.response_data).substring(0, 100) : 'N/A'}`);
          console.log(`   Date: ${new Date(log.created_at).toLocaleString('fr-FR')}`);
          console.log('');
        });
      }

    } else {
      console.log('⚠️  Aucun log provider - Les appels API ne sont pas tracés !');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 5. ANALYSER SYSTEM_LOGS
// ============================================
async function analyzeSystemLogs() {
  console.log('📋 5. SYSTEM LOGS');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        sl.*,
        u.email as user_email
      FROM system_logs sl
      LEFT JOIN users u ON u.id = sl.user_id
      ORDER BY sl.created_at DESC
      LIMIT 30;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total system logs: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      // Par niveau
      const levelStats = {};
      result.rows.forEach(log => {
        levelStats[log.level] = (levelStats[log.level] || 0) + 1;
      });

      console.log('📊 Par niveau:');
      Object.entries(levelStats).forEach(([level, count]) => {
        const icon = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${level}: ${count}`);
      });

      // Erreurs récentes
      const errors = result.rows.filter(l => l.level === 'error');
      
      if (errors.length > 0) {
        console.log('\n\n🚨 ERREURS SYSTÈME:\n');
        errors.forEach((log, i) => {
          console.log(`${i + 1}. [${log.category}] ${log.message}`);
          console.log(`   User: ${log.user_email || 'System'}`);
          console.log(`   Metadata: ${log.metadata ? JSON.stringify(log.metadata).substring(0, 100) : 'N/A'}`);
          console.log(`   Date: ${new Date(log.created_at).toLocaleString('fr-FR')}`);
          console.log('');
        });
      }

      // Logs liés aux SMS
      const smsLogs = result.rows.filter(l => 
        l.message.toLowerCase().includes('sms') ||
        l.category.toLowerCase().includes('sms') ||
        l.message.toLowerCase().includes('activation')
      );

      if (smsLogs.length > 0) {
        console.log('\n\n📨 LOGS LIÉS AUX SMS:\n');
        smsLogs.forEach((log, i) => {
          console.log(`${i + 1}. [${log.level}] ${log.category}`);
          console.log(`   Message: ${log.message}`);
          console.log(`   Date: ${new Date(log.created_at).toLocaleString('fr-FR')}`);
          console.log('');
        });
      }

    } else {
      console.log('⚠️  Aucun system log');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 6. VÉRIFIER WEBHOOK_LOGS
// ============================================
async function analyzeWebhookLogs() {
  console.log('🔔 6. WEBHOOK LOGS');
  console.log('-'.repeat(80));

  try {
    const countQuery = `SELECT COUNT(*) as count FROM webhook_logs;`;
    const countResult = await client.query(countQuery);
    
    console.log(`📊 Total webhook logs: ${countResult.rows[0].count}\n`);

    if (countResult.rows[0].count > 0) {
      const query = `
        SELECT 
          wl.*,
          a.service_code,
          a.phone,
          u.email
        FROM webhook_logs wl
        LEFT JOIN activations a ON a.id = wl.activation_id
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY wl.created_at DESC
        LIMIT 30;
      `;

      const result = await client.query(query);
      
      console.log('📋 Derniers webhooks:\n');
      result.rows.forEach((log, i) => {
        console.log(`${i + 1}. Activation: ${log.activation_id ? log.activation_id.substring(0, 8) + '...' : 'N/A'}`);
        console.log(`   Service: ${log.service_code || 'N/A'}`);
        console.log(`   Phone: ${log.phone || 'N/A'}`);
        console.log(`   User: ${log.email || 'N/A'}`);
        console.log(`   Payload: ${log.payload ? JSON.stringify(log.payload).substring(0, 100) : 'N/A'}`);
        console.log(`   Processed: ${log.processed}`);
        console.log(`   Date: ${new Date(log.created_at).toLocaleString('fr-FR')}`);
        console.log('');
      });

      // Webhooks non traités
      const unprocessed = result.rows.filter(l => !l.processed);
      if (unprocessed.length > 0) {
        console.log(`⚠️  ${unprocessed.length} webhooks non traités`);
      }

    } else {
      console.log('❌ AUCUN WEBHOOK LOG !');
      console.log('⚠️  Les webhooks SMS-Activate ne sont pas reçus/traités');
      console.log('');
      console.log('🔍 CAUSES POSSIBLES:');
      console.log('   1. Webhook URL non configurée chez SMS-Activate');
      console.log('   2. Edge Function webhook-sms-activate non déployée/fonctionnelle');
      console.log('   3. Webhooks désactivés dans les settings');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 7. ANALYSER LE FLOW COMPLET D'UNE ACTIVATION
// ============================================
async function analyzeActivationFlow() {
  console.log('🔄 7. ANALYSE FLOW ACTIVATION COMPLÈTE');
  console.log('-'.repeat(80));

  try {
    // Prendre une activation récente
    const activationQuery = `
      SELECT * FROM activations 
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    const actResult = await client.query(activationQuery);
    
    if (actResult.rows.length === 0) {
      console.log('❌ Aucune activation trouvée');
      return;
    }

    const activation = actResult.rows[0];
    
    console.log('📱 ACTIVATION SÉLECTIONNÉE:\n');
    console.log(`ID: ${activation.id}`);
    console.log(`Order ID: ${activation.order_id}`);
    console.log(`Phone: ${activation.phone}`);
    console.log(`Service: ${activation.service_code} (${activation.country_code})`);
    console.log(`Status: ${activation.status}`);
    console.log(`SMS Code: ${activation.sms_code || 'N/A'}`);
    console.log(`SMS Text: ${activation.sms_text || 'N/A'}`);
    console.log(`Créé: ${new Date(activation.created_at).toLocaleString('fr-FR')}`);
    console.log('');

    // Balance operations liées
    console.log('💼 BALANCE OPERATIONS:\n');
    const balanceOpsQuery = `
      SELECT * FROM balance_operations 
      WHERE activation_id = $1 
      ORDER BY created_at;
    `;
    const balanceOps = await client.query(balanceOpsQuery, [activation.id]);
    
    if (balanceOps.rows.length > 0) {
      balanceOps.rows.forEach((op, i) => {
        console.log(`${i + 1}. ${op.operation_type}`);
        console.log(`   Montant: ${op.amount} XOF`);
        console.log(`   Balance: ${op.balance_before} → ${op.balance_after}`);
        console.log(`   Frozen: ${op.frozen_before || 0} → ${op.frozen_after || 0}`);
        console.log(`   Date: ${new Date(op.created_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Aucune balance operation');
    }

    // Transactions liées
    console.log('\n💳 TRANSACTIONS:\n');
    const transactionsQuery = `
      SELECT * FROM transactions 
      WHERE metadata->>'activation_id' = $1 
      ORDER BY created_at;
    `;
    const transactions = await client.query(transactionsQuery, [activation.id]);
    
    if (transactions.rows.length > 0) {
      transactions.rows.forEach((tx, i) => {
        console.log(`${i + 1}. ${tx.type} - ${tx.status}`);
        console.log(`   Montant: ${tx.amount} XOF`);
        console.log(`   Référence: ${tx.reference || 'N/A'}`);
        console.log(`   Date: ${new Date(tx.created_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Aucune transaction');
    }

    // Provider logs
    console.log('\n📝 PROVIDER LOGS:\n');
    const providerLogsQuery = `
      SELECT * FROM logs_provider 
      WHERE activation_id = $1 
      ORDER BY created_at;
    `;
    const providerLogs = await client.query(providerLogsQuery, [activation.id]);
    
    if (providerLogs.rows.length > 0) {
      providerLogs.rows.forEach((log, i) => {
        console.log(`${i + 1}. ${log.action} - ${log.status}`);
        console.log(`   Provider: ${log.provider}`);
        console.log(`   Response: ${log.response_data ? JSON.stringify(log.response_data).substring(0, 80) : 'N/A'}`);
        console.log(`   Erreur: ${log.error_message || 'N/A'}`);
        console.log(`   Date: ${new Date(log.created_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Aucun provider log');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 8. DIAGNOSTIQUE FINAL
// ============================================
async function finalDiagnostic() {
  console.log('🎯 8. DIAGNOSTIC FINAL');
  console.log('-'.repeat(80));

  try {
    const checks = [];

    // 1. Activations sans SMS
    const noSMSQuery = `
      SELECT COUNT(*) as count 
      FROM activations 
      WHERE status IN ('received', 'completed') 
      AND (sms_code IS NULL AND sms_text IS NULL);
    `;
    const noSMS = await client.query(noSMSQuery);
    
    checks.push({
      name: 'Activations received/completed SANS SMS',
      count: noSMS.rows[0].count,
      severity: noSMS.rows[0].count > 0 ? 'ERROR' : 'OK',
      message: noSMS.rows[0].count > 0 
        ? `${noSMS.rows[0].count} activations ont le statut received/completed mais pas de SMS`
        : 'Toutes les activations completed ont un SMS'
    });

    // 2. Activations pending expirées
    const expiredPendingQuery = `
      SELECT COUNT(*) as count 
      FROM activations 
      WHERE status = 'pending' 
      AND expires_at < NOW();
    `;
    const expiredPending = await client.query(expiredPendingQuery);
    
    checks.push({
      name: 'Activations pending expirées',
      count: expiredPending.rows[0].count,
      severity: expiredPending.rows[0].count > 0 ? 'WARNING' : 'OK',
      message: expiredPending.rows[0].count > 0
        ? `${expiredPending.rows[0].count} activations pending expirées à traiter`
        : 'Pas de pending expiré'
    });

    // 3. Frozen non libéré
    const frozenStuckQuery = `
      SELECT COUNT(*) as count, SUM(frozen_amount) as total
      FROM activations
      WHERE status IN ('timeout', 'cancelled', 'expired', 'refunded')
      AND frozen_amount > 0;
    `;
    const frozenStuck = await client.query(frozenStuckQuery);
    
    checks.push({
      name: 'Frozen bloqué sur activations terminées',
      count: frozenStuck.rows[0].count,
      total: frozenStuck.rows[0].total,
      severity: frozenStuck.rows[0].count > 0 ? 'ERROR' : 'OK',
      message: frozenStuck.rows[0].count > 0
        ? `${frozenStuck.rows[0].count} activations avec ${frozenStuck.rows[0].total} XOF frozen non libéré`
        : 'Pas de frozen bloqué'
    });

    // 4. Webhooks
    const webhooksQuery = `SELECT COUNT(*) as count FROM webhook_logs;`;
    const webhooks = await client.query(webhooksQuery);
    
    checks.push({
      name: 'Webhooks SMS',
      count: webhooks.rows[0].count,
      severity: webhooks.rows[0].count === 0 ? 'WARNING' : 'OK',
      message: webhooks.rows[0].count === 0
        ? 'Aucun webhook reçu - Polling utilisé à la place'
        : `${webhooks.rows[0].count} webhooks reçus`
    });

    // 5. Provider logs
    const providerLogsQuery = `SELECT COUNT(*) as count FROM logs_provider;`;
    const providerLogs = await client.query(providerLogsQuery);
    
    checks.push({
      name: 'Provider API logs',
      count: providerLogs.rows[0].count,
      severity: providerLogs.rows[0].count === 0 ? 'WARNING' : 'OK',
      message: providerLogs.rows[0].count === 0
        ? 'Aucun log API - Les appels ne sont pas tracés'
        : `${providerLogs.rows[0].count} appels API tracés`
    });

    // Afficher résultats
    console.log('🔍 RÉSULTATS DES CHECKS:\n');
    
    checks.forEach((check, i) => {
      const icon = check.severity === 'ERROR' ? '❌' : 
                   check.severity === 'WARNING' ? '⚠️' : '✅';
      
      console.log(`${i + 1}. ${icon} ${check.name}`);
      console.log(`   ${check.message}`);
      console.log('');
    });

    // Résumé
    const errors = checks.filter(c => c.severity === 'ERROR').length;
    const warnings = checks.filter(c => c.severity === 'WARNING').length;
    const ok = checks.filter(c => c.severity === 'OK').length;

    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ:');
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   ✅ OK: ${ok}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================
async function main() {
  try {
    console.log('🔌 Connexion...\n');
    await client.connect();
    console.log('✅ Connecté !\n');

    await analyzeSMSActivations();
    await analyzeSMSMessagesTable();
    await analyzeRentalMessages();
    await analyzeProviderLogs();
    await analyzeSystemLogs();
    await analyzeWebhookLogs();
    await analyzeActivationFlow();
    await finalDiagnostic();

    console.log('='.repeat(80));
    console.log('✅ ANALYSE SMS TERMINÉE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

main();
