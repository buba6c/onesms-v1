import { createClient } from '@supabase/supabase-js';

console.log('💰 AJOUT DE SOLDE À L\'UTILISATEUR DE TEST');
console.log('=' + '='.repeat(50));

async function addBalanceToTestUser() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  
  // Client avec privilèges admin
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  
  // Client standard pour authentification
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  const userClient = createClient(supabaseUrl, anonKey);
  
  try {
    // 1. S'authentifier comme utilisateur de test
    console.log('🔐 Authentification utilisateur de test...');
    const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      console.error('❌ Erreur authentification:', authError.message);
      return;
    }
    
    const userId = authData.user.id;
    console.log('✅ Utilisateur authentifié:', userId);
    
    // 2. Vérifier si l'utilisateur existe dans la table users
    console.log('🔍 Vérification utilisateur dans table users...');
    const { data: existingUser, error: fetchError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Erreur récupération utilisateur:', fetchError);
      return;
    }
    
    if (!existingUser) {
      console.log('🆕 Création de l\'enregistrement utilisateur...');
      const { data: newUser, error: createError } = await adminClient
        .from('users')
        .insert({
          id: userId,
          email: authData.user.email,
          credits: 100.0, // Ajouter 100 crédits
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erreur création utilisateur:', createError);
        return;
      }
      
      console.log('✅ Utilisateur créé avec 100 crédits:', newUser);
    } else {
      console.log('👤 Utilisateur existant trouvé:', {
        email: existingUser.email,
        credits: existingUser.credits
      });
      
      // Ajouter des crédits si nécessaire
      if (existingUser.credits < 10) {
        console.log('💰 Ajout de crédits...');
        const { data: updatedUser, error: updateError } = await adminClient
          .from('users')
          .update({ credits: 100.0 })
          .eq('id', userId)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erreur mise à jour crédits:', updateError);
          return;
        }
        
        console.log('✅ Crédits mis à jour:', updatedUser.credits);
      } else {
        console.log('✅ L\'utilisateur a déjà suffisamment de crédits');
      }
    }
    
    // 3. Tester maintenant l'achat avec des crédits
    console.log('\n🚀 TEST ACHAT AVEC CRÉDITS:');
    console.log('-'.repeat(40));
    
    const requestBody = {
      country: 'france',
      operator: 'any',
      product: 'wa',
      userId: userId,
      expectedPrice: 5
    };
    
    console.log('📦 Request Body:', requestBody);
    
    const { data: buyData, error: buyError } = await userClient.functions.invoke('buy-sms-activate-number', {
      body: requestBody
    });
    
    console.log('\n📊 RÉSULTATS:');
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

addBalanceToTestUser();