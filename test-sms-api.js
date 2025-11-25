// Script Node.js pour tester l'API SMS-Activate
// Usage: node test-sms-api.js <API_KEY>

const apiKey = process.argv[2];
const orderId = '4450554107';

if (!apiKey) {
  console.log('❌ Usage: node test-sms-api.js <API_KEY>');
  process.exit(1);
}

const BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php';

async function testGetStatusV2() {
  console.log('\n🔍 Test 1: getStatusV2');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const url = `${BASE_URL}?api_key=${apiKey}&action=getStatusV2&id=${orderId}`;
  console.log('URL:', url.replace(apiKey, 'KEY_HIDDEN'));
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('Response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('(Plain text response)');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetHistory() {
  console.log('\n📚 Test 2: getHistory (24h)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const now = Math.floor(Date.now() / 1000);
  const yesterday = now - (24 * 60 * 60);
  
  const url = `${BASE_URL}?api_key=${apiKey}&action=getHistory&start=${yesterday}&end=${now}`;
  console.log('URL:', url.replace(apiKey, 'KEY_HIDDEN'));
  console.log('Start:', new Date(yesterday * 1000).toISOString());
  console.log('End:', new Date(now * 1000).toISOString());
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('\nRaw Response:', text.substring(0, 200), text.length > 200 ? '...' : '');
    
    try {
      const json = JSON.parse(text);
      console.log('\n✅ Is Array:', Array.isArray(json));
      console.log('✅ Length:', Array.isArray(json) ? json.length : 'N/A');
      
      if (Array.isArray(json) && json.length > 0) {
        console.log('\n📊 First item:', JSON.stringify(json[0], null, 2));
        
        // Search for our order ID
        const found = json.find(item => item.id.toString() === orderId);
        if (found) {
          console.log('\n✅ FOUND ORDER', orderId);
          console.log(JSON.stringify(found, null, 2));
        } else {
          console.log('\n❌ Order', orderId, 'NOT FOUND in history');
          console.log('Available IDs:', json.map(i => i.id).join(', '));
        }
      } else if (Array.isArray(json)) {
        console.log('\n⚠️ History is empty array');
      } else {
        console.log('\n⚠️ Response is not an array:', json);
      }
    } catch (e) {
      console.log('\n❌ Failed to parse JSON:', e.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetActiveActivations() {
  console.log('\n📱 Test 3: getActiveActivations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const url = `${BASE_URL}?api_key=${apiKey}&action=getActiveActivations`;
  console.log('URL:', url.replace(apiKey, 'KEY_HIDDEN'));
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    console.log('\nRaw Response:', text.substring(0, 200), text.length > 200 ? '...' : '');
    
    try {
      const json = JSON.parse(text);
      console.log('\n✅ Parsed:', JSON.stringify(json, null, 2).substring(0, 500));
    } catch (e) {
      console.log('\n❌ Failed to parse JSON');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing SMS-Activate API');
  console.log('Order ID:', orderId);
  console.log('');
  
  await testGetStatusV2();
  await testGetHistory();
  await testGetActiveActivations();
  
  console.log('\n✅ Tests completed!');
}

runTests();
