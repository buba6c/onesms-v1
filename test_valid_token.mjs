import { createClient } from '@supabase/supabase-js';

console.log('🔑 GÉNÉRATION TOKEN VALIDE POUR TEST');
console.log('=' + '='.repeat(40));

async function generateValidToken() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  const client = createClient(supabaseUrl, anonKey);
  
  try {
    console.log('📧 Tentative de création d\'un utilisateur de test...');
    
    // Créer un utilisateur de test
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.error('❌ Erreur création utilisateur:', signUpError.message);
      
      // Essayer de se connecter avec un compte existant
      console.log('🔄 Tentative de connexion avec compte test existant...');
      
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });
      
      if (signInError) {
        console.error('❌ Erreur connexion:', signInError.message);
        console.log('ℹ️ Aucun utilisateur de test disponible');
        return null;
      } else {
        console.log('✅ Connexion réussie avec compte existant');
        return signInData.session?.access_token;
      }
      
    } else {
      console.log('✅ Utilisateur créé:', testEmail);
      if (signUpData.session?.access_token) {
        console.log('✅ Token obtenu directement');
        return signUpData.session.access_token;
      } else {
        console.log('ℹ️ Confirmation email peut-être requise');
        return null;
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur génération token:', error.message);
    return null;
  }
}

async function testWithValidToken() {
  const token = await generateValidToken();
  
  if (!token) {
    console.log('❌ Impossible d\'obtenir un token valide');
    return;
  }
  
  console.log('\n🧪 TEST AVEC TOKEN VALIDE:');
  console.log('Token:', token.substring(0, 50) + '...');
  
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  try {
    console.log('📞 Appel Edge Function avec token valide...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/buy-sms-activate-number`, {
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
        userId: 'be6e2103-876c-4e48-b12d-0faaab74fd2d', // Un des users de la DB
        expectedPrice: 5
      })
    });
    
    const responseText = await response.text();
    console.log('📊 Status:', response.status);
    console.log('📊 Response:', responseText.substring(0, 1000));
    
    if (responseText.includes('Auth session missing!')) {
      console.log('❌ Token valide mais auth.getUser() échoue encore');
      console.log('🔍 Le problème est dans la configuration de la fonction');
    } else {
      console.log('✅ Authentification réussie !');
    }
    
  } catch (error) {
    console.error('💥 Erreur test:', error.message);
  }
}

testWithValidToken();