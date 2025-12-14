import { createClient } from '@supabase/supabase-js';

console.log('🔍 DIAGNOSTIC AUTHENTIFICATION EDGE FUNCTION');
console.log('=' + '='.repeat(50));

async function testAuth() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  console.log('📊 Configuration:');
  console.log('  URL:', supabaseUrl);
  console.log('  Anon Key:', anonKey.substring(0, 50) + '...');
  
  const client = createClient(supabaseUrl, anonKey);
  
  try {
    console.log('\n🔐 Test 1: Authentification avec email/password...');
    
    // Essayer de se connecter avec buba6c
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: 'buba6c@gmail.com',
      password: 'buba123' // Remplacer par le vrai mot de passe si différent
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    
    if (authData?.session?.access_token) {
      const token = authData.session.access_token;
      console.log('✅ Token obtenu:', token.substring(0, 50) + '...');
      
      console.log('\n🧪 Test 2: Validation du token...');
      
      // Test de validation du token
      const userClient = createClient(supabaseUrl, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
      
      const { data: userData, error: userError } = await userClient.auth.getUser();
      
      if (userError) {
        console.error('❌ Token validation error:', userError.message);
      } else {
        console.log('✅ Token valide pour:', userData.user?.email);
        console.log('  User ID:', userData.user?.id);
        
        console.log('\n🚀 Test 3: Appel Edge Function...');
        
        // Test appel à la fonction Edge
        try {
          const response = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/buy-sms-activate-number', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'apikey': anonKey
            },
            body: JSON.stringify({
              country: 'france',
              operator: 'any',
              product: 'google',
              userId: userData.user.id,
              expectedPrice: 5
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Edge Function call successful:', result);
          } else {
            const errorText = await response.text();
            console.error('❌ Edge Function error:', response.status, errorText);
          }
          
        } catch (fetchError) {
          console.error('❌ Fetch error:', fetchError.message);
        }
      }
      
    } else {
      console.error('❌ No access token in auth response');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testAuth();