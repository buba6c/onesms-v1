import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('📊 ANALYSE COMPLÈTE DES EXPIRATIONS\n');

try {
  // Toutes les activations expirées (ANY status)
  const { data: allExpired } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, expires_at, created_at')
    .lt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(20);

  console.log('1️⃣ Dernières activations expirées (toutes statuts):');
  const statusCount = {};
  let blockedCount = 0;
  let blockedAmount = 0;

  allExpired?.forEach(a => {
    statusCount[a.status] = (statusCount[a.status] || 0) + 1;
    if (parseFloat(a.frozen_amount) > 0) {
      blockedCount++;
      blockedAmount += parseFloat(a.frozen_amount);
    }
  });

  console.log('\n📈 Distribution par status:');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log(`\n🔒 Activations avec frozen_amount > 0: ${blockedCount}`);
  console.log(`💰 Montant total bloqué: ${blockedAmount} Ⓐ`);

  // Check balance_operations pour voir les refunds
  const { data: refunds } = await supabase
    .from('balance_operations')
    .select('id, user_id, amount, operation_type, reason, created_at')
    .eq('operation_type', 'refund')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`\n2️⃣ Derniers refunds (balance_operations):`);
  if (refunds && refunds.length > 0) {
    refunds.forEach(r => {
      console.log(`   ${r.created_at.substring(0, 19)}: +${r.amount} Ⓐ (${r.reason || 'no reason'})`);
    });
  } else {
    console.log('   ⚠️ Aucun refund trouvé!');
  }

  console.log(`\n3️⃣ Vérification des fonctions SQL disponibles:`);

  // Tester secure_unfreeze_balance
  const { error: secureError } = await supabase
    .rpc('secure_unfreeze_balance', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_activation_id: '00000000-0000-0000-0000-000000000000',
      p_refund_to_balance: true,
      p_refund_reason: 'test'
    });

  if (secureError) {
    if (secureError.message.includes('not found') || secureError.message.includes('does not exist')) {
      console.log('   ❌ secure_unfreeze_balance() MANQUANTE');
    } else {
      console.log('   ✅ secure_unfreeze_balance() existe (erreur test attendue)');
    }
  } else {
    console.log('   ✅ secure_unfreeze_balance() existe');
  }

  // Tester atomic_refund
  const { error: atomicError } = await supabase
    .rpc('atomic_refund', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_activation_id: '00000000-0000-0000-0000-000000000000'
    });

  if (atomicError) {
    if (atomicError.message.includes('not found') || atomicError.message.includes('does not exist')) {
      console.log('   ❌ atomic_refund() MANQUANTE');
    } else {
      console.log('   ✅ atomic_refund() existe (erreur test attendue)');
    }
  } else {
    console.log('   ✅ atomic_refund() existe');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 DIAGNOSTIC FINAL:\n');

  if (blockedCount > 0) {
    console.log(`❌ ${blockedCount} activations BLOQUÉES avec ${blockedAmount} Ⓐ gelés!`);
    console.log('\n💡 ACTIONS À FAIRE:');
    console.log('   1. Déployer secure_frozen_balance_system.sql');
    console.log('   2. Configurer CRON jobs avec SETUP_CRON_JOBS.sql');
    console.log('   3. Déployer cleanup-expired-activations Edge Function');
  } else if (refunds && refunds.length > 0) {
    console.log('✅ Système fonctionne: refunds détectés dans l\'historique');
    console.log('💡 Les expirations sont traitées correctement');
  } else {
    console.log('⚠️ Aucun refund dans l\'historique ET aucune activation bloquée');
    console.log('💡 Soit:');
    console.log('   1. Jamais eu d\'expiration (toutes les activations reçoivent SMS)');
    console.log('   2. Système de refund jamais configuré');
    console.log('   3. CRON jobs non configurés → configurer SETUP_CRON_JOBS.sql');
  }

} catch (err) {
  console.error('❌ Erreur:', err.message);
}
