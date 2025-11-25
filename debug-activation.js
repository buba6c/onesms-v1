// Script de diagnostic pour vérifier une activation
// Usage: node debug-activation.js <activation_id>

const activationId = process.argv[2] || '4450554107';

console.log(`🔍 Diagnostic pour l'activation: ${activationId}`);
console.log('');
console.log('📋 Étapes à vérifier manuellement dans Supabase Dashboard:');
console.log('');
console.log('1. Table "activations" - Chercher ID:', activationId);
console.log('   - Vérifier que order_id existe et n\'est pas NULL');
console.log('   - Vérifier que user_id existe');
console.log('   - Noter le order_id pour vérifier sur SMS-Activate');
console.log('');
console.log('2. Table "transactions" - Chercher related_activation_id:', activationId);
console.log('   - Vérifier qu\'une transaction "pending" existe');
console.log('');
console.log('3. SMS-Activate API - Tester manuellement:');
console.log('   - https://api.sms-activate.ae/stubs/handler_api.php?api_key=YOUR_KEY&action=getStatusV2&id=ORDER_ID');
console.log('');
console.log('4. Edge Function Logs - Vérifier les erreurs:');
console.log('   - Dashboard Supabase > Edge Functions > check-sms-activate-status > Logs');
console.log('');
console.log('💡 Causes possibles du 400 Bad Request:');
console.log('   ❌ order_id est NULL dans la base de données');
console.log('   ❌ activation n\'existe pas (ID incorrect)');
console.log('   ❌ user_id n\'existe pas');
console.log('   ❌ Erreur lors du parsing de la réponse API');
console.log('   ❌ Variable "code" au lieu de "smsCode" (déjà corrigé)');
