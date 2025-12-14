import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 VÉRIFICATION FINALE: Fonctions SQL déployées?\n');
console.log('='.repeat(70));

try {
  // Test 1: atomic_refund existe?
  console.log('\n1️⃣ Test de atomic_refund()...\n');
  const { data: atomicTest, error: atomicError } = await supabase
    .rpc('atomic_refund', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_activation_id: '00000000-0000-0000-0000-000000000000'
    });

  if (atomicError) {
    if (atomicError.message.includes('Could not find') || atomicError.message.includes('does not exist')) {
      console.log('   ❌ atomic_refund() N\'EXISTE PAS dans Supabase!');
      console.log('   💡 Ceci est LE COUPABLE principal');
    } else {
      console.log('   ✅ atomic_refund() existe (erreur test normale)');
      console.log(`   Erreur: ${atomicError.message}`);
    }
  } else {
    console.log('   ✅ atomic_refund() existe et fonctionne');
  }

  // Test 2: secure_unfreeze_balance existe?
  console.log('\n2️⃣ Test de secure_unfreeze_balance()...\n');
  const { data: secureTest, error: secureError } = await supabase
    .rpc('secure_unfreeze_balance', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_activation_id: '00000000-0000-0000-0000-000000000000',
      p_refund_to_balance: true,
      p_refund_reason: 'test'
    });

  if (secureError) {
    if (secureError.message.includes('Could not find') || secureError.message.includes('does not exist')) {
      console.log('   ❌ secure_unfreeze_balance() N\'EXISTE PAS!');
    } else {
      console.log('   ✅ secure_unfreeze_balance() existe (erreur test normale)');
      console.log(`   Erreur: ${secureError.message}`);
    }
  } else {
    console.log('   ✅ secure_unfreeze_balance() existe');
  }

  // Test 3: process_expired_activations existe?
  console.log('\n3️⃣ Test de process_expired_activations()...\n');
  const { data: processTest, error: processError } = await supabase
    .rpc('process_expired_activations');

  if (processError) {
    if (processError.message.includes('Could not find') || processError.message.includes('does not exist')) {
      console.log('   ❌ process_expired_activations() N\'EXISTE PAS!');
    } else {
      console.log('   ✅ process_expired_activations() existe (erreur test normale)');
      console.log(`   Erreur: ${processError.message}`);
    }
  } else {
    console.log('   ✅ process_expired_activations() existe');
    console.log(`   Résultat:`, processTest);
  }

  // Test 4: atomic_commit existe?
  console.log('\n4️⃣ Test de atomic_commit()...\n');
  const { data: commitTest, error: commitError } = await supabase
    .rpc('atomic_commit', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_activation_id: '00000000-0000-0000-0000-000000000000',
      p_reason: 'test'
    });

  if (commitError) {
    if (commitError.message.includes('Could not find') || commitError.message.includes('does not exist')) {
      console.log('   ❌ atomic_commit() N\'EXISTE PAS!');
    } else {
      console.log('   ✅ atomic_commit() existe (erreur test normale)');
      console.log(`   Erreur: ${commitError.message}`);
    }
  } else {
    console.log('   ✅ atomic_commit() existe');
  }

  // Test 5: Lister TOUTES les fonctions custom
  console.log('\n5️⃣ Liste des fonctions SQL custom déployées...\n');
  
  // Essayer de lister via une query directe
  const { data: functions, error: funcError } = await supabase
    .from('pg_proc')
    .select('proname')
    .like('proname', '%refund%');

  if (funcError) {
    console.log('   ⚠️ Impossible de lister les fonctions (RLS?)');
  } else if (functions && functions.length > 0) {
    console.log('   Fonctions trouvées:');
    functions.forEach(f => console.log(`      - ${f.proname}`));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 CONCLUSION DE L\'ENQUÊTE:\n');

  const missing = [];
  if (atomicError?.message.includes('Could not find')) missing.push('atomic_refund()');
  if (secureError?.message.includes('Could not find')) missing.push('secure_unfreeze_balance()');
  if (processError?.message.includes('Could not find')) missing.push('process_expired_activations()');
  if (commitError?.message.includes('Could not find')) missing.push('atomic_commit()');

  if (missing.length > 0) {
    console.log('🚨 COUPABLE IDENTIFIÉ!\n');
    console.log(`   ${missing.length} fonctions SQL MANQUANTES dans Supabase:\n`);
    missing.forEach(fn => console.log(`      ❌ ${fn}`));
    console.log('\n💡 EXPLICATION:');
    console.log('   - Les Edge Functions TypeScript sont déployées');
    console.log('   - Elles appellent ces fonctions SQL');
    console.log('   - ❌ MAIS ces fonctions N\'EXISTENT PAS dans la DB!');
    console.log('   - Les appels échouent silencieusement');
    console.log('   - Les UPDATE se font quand même');
    console.log('   - Résultat: frozen_amount=0 SANS refund\n');
    console.log('🛠️ SOLUTION:');
    console.log('   Déployer les migrations SQL manquantes:');
    console.log('   1. migrations/secure_frozen_balance_system.sql');
    console.log('   2. migrations/20251203_create_atomic_timeout_processor.sql');
  } else {
    console.log('✅ Toutes les fonctions SQL existent!\n');
    console.log('💡 Le problème doit venir d\'ailleurs:');
    console.log('   - Vérifier les logs des Edge Functions');
    console.log('   - Vérifier si CRON jobs sont configurés');
    console.log('   - Vérifier les RLS policies');
  }

  console.log('\n' + '='.repeat(70));

} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.error(err.stack);
}
