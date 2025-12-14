import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 ANALYSE DEEP DE LA STRUCTURE DE LA BASE DE DONNÉES\n');
console.log('='.repeat(70));

try {
  // 1. Structure de la table users
  console.log('\n1️⃣ STRUCTURE TABLE: users\n');
  const { data: usersData } = await supabase.from('users').select('*').limit(1);
  if (usersData && usersData[0]) {
    console.log('Colonnes disponibles:');
    Object.keys(usersData[0]).forEach(col => {
      const value = usersData[0][col];
      const type = typeof value === 'number' ? 'NUMERIC' : 
                   typeof value === 'boolean' ? 'BOOLEAN' :
                   value === null ? 'NULL' : 'TEXT';
      console.log(`   ${col}: ${type} (exemple: ${value})`);
    });
  }

  // 2. Structure de la table activations
  console.log('\n2️⃣ STRUCTURE TABLE: activations\n');
  const { data: activationsData } = await supabase.from('activations').select('*').limit(1);
  if (activationsData && activationsData[0]) {
    console.log('Colonnes disponibles:');
    Object.keys(activationsData[0]).forEach(col => {
      const value = activationsData[0][col];
      const type = typeof value === 'number' ? 'NUMERIC' : 
                   typeof value === 'boolean' ? 'BOOLEAN' :
                   value === null ? 'NULL' : 'TEXT';
      console.log(`   ${col}: ${type}`);
    });
  }

  // 3. Structure de la table balance_operations
  console.log('\n3️⃣ STRUCTURE TABLE: balance_operations\n');
  const { data: opsData } = await supabase.from('balance_operations').select('*').limit(1);
  if (opsData && opsData[0]) {
    console.log('Colonnes disponibles:');
    Object.keys(opsData[0]).forEach(col => {
      console.log(`   ${col}`);
    });
  } else {
    console.log('   ⚠️ Table vide ou n\'existe pas');
    
    // Tenter de créer une opération test pour voir les colonnes requises
    console.log('\n   Tentative d\'insertion test pour détecter les colonnes...');
  }

  // 4. Vérifier les types exacts via information_schema (si accessible)
  console.log('\n4️⃣ TYPES DE DONNÉES EXACTS\n');
  
  // Test des valeurs frozen_balance
  const { data: userTest } = await supabase
    .from('users')
    .select('id, balance, frozen_balance')
    .limit(1)
    .single();
    
  if (userTest) {
    console.log('User sample:');
    console.log(`   balance type: ${typeof userTest.balance} (${userTest.balance})`);
    console.log(`   frozen_balance type: ${typeof userTest.frozen_balance} (${userTest.frozen_balance})`);
  }

  // 5. Vérifier rentals existe
  console.log('\n5️⃣ VÉRIFICATION TABLE: rentals\n');
  const { data: rentalsData, error: rentalsError } = await supabase.from('rentals').select('*').limit(1);
  if (rentalsError) {
    console.log(`   ❌ Table rentals: ${rentalsError.message}`);
  } else {
    console.log('   ✅ Table rentals existe');
    if (rentalsData && rentalsData[0]) {
      console.log('   Colonnes:', Object.keys(rentalsData[0]).join(', '));
    }
  }

  // 6. Tester une insertion dans balance_operations pour voir les colonnes exactes
  console.log('\n6️⃣ TEST COLONNES balance_operations\n');
  
  const testOp = {
    user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
    operation_type: 'test',
    amount: 0,
    reason: 'Structure test'
  };
  
  const { data: insertTest, error: insertError } = await supabase
    .from('balance_operations')
    .insert(testOp)
    .select();
    
  if (insertError) {
    console.log('   Colonnes manquantes détectées:');
    console.log(`   ${insertError.message}`);
    
    // Parser l'erreur pour détecter les colonnes NOT NULL
    if (insertError.message.includes('null value')) {
      const match = insertError.message.match(/column "([^"]+)"/);
      if (match) {
        console.log(`   ⚠️ Colonne requise: ${match[1]}`);
      }
    }
  } else {
    console.log('   ✅ Test insertion réussie');
    if (insertTest && insertTest[0]) {
      console.log('   Colonnes créées:', Object.keys(insertTest[0]).join(', '));
    }
    
    // Nettoyer le test
    await supabase.from('balance_operations').delete().eq('reason', 'Structure test');
  }

  // 7. Analyser les contraintes et types via une vraie opération
  console.log('\n7️⃣ ANALYSE D\'UNE OPÉRATION RÉELLE\n');
  const { data: realOp } = await supabase
    .from('balance_operations')
    .select('*')
    .not('activation_id', 'is', null)
    .limit(1)
    .single();
    
  if (realOp) {
    console.log('   Structure complète d\'une opération:');
    Object.entries(realOp).forEach(([key, value]) => {
      console.log(`   ${key}: ${value === null ? 'NULL' : typeof value} = ${JSON.stringify(value)}`);
    });
  }

  // 8. Vérifier les fonctions PostgreSQL existantes
  console.log('\n8️⃣ FONCTIONS SQL EXISTANTES\n');
  
  const functionsToCheck = [
    'secure_freeze_balance',
    'secure_unfreeze_balance', 
    'atomic_refund',
    'atomic_commit',
    'process_expired_activations'
  ];
  
  for (const funcName of functionsToCheck) {
    const { error } = await supabase.rpc(funcName, {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      if (error.message.includes('Could not find') || error.message.includes('does not exist')) {
        console.log(`   ❌ ${funcName}: N'EXISTE PAS`);
      } else {
        console.log(`   ✅ ${funcName}: Existe (erreur test normale)`);
      }
    } else {
      console.log(`   ✅ ${funcName}: Existe et fonctionne`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 RECOMMANDATIONS POUR LE SQL:\n');
  
  console.log('1. Types de données:');
  console.log('   - balance/frozen_balance: NUMERIC ou DECIMAL');
  console.log('   - IDs: UUID');
  console.log('   - timestamps: TIMESTAMPTZ\n');
  
  console.log('2. Colonnes balance_operations:');
  console.log('   - Vérifier si balance_before/after sont requis');
  console.log('   - Vérifier si frozen_before/after sont requis');
  console.log('   - Vérifier si activation_id/rental_id peuvent être NULL\n');
  
  console.log('3. Gestion d\'erreurs PostgreSQL:');
  console.log('   - Utiliser RAISE EXCEPTION au lieu de RAISE ERROR');
  console.log('   - EXCEPTION WHEN OTHERS pour catch');

} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.error(err.stack);
}
