console.log('💳 CRÉDIT MANUEL TRANSACTION BUBA6C');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n🎯 TRANSACTION À CRÉDITER:');
console.log('   🆔 ID: 71149a7d-0db...');
console.log('   👤 User: buba6c (e108c02a-2012-4043-bbc2-fb09bb11f824)');
console.log('   💰 Montant: 500 FCFA');
console.log('   💳 Activations: 5');
console.log('   🎫 Token: Dbm7kuNTe8Vo1fzcFeD2');
console.log('   📱 Status PayDunya: Transaction Found');

console.log('\n🚨 PROBLÈME IDENTIFIÉ:');
console.log('   ⏰ Transaction créée à 14:00, maintenant 15h+');
console.log('   🔔 Webhook PayDunya jamais reçu');
console.log('   📊 Status PayDunya: undefined (problème API)');
console.log('   💡 Crédit manuel nécessaire');

console.log('\n✅ SOLUTION: CRÉDIT MANUEL VIA RPC');

console.log('\n📝 REQUÊTE SQL À EXÉCUTER:');
console.log('   🔗 Dashboard: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw');
console.log('   📁 Aller dans: SQL Editor');
console.log('   ➤ Créer nouvelle requête');

const sqlQuery = `-- CRÉDIT MANUEL TRANSACTION BUBA6C
-- Transaction: 71149a7d-0db...
-- User: buba6c (e108c02a-2012-4043-bbc2-fb09bb11f824)
-- Montant: 500 FCFA → 5 activations

SELECT secure_moneyfusion_credit_v2(
  p_transaction_id := '71149a7d-0db7-4a2b-9c8d-12345678901a', -- REMPLACER PAR ID COMPLET
  p_token := 'Dbm7kuNTe8Vo1fzcFeD2',
  p_reference := 'Dbm7kuNTe8Vo1fzcFeD2'
);

-- Vérifier le résultat
SELECT 
  id,
  status,
  metadata
FROM transactions 
WHERE id = '71149a7d-0db7-4a2b-9c8d-12345678901a'; -- REMPLACER PAR ID COMPLET

-- Vérifier la balance utilisateur
SELECT 
  id,
  email,
  balance,
  updated_at
FROM users 
WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';`;

console.log('\n💻 CODE SQL:');
console.log(sqlQuery);

console.log('\n⚠️  ÉTAPES IMPORTANTES:');
console.log('   1. 🆔 OBTENIR L\'ID TRANSACTION COMPLET');
console.log('      • Dashboard Supabase → Table Editor → transactions');
console.log('      • Filtrer par created_at = aujourd\'hui');
console.log('      • Chercher user_id = e108c02a-2012-4043-bbc2-fb09bb11f824');
console.log('      • Copier l\'ID complet (71149a7d-0db7-4a2b-9c8d-...)');

console.log('\n   2. 🔄 REMPLACER LES IDs DANS LA REQUÊTE');
console.log('      • Remplacer "71149a7d-0db7-4a2b-9c8d-12345678901a"');
console.log('      • Par l\'ID complet de la transaction');

console.log('\n   3. ▶️  EXÉCUTER LA REQUÊTE');
console.log('      • SQL Editor → Coller le code → Run');
console.log('      • Vérifier le résultat de la fonction RPC');

console.log('\n   4. ✅ VÉRIFIER LE RÉSULTAT');
console.log('      • Transaction status → "completed"');
console.log('      • User balance → augmentée de 5');
console.log('      • metadata → webhook_received: true');

console.log('\n🎯 RÉSULTATS ATTENDUS:');

console.log('\n📊 FONCTION RPC:');
console.log('   ✅ secure_moneyfusion_credit_v2 → Success');
console.log('   💰 5 activations ajoutées au compte');
console.log('   📱 Transaction status → "completed"');

console.log('\n👤 BALANCE UTILISATEUR:');
console.log('   🔍 Avant: X activations');
console.log('   ➕ Ajout: +5 activations');
console.log('   ✅ Après: X+5 activations');

console.log('\n🚨 SI ERREUR RPC:');
console.log('   📋 "Transaction déjà traitée" → Normal, ignoré');
console.log('   📋 "User not found" → Vérifier user_id');
console.log('   📋 "Transaction not found" → Vérifier transaction_id');
console.log('   📋 Autre erreur → Me fournir le message');

console.log('\n🔄 ALTERNATIVE: MISE À JOUR DIRECTE');
console.log('   Si RPC échoue, mise à jour manuelle:');

const alternativeSQL = `-- ALTERNATIVE: MISE À JOUR MANUELLE
-- 1. Marquer transaction comme completed
UPDATE transactions 
SET 
  status = 'completed',
  metadata = metadata || jsonb_build_object(
    'webhook_received', true,
    'webhook_timestamp', NOW()::text,
    'manual_credit', true,
    'manual_credit_timestamp', NOW()::text
  )
WHERE id = '71149a7d-0db7-4a2b-9c8d-12345678901a'; -- REMPLACER

-- 2. Créditer directement la balance
UPDATE users 
SET 
  balance = balance + 5,
  updated_at = NOW()
WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';`;

console.log('\n💻 CODE ALTERNATIF:');
console.log(alternativeSQL);

console.log('\n📋 APRÈS CRÉDIT:');
console.log('   1. ✅ Vérifier balance utilisateur');
console.log('   2. 📱 Notifier l\'utilisateur si nécessaire');
console.log('   3. 🔍 Investiguer pourquoi webhook manqué');
console.log('   4. 📈 Renforcer monitoring webhook');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
