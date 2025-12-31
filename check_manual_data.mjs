console.log('🔍 VÉRIFICATION MANUELLE - DONNÉES BASE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n📊 POUR VÉRIFIER VOS DONNÉES:');

console.log('\n1️⃣ OUVRIR DASHBOARD SUPABASE:');
console.log('   🔗 URL: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw');
console.log('   📁 Aller dans: Table Editor');
console.log('   📄 Table: transactions');

console.log('\n2️⃣ RECHERCHER VOTRE TRANSACTION:');
console.log('   📅 Filtrer par: created_at > aujourd\'hui');
console.log('   👤 Filtrer par: votre user_id');
console.log('   💰 Vérifier: montant correspondant');

console.log('\n3️⃣ ANALYSER STATUS TRANSACTION:');
console.log('   📱 Status = "pending": Webhook pas encore reçu');
console.log('   📱 Status = "completed": Transaction OK, vérifier balance');
console.log('   📱 Status = "pending_credit_error": Erreur crédit');
console.log('   📱 Status = "failed": Échec paiement');

console.log('\n4️⃣ VÉRIFIER MÉTADONNÉES:');
console.log('   🔔 webhook_received: true/false');
console.log('   ⏰ webhook_timestamp: quand reçu');
console.log('   🎫 paydunya_token: token PayDunya');
console.log('   💳 activations: crédits à accorder');
console.log('   🚨 error: message d\'erreur si présent');

console.log('\n5️⃣ VÉRIFIER BALANCE UTILISATEUR:');
console.log('   📄 Table: users');
console.log('   👤 Chercher votre user_id');
console.log('   💰 Colonne: balance (nombre d\'activations)');

console.log('\n📋 SCÉNARIOS TYPIQUES:');

console.log('\n✅ SCÉNARIO 1: TOUT OK');
console.log('   • Transaction status = "completed"');
console.log('   • webhook_received = true');
console.log('   • Balance utilisateur augmentée');
console.log('   ➤ Paiement traité avec succès');

console.log('\n⏰ SCÉNARIO 2: EN ATTENTE');
console.log('   • Transaction status = "pending"');
console.log('   • webhook_received = false ou absent');
console.log('   • Balance utilisateur inchangée');
console.log('   ➤ Attendre 5 minutes, webhook en cours');

console.log('\n�� SCÉNARIO 3: ERREUR CRÉDIT');
console.log('   • Transaction status = "pending_credit_error"');
console.log('   • webhook_received = true');
console.log('   • metadata.error présent');
console.log('   ➤ Crédit manuel nécessaire');

console.log('\n❌ SCÉNARIO 4: ÉCHEC PAIEMENT');
console.log('   • Transaction status = "failed"');
console.log('   • Problème côté PayDunya');
console.log('   ➤ Reprendre le paiement');

console.log('\n🔧 ACTIONS CORRECTIVES:');

console.log('\n💳 SI CRÉDIT MANUEL REQUIS:');
console.log('   1. Noter transaction_id');
console.log('   2. Noter paydunya_token');
console.log('   3. Utiliser RPC secure_moneyfusion_credit_v2');
console.log('   4. Vérifier balance après');

console.log('\n📞 SI WEBHOOK NON REÇU (> 10 min):');
console.log('   1. Vérifier URLs accessibles');
console.log('   2. Tester webhook manuellement');
console.log('   3. Vérifier logs PayDunya');
console.log('   4. Contacter support PayDunya');

console.log('\n🎯 INFORMATIONS À COLLECTER:');

const infoNeeded = [
  '🆔 Transaction ID (UUID)',
  '👤 User ID',
  '💰 Montant payé (FCFA)', 
  '⏰ Heure paiement exacte',
  '🎫 Token PayDunya (si disponible)',
  '📱 Status transaction actuel',
  '🔔 webhook_received (true/false)',
  '🚨 Message erreur (si présent)',
  '💳 Balance utilisateur avant/après',
  '📱 Moyen paiement (Wave, Orange Money, etc.)'
];

console.log('\n📝 CHECKLIST DÉBOGAGE:');
infoNeeded.forEach((info, index) => {
  console.log(`   ${index + 1}. ${info}`);
});

console.log('\n🔄 APRÈS COLLECTE DONNÉES:');
console.log('   📊 Fournir toutes les infos ci-dessus');
console.log('   🎯 Diagnostic précis possible');
console.log('   💪 Solution rapide applicable');
console.log('   ✅ Crédit manuel si nécessaire');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
