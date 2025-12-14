import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 ENQUÊTE: Recherche du code COUPABLE\n');
console.log('='.repeat(70));

try {
  // 1. Analyser les timestamps des activations fantômes
  console.log('\n📅 PHASE 1: ANALYSE TEMPORELLE\n');
  
  const { data: phantoms } = await supabase
    .from('activations')
    .select('id, status, created_at, updated_at, frozen_amount')
    .in('status', ['timeout', 'cancelled'])
    .eq('frozen_amount', 0)
    .order('created_at', { ascending: true })
    .limit(50);

  if (!phantoms || phantoms.length === 0) {
    console.log('Aucune activation trouvée');
    process.exit(0);
  }

  // Vérifier lesquelles n'ont pas de refund
  const phantomsList = [];
  for (const activation of phantoms) {
    const { data: operations } = await supabase
      .from('balance_operations')
      .select('operation_type, created_at')
      .eq('activation_id', activation.id);

    const hasFreeze = operations?.some(op => op.operation_type === 'freeze');
    const hasRefund = operations?.some(op => op.operation_type === 'refund' || op.operation_type === 'unfreeze');

    if (hasFreeze && !hasRefund) {
      phantomsList.push({
        ...activation,
        operations: operations || []
      });
    }
  }

  console.log(`Activations fantômes identifiées: ${phantomsList.length}`);

  if (phantomsList.length === 0) {
    console.log('Aucun fantôme trouvé!');
    process.exit(0);
  }

  // Première et dernière activation fantôme
  const first = phantomsList[0];
  const last = phantomsList[phantomsList.length - 1];

  console.log(`\nPremière activation fantôme: ${first.created_at}`);
  console.log(`Dernière activation fantôme:  ${last.created_at}`);
  console.log(`Période suspecte: ${Math.floor((new Date(last.created_at) - new Date(first.created_at)) / 3600000)} heures`);

  // 2. Analyser comment elles sont devenues timeout/cancelled
  console.log('\n' + '='.repeat(70));
  console.log('\n🔬 PHASE 2: ANALYSE DES TRANSITIONS DE STATUS\n');

  // Prendre 3 échantillons
  const samples = [phantomsList[0], phantomsList[Math.floor(phantomsList.length / 2)], phantomsList[phantomsList.length - 1]];

  for (const sample of samples) {
    console.log(`\n📋 Activation ${sample.id.substring(0, 8)}...`);
    console.log(`   Créée:     ${sample.created_at}`);
    console.log(`   Mise à jour: ${sample.updated_at}`);
    console.log(`   Status:    ${sample.status}`);
    
    const timeDiff = Math.floor((new Date(sample.updated_at) - new Date(sample.created_at)) / 60000);
    console.log(`   Durée:     ${timeDiff} minutes (créée → ${sample.status})`);

    const { data: ops } = await supabase
      .from('balance_operations')
      .select('operation_type, created_at, reason')
      .eq('activation_id', sample.id)
      .order('created_at', { ascending: true });

    console.log(`   Opérations:`);
    if (ops && ops.length > 0) {
      ops.forEach(op => {
        console.log(`      - ${op.operation_type}: ${op.reason || 'no reason'} (${op.created_at})`);
      });
    } else {
      console.log(`      (aucune)`);
    }
  }

  // 3. Comparer avec des activations SAINES
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ PHASE 3: COMPARAISON AVEC ACTIVATIONS SAINES\n');

  const { data: healthy } = await supabase
    .from('activations')
    .select('id, status, created_at, frozen_amount')
    .eq('status', 'timeout')
    .eq('frozen_amount', 0)
    .order('created_at', { ascending: false })
    .limit(10);

  let healthyCount = 0;
  if (healthy) {
    for (const activation of healthy) {
      const { data: operations } = await supabase
        .from('balance_operations')
        .select('operation_type')
        .eq('activation_id', activation.id);

      const hasRefund = operations?.some(op => op.operation_type === 'refund' || op.operation_type === 'unfreeze');
      if (hasRefund) {
        healthyCount++;
        if (healthyCount === 1) {
          console.log(`Activation SAINE trouvée: ${activation.id.substring(0, 8)}...`);
          console.log(`   Créée: ${activation.created_at}`);
          console.log(`   Opérations:`);
          operations?.forEach(op => {
            console.log(`      - ${op.operation_type}`);
          });
        }
      }
    }
  }

  console.log(`\n${healthyCount} activations SAINES trouvées avec refund correct`);

  // 4. Identifier le pattern de mise à jour
  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 PHASE 4: IDENTIFICATION DU COUPABLE\n');

  // Analyser les durées de vie
  const durations = phantomsList.map(p => {
    return Math.floor((new Date(p.updated_at) - new Date(p.created_at)) / 60000);
  });

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log(`Durée de vie moyenne: ${avgDuration.toFixed(1)} minutes`);
  console.log(`Min: ${minDuration} min, Max: ${maxDuration} min`);

  // Déterminer si c'est ~20 min (expiration normale) ou instantané (cancel manuel)
  const autoTimeouts = phantomsList.filter(p => {
    const duration = Math.floor((new Date(p.updated_at) - new Date(p.created_at)) / 60000);
    return duration >= 18 && duration <= 22 && p.status === 'timeout';
  });

  const manualCancels = phantomsList.filter(p => {
    const duration = Math.floor((new Date(p.updated_at) - new Date(p.created_at)) / 60000);
    return duration < 5 && p.status === 'cancelled';
  });

  const otherTimeouts = phantomsList.filter(p => {
    const duration = Math.floor((new Date(p.updated_at) - new Date(p.created_at)) / 60000);
    return duration >= 5 && duration < 18 && p.status === 'timeout';
  });

  console.log(`\n📊 Distribution:`);
  console.log(`   Timeouts automatiques (~20 min): ${autoTimeouts.length}`);
  console.log(`   Cancels manuels (<5 min):        ${manualCancels.length}`);
  console.log(`   Timeouts autres:                 ${otherTimeouts.length}`);

  // 5. Conclusion
  console.log('\n' + '='.repeat(70));
  console.log('\n🔎 VERDICT:\n');

  if (autoTimeouts.length > manualCancels.length) {
    console.log('🚨 COUPABLE PRINCIPAL: Système d\'expiration automatique\n');
    console.log('💡 ANALYSE:');
    console.log('   - Les activations expirent naturellement après ~20 minutes');
    console.log('   - Le status passe à "timeout" correctement');
    console.log('   - frozen_amount est mis à 0');
    console.log('   - ❌ MAIS le refund n\'est JAMAIS créé dans balance_operations\n');
    console.log('🔍 CODE SUSPECT:');
    console.log('   1. cleanup-expired-activations Edge Function');
    console.log('      → Pourrait faire UPDATE direct sans appeler atomic_refund()');
    console.log('   2. check-sms-activate-status Edge Function');
    console.log('      → Pourrait marquer timeout sans refund');
    console.log('   3. Un ancien TRIGGER SQL');
    console.log('      → Pourrait mettre status=timeout sans refund');
  } else if (manualCancels.length > autoTimeouts.length) {
    console.log('🚨 COUPABLE PRINCIPAL: Annulations manuelles\n');
    console.log('💡 ANALYSE:');
    console.log('   - Les activations sont annulées rapidement (<5 min)');
    console.log('   - Le status passe à "cancelled"');
    console.log('   - frozen_amount est mis à 0');
    console.log('   - ❌ MAIS le refund n\'est JAMAIS créé\n');
    console.log('🔍 CODE SUSPECT:');
    console.log('   1. API endpoint de cancel manuel');
    console.log('   2. check-sms-activate-status avec cancel immédiat');
    console.log('   3. Code frontend qui fait UPDATE direct');
  } else {
    console.log('⚠️ Pattern MIXTE détecté\n');
    console.log('Les deux mécanismes sont coupables:');
    console.log('   1. Système d\'expiration automatique');
    console.log('   2. Annulations manuelles');
  }

  console.log('\n📁 FICHIERS À INSPECTER:');
  console.log('   1. supabase/functions/cleanup-expired-activations/index.ts');
  console.log('   2. supabase/functions/check-sms-activate-status/index.ts');
  console.log('   3. migrations/*.sql (rechercher TRIGGER sur activations)');
  console.log('   4. Frontend: rechercher UPDATE activations SET status');

  console.log('\n' + '='.repeat(70));

} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.error(err.stack);
}
