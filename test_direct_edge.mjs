import { createClient } from '@supabase/supabase-js';

console.log('🧪 TEST EDGE FUNCTION AVEC TOKEN FICTIF');
console.log('=' + '='.repeat(50));

async function testDirectCall() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  // Créer un token JWT fictif mais valide pour les tests
  const testToken = anonKey; // Utiliser la clé anon comme token de test
  
  console.log('📞 Test 1: Appel sans Authorization header...');
  
  try {
    const response1 = await fetch(`${supabaseUrl}/functions/v1/buy-sms-activate-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey
      },
      body: JSON.stringify({
        country: 'france',
        operator: 'any', 
        product: 'google',
        userId: 'test-user-id',
        expectedPrice: 5
      })
    });
    
    const text1 = await response1.text();
    console.log('❌ Sans auth - Status:', response1.status);
    console.log('❌ Sans auth - Response:', text1.substring(0, 200));
    
  } catch (error) {
    console.error('💥 Erreur appel sans auth:', error.message);
  }

  console.log('\n📞 Test 2: Appel AVEC Authorization header...');
  
  try {
    const response2 = await fetch(`${supabaseUrl}/functions/v1/buy-sms-activate-number`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
        'apikey': anonKey
      },
      body: JSON.stringify({
        country: 'france',
        operator: 'any',
        product: 'google', 
        userId: 'test-user-id',
        expectedPrice: 5
      })
    });
    
    const text2 = await response2.text();
    console.log('🔐 Avec auth - Status:', response2.status);
    console.log('🔐 Avec auth - Response:', text2.substring(0, 500));
    
    if (text2.includes('Auth session missing!')) {
      console.log('❌ Le token est passé mais getUser() échoue...');
    }
    
  } catch (error) {
    console.error('💥 Erreur appel avec auth:', error.message);
  }
  
  console.log('\n📞 Test 3: Vérification directe de auth.getUser()...');
  
  try {
    const client = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${testToken}`
        }
      }
    });
    
    const { data: userData, error: userError } = await client.auth.getUser();
    
    if (userError) {
      console.log('❌ auth.getUser() error:', userError.message);
    } else {
      console.log('✅ auth.getUser() success:', userData.user?.email);
    }
    
  } catch (error) {
    console.error('💥 Erreur test getUser:', error.message);
  }
}

testDirectCall();