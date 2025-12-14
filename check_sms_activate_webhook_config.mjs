import 'dotenv/config';

console.log('🔍 VÉRIFICATION CONFIGURATION SMS-ACTIVATE\n');

const apiKey = process.env.VITE_SMS_ACTIVATE_API_KEY || process.env.SMS_ACTIVATE_API_KEY_LOCAL;

if (!apiKey) {
  console.error('❌ SMS_ACTIVATE_API_KEY manquante dans .env');
  process.exit(1);
}

console.log('✅ API Key trouvée:', apiKey.substring(0, 10) + '...\n');

// Vérifier la config webhook chez SMS-Activate
async function checkWebhookConfig() {
  const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getWebhookInfo`;
  
  console.log('🌐 Vérification webhook SMS-Activate...');
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log('📋 Réponse:', text);
    
    // Si pas de webhook configuré, proposer de le configurer
    if (text.includes('NO_WEBHOOK') || text === '') {
      console.log('\n⚠️  AUCUN WEBHOOK CONFIGURÉ chez SMS-Activate !');
      console.log('\n🔧 Pour configurer le webhook:');
      console.log('1. Aller sur: https://sms-activate.org/ru/api2');
      console.log('2. Section "Webhook настройки"');
      console.log('3. URL à configurer:');
      console.log('   https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/webhook-sms-activate');
      console.log('4. Paramètres:');
      console.log('   - activationId: {ACTIVATION_ID}');
      console.log('   - code: {CODE}');
      console.log('   - text: {FULL_SMS}');
      console.log('   - service: {SERVICE}');
      console.log('   - country: {COUNTRY}');
      console.log('   - receivedAt: {DATETIME}');
    } else {
      console.log('\n✅ Webhook configuré:', text);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Vérifier que l'API fonctionne
async function checkAPIAccess() {
  const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getBalance`;
  
  console.log('\n💰 Vérification accès API...');
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ACCESS_')) {
      const balance = text.split(':')[1];
      console.log('✅ Balance SMS-Activate:', balance, 'RUB');
    } else {
      console.log('❌ Erreur API:', text);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

async function main() {
  await checkAPIAccess();
  await checkWebhookConfig();
  
  console.log('\n📊 RÉSUMÉ:');
  console.log('1. Si webhook non configuré → Configurer sur SMS-Activate dashboard');
  console.log('2. Si webhook configuré mais 0 logs → Vérifier URL et format payload');
  console.log('3. Alternative: Activer polling automatique (cron-check-pending-sms)');
}

main();
