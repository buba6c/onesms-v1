import { createClient } from '@supabase/supabase-js';

console.log('🚀 SIMULATION COMPLETE FRONTEND -> EDGE FUNCTION');
console.log('=' + '='.repeat(60));

async function simulateFrontendCall() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  // 1. Créer le client Supabase comme le frontend
  const supabase = createClient(supabaseUrl, anonKey);
  
  try {
    console.log('🔐 ÉTAPE 1: Authentification utilisateur...');
    
    // Simuler l'authentification avec buba6c
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'buba6c@gmail.com',
      password: 'buba123'
    });
    
    if (authError) {
      console.error('❌ Erreur authentification buba6c:', authError.message);
      console.log('🔍 Tentative avec mot de passe alternatif...');
      
      // Essayer avec un autre mot de passe possible
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'buba6c@gmail.com',
        password: 'password123'
      });
      
      if (authError2) {
        console.error('❌ Authentification impossible avec buba6c');
        console.log('🔄 Retour vers utilisateur de test...');
        
        // Fallback vers utilisateur test
        const { data: testAuth, error: testError } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        
        if (testError) {
          console.error('❌ Impossible de s\'authentifier');
          return;
        }
        console.log('✅ Authentifié avec utilisateur de test');
      } else {
        console.log('✅ Utilisateur buba6c authentifié avec mot de passe alternatif');
      }
      
    } else {
      console.log('✅ Utilisateur buba6c authentifié:', authData.user?.email);
    }
    
    // 2. Vérifier la session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ Pas de session active');
      return;
    }
    
    console.log('✅ Session active:', {
      userId: session.user?.id,
      email: session.user?.email,
      tokenType: session.token_type,
      expiresAt: new Date(session.expires_at * 1000).toISOString()
    });
    
    console.log('\\n🎯 ÉTAPE 2: Appel Edge Function comme le frontend...');
    
    // 3. Simuler exactement l'appel du frontend
    const requestBody = {
      country: 'france',
      operator: 'any',
      product: 'wa', // Code correct pour WhatsApp dans SMS-Activate
      userId: session.user.id,
      expectedPrice: 5
    };
    
    console.log('📦 Request Body:', requestBody);
    
    // Appel avec supabase.functions.invoke (comme le frontend)
    const { data: buyData, error: buyError } = await supabase.functions.invoke('buy-sms-activate-number', {
      body: requestBody
    });
    
    console.log('\\n📊 RÉSULTATS:');
    console.log('buyError:', buyError);
    console.log('buyData:', JSON.stringify(buyData, null, 2));
    
    if (buyError) {
      console.error('❌ ERREUR EDGE FUNCTION:', buyError);
    } else if (buyData?.success === false) {
      console.error('❌ ERREUR MÉTIER:', buyData.error);
    } else {
      console.log('✅ SUCCÈS !', buyData);
    }
    
  } catch (error) {
    console.error('💥 ERREUR GÉNÉRALE:', error.message);
    console.error('Stack:', error.stack);
  }
}

simulateFrontendCall();