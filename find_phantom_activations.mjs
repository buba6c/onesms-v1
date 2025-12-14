import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 RECHERCHE DES ACTIVATIONS "FANTÔMES"\n');
console.log('Recherche: status IN (timeout, cancelled) AND frozen_amount = 0');
console.log('           MAIS aucune operation refund/unfreeze\n');
console.log('='.repeat(70));

try {
  // 1. Toutes les activations timeout/cancelled avec frozen_amount = 0
  const { data: candidates } = await supabase
    .from('activations')
    .select('id, user_id, service_code, status, price, frozen_amount, created_at')
    .in('status', ['timeout', 'cancelled'])
    .eq('frozen_amount', 0)
    .order('created_at', { ascending: false })
    .limit(100);

  console.log(`\n📊 ${candidates?.length || 0} activations timeout/cancelled trouvées\n`);

  const phantomActivations = [];

  // 2. Pour chaque activation, vérifier s'il y a un refund/unfreeze
  for (const activation of candidates || []) {
    const { data: operations } = await supabase
      .from('balance_operations')
      .select('operation_type')
      .eq('activation_id', activation.id)
      .in('operation_type', ['refund', 'unfreeze']);

    if (!operations || operations.length === 0) {
      // Phantom trouvé!
      phantomActivations.push(activation);
    }
  }

  console.log(`\n🚨 ${phantomActivations.length} ACTIVATIONS FANTÔMES TROUVÉES!\n`);

  if (phantomActivations.length > 0) {
    console.log('Détails:\n');
    
    let totalLost = 0;
    const userStats = {};

    phantomActivations.forEach((a, i) => {
      console.log(`${i + 1}. ID: ${a.id.substring(0, 8)}...`);
      console.log(`   User: ${a.user_id.substring(0, 8)}...`);
      console.log(`   Service: ${a.service_code}, Status: ${a.status}`);
      console.log(`   Price: ${a.price} Ⓐ (PERDUE)`);
      console.log(`   Date: ${a.created_at}`);
      console.log('');

      totalLost += parseFloat(a.price);
      
      if (!userStats[a.user_id]) {
        userStats[a.user_id] = { count: 0, amount: 0 };
      }
      userStats[a.user_id].count++;
      userStats[a.user_id].amount += parseFloat(a.price);
    });

    console.log('='.repeat(70));
    console.log(`\n💰 TOTAL PERDU: ${totalLost} Ⓐ`);
    console.log(`👥 Utilisateurs affectés: ${Object.keys(userStats).length}\n`);

    console.log('📊 Par utilisateur:\n');
    Object.entries(userStats).forEach(([userId, stats]) => {
      console.log(`   User ${userId.substring(0, 8)}...: ${stats.count} activations, ${stats.amount} Ⓐ perdus`);
    });

    // 3. Générer le script de correction
    console.log('\n' + '='.repeat(70));
    console.log('\n🔧 SCRIPT DE CORRECTION SQL:\n');
    console.log('-- Exécuter ce script pour restaurer les balances\n');

    const userAmounts = {};
    phantomActivations.forEach(a => {
      if (!userAmounts[a.user_id]) {
        userAmounts[a.user_id] = 0;
      }
      userAmounts[a.user_id] += parseFloat(a.price);
    });

    console.log('BEGIN;');
    console.log('');
    
    Object.entries(userAmounts).forEach(([userId, amount]) => {
      console.log(`-- User ${userId.substring(0, 8)}...: restaurer ${amount} Ⓐ`);
      console.log(`UPDATE users`);
      console.log(`SET balance = balance + ${amount},`);
      console.log(`    frozen_balance = frozen_balance - ${amount}`);
      console.log(`WHERE id = '${userId}';`);
      console.log('');
    });

    phantomActivations.forEach(a => {
      console.log(`-- Créer l'opération de refund manquante`);
      console.log(`INSERT INTO balance_operations (user_id, activation_id, amount, operation_type, reason)`);
      console.log(`VALUES ('${a.user_id}', '${a.id}', ${a.price}, 'refund', 'Phantom refund restoration - system fix');`);
      console.log('');
    });

    console.log('COMMIT;');
    console.log('');
    console.log('-- Vérification après correction:');
    console.log('SELECT * FROM v_frozen_balance_health;');

  } else {
    console.log('✅ Aucune activation fantôme trouvée - Système cohérent!');
  }

} catch (err) {
  console.error('❌ Erreur:', err.message);
}
