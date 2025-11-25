// Test script pour vérifier le fonctionnement de Rent
// Ouvrez la console du navigateur (F12) et collez ce code

console.log('🧪 [TEST-RENT] Démarrage du test...');

// Configuration
const TEST_CONFIG = {
  service: 'wa', // WhatsApp (devrait fonctionner)
  country: 'russia',
  duration: '4hours',
  userId: 'YOUR_USER_ID' // Remplacez par votre ID utilisateur
};

async function testRentFlow() {
  console.log('📋 [TEST-RENT] Config:', TEST_CONFIG);
  
  try {
    // 1. Test get-rent-services
    console.log('\n1️⃣ Test get-rent-services...');
    const rentTimeMap = {
      '4hours': '4',
      '1day': '24', 
      '1week': '168',
      '1month': '720'
    };
    
    const { data: servicesData, error: servicesError } = await supabase.functions.invoke('get-rent-services', {
      body: { rentTime: rentTimeMap[TEST_CONFIG.duration] }
    });
    
    if (servicesError) {
      console.error('❌ [TEST-RENT] get-rent-services error:', servicesError);
      return;
    }
    
    console.log('✅ [TEST-RENT] Services data:', servicesData);
    console.log('📊 [TEST-RENT] Available services:', Object.keys(servicesData.services || {}));
    console.log('🌍 [TEST-RENT] Available countries:', servicesData.countries);
    
    // Vérifier si le service existe
    if (servicesData.services && servicesData.services[TEST_CONFIG.service]) {
      console.log(`✅ [TEST-RENT] Service ${TEST_CONFIG.service} found:`, servicesData.services[TEST_CONFIG.service]);
    } else {
      console.warn(`⚠️ [TEST-RENT] Service ${TEST_CONFIG.service} not found, fallback needed`);
      
      if (servicesData.services['any']) {
        console.log('🔄 [TEST-RENT] Fallback to "any":', servicesData.services['any']);
      } else if (servicesData.services['full']) {
        console.log('🔄 [TEST-RENT] Fallback to "full":', servicesData.services['full']);
      }
    }
    
    // 2. Test buy-sms-activate-rent (ATTENTION: Ceci créera une vraie location!)
    console.log('\n2️⃣ Test buy-sms-activate-rent (commenté pour éviter achat réel)...');
    console.log('Pour tester l\'achat, décommentez le code ci-dessous:');
    console.log(`
    const { data: buyData, error: buyError } = await supabase.functions.invoke('buy-sms-activate-rent', {
      body: {
        country: '${TEST_CONFIG.country}',
        product: '${TEST_CONFIG.service}',
        userId: '${TEST_CONFIG.userId}',
        duration: '${TEST_CONFIG.duration}'
      }
    });
    
    if (buyError) {
      console.error('❌ [TEST-RENT] buy error:', buyError);
    } else {
      console.log('✅ [TEST-RENT] buy success:', buyData);
    }
    `);
    
  } catch (error) {
    console.error('❌ [TEST-RENT] Exception:', error);
  }
}

// Lancer le test
testRentFlow();

console.log('\n📝 [TEST-RENT] Instructions:');
console.log('1. Vérifiez que get-rent-services retourne bien des services');
console.log('2. Vérifiez que votre service (wa) existe ou qu\'un fallback est disponible');
console.log('3. Si tout est OK, décommentez le code d\'achat et remplacez YOUR_USER_ID');
console.log('4. Consultez les logs détaillés ci-dessus');
