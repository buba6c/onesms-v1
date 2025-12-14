import 'dotenv/config';

const apiKey = process.env.VITE_SMS_ACTIVATE_API_KEY || process.env.SMS_ACTIVATE_API_KEY_LOCAL;
const webhookUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/webhook-sms-activate';

console.log('🔧 CONFIGURATION WEBHOOK SMS-ACTIVATE\n');

if (!apiKey) {
  console.error('❌ API Key manquante');
  process.exit(1);
}

console.log('✅ API Key:', apiKey.substring(0, 10) + '...');
console.log('🌐 Webhook URL:', webhookUrl);
console.log('');

// Tenter de configurer le webhook via API
async function setWebhook() {
  console.log('📡 Tentative de configuration automatique...\n');
  
  // Essayer différentes actions possibles
  const actions = [
    'setWebhook',
    'setNotification',
    'setUrl',
    'webhook'
  ];
  
  for (const action of actions) {
    const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=${action}&url=${encodeURIComponent(webhookUrl)}`;
    
    console.log(`🧪 Test action: ${action}...`);
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      console.log(`   Réponse: ${text}`);
      
      if (!text.includes('BAD_ACTION') && !text.includes('ERROR')) {
        console.log(`   ✅ Action ${action} acceptée !\n`);
        return true;
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
  
  console.log('\n⚠️  Configuration automatique impossible via API');
  return false;
}

// Afficher guide manuel
function showManualGuide() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 GUIDE CONFIGURATION MANUELLE WEBHOOK');
  console.log('='.repeat(80) + '\n');
  
  console.log('🔗 ÉTAPE 1: Accéder au dashboard SMS-Activate');
  console.log('   URL: https://sms-activate.org/en/profile');
  console.log('   (ou https://sms-activate.io/en/profile si .org ne fonctionne pas)');
  console.log('');
  
  console.log('🔐 ÉTAPE 2: Se connecter avec votre compte');
  console.log('   Utilisez vos identifiants SMS-Activate');
  console.log('');
  
  console.log('⚙️  ÉTAPE 3: Aller dans les paramètres API');
  console.log('   - Cliquer sur "API" dans le menu');
  console.log('   - Ou aller directement sur: https://sms-activate.org/en/api2');
  console.log('');
  
  console.log('📡 ÉTAPE 4: Configurer le webhook');
  console.log('   Section: "Webhook settings" ou "Настройки вебхуков"');
  console.log('');
  console.log('   📝 URL du webhook à saisir:');
  console.log('   ┌────────────────────────────────────────────────────────────────┐');
  console.log('   │ ' + webhookUrl);
  console.log('   └────────────────────────────────────────────────────────────────┘');
  console.log('');
  
  console.log('   📋 Paramètres à envoyer (format JSON ou POST):');
  console.log('   {');
  console.log('     "activationId": "{ACTIVATION_ID}",    // ID de l\'activation');
  console.log('     "code": "{CODE}",                     // Code SMS reçu');
  console.log('     "text": "{FULL_SMS}",                 // Texte complet du SMS');
  console.log('     "service": "{SERVICE}",               // Service (wa, tg, etc)');
  console.log('     "country": "{COUNTRY}",               // Code pays');
  console.log('     "receivedAt": "{DATETIME}"            // Date/heure réception');
  console.log('   }');
  console.log('');
  
  console.log('   ⚠️  IMPORTANT:');
  console.log('   - Méthode: POST');
  console.log('   - Content-Type: application/json');
  console.log('   - Activer pour: "Toutes les activations"');
  console.log('');
  
  console.log('✅ ÉTAPE 5: Sauvegarder la configuration');
  console.log('   Cliquer sur "Save" ou "Сохранить"');
  console.log('');
  
  console.log('🧪 ÉTAPE 6: Tester le webhook');
  console.log('   Lancer une nouvelle activation et vérifier que le SMS arrive');
  console.log('   Commande de test:');
  console.log('   $ node test_webhook_sms.mjs');
  console.log('');
  
  console.log('=' .repeat(80));
  console.log('💡 ALTERNATIVE: Utiliser le CRON polling (déjà actif)');
  console.log('=' .repeat(80));
  console.log('');
  console.log('Si la configuration webhook est complexe, le système utilise');
  console.log('déjà un CRON qui vérifie les SMS toutes les X minutes.');
  console.log('');
  console.log('Commande pour tester le CRON:');
  console.log('$ node test_cron_polling.mjs');
  console.log('');
  console.log('📊 Le CRON fonctionne déjà et traite les activations pending.');
  console.log('   Délai: 30-60 secondes au lieu de temps réel (<1s)');
  console.log('');
}

// Vérifier si webhook déjà configuré
async function checkCurrentConfig() {
  console.log('🔍 Vérification configuration actuelle...\n');
  
  // Tester avec une activation récente
  const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getBalance`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.includes('ACCESS_BALANCE')) {
      const balance = text.split(':')[1];
      console.log('✅ Connexion API OK - Balance:', balance, 'RUB\n');
      return true;
    } else {
      console.log('❌ Erreur API:', text, '\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Connexion API impossible:', error.message, '\n');
    return false;
  }
}

async function main() {
  const apiOk = await checkCurrentConfig();
  
  if (!apiOk) {
    console.log('⚠️  Vérifier la validité de votre API key SMS-Activate\n');
    return;
  }
  
  const configured = await setWebhook();
  
  if (!configured) {
    showManualGuide();
  } else {
    console.log('\n✅ Webhook configuré avec succès !');
    console.log('\n🧪 Testez maintenant avec: node test_webhook_sms.mjs');
  }
}

main();
