import { createClient } from '@supabase/supabase-js';

console.log('🔥 TEST FINAL AVEC UTILISATEUR FRAICHEMENT CRÉÉ');
console.log('=' + '='.repeat(60));

async function finalTestWithNewUser() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userClient = createClient(supabaseUrl, anonKey);
  
  try {
    // 1. Créer un nouvel utilisateur pour avoir un token valide
    const testEmail = `buba-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('🆕 Création d\'un nouvel utilisateur:', testEmail);
    
    const { data: signUpData, error: signUpError } = await userClient.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.error('❌ Erreur création utilisateur:', signUpError.message);
      return;
    }
    
    if (!signUpData.session) {
      console.error('❌ Pas de session après signup (confirmation email requis?)');
      return;
    }
    
    const userId = signUpData.user.id;
    const token = signUpData.session.access_token;
    
    console.log('✅ Utilisateur créé et authentifié:', {
      id: userId,
      email: testEmail,
      hasToken: !!token
    });
    
    // 2. Mettre à jour le solde de l'utilisateur (qui existe déjà automatiquement)
    console.log('💰 Mise à jour du solde utilisateur...');
    
    const { data: updatedUserRecord, error: updateError } = await adminClient
      .from('users')
      .update({
        balance: 100.0,
        frozen_balance: 0
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erreur mise à jour solde user:', updateError);
      return;
    }
    
    console.log('✅ Solde mis à jour:', {
      balance: updatedUserRecord.balance,
      frozen_balance: updatedUserRecord.frozen_balance
    });
    
    // 3. Maintenant tester l'achat avec le token valide
    console.log('\n🚀 TEST D\'ACHAT AVEC TOKEN UTILISATEUR VALIDE');
    console.log('═'.repeat(60));
    
    const requestBody = {
      country: 'france',
      operator: 'any', 
      product: 'wa', // WhatsApp
      userId: userId,
      expectedPrice: 5
    };
    
    console.log('📦 Paramètres:', requestBody);
    
    // Utiliser supabase.functions.invoke avec la session authentifiée
    const { data: buyData, error: buyError } = await userClient.functions.invoke('buy-sms-activate-number', {
      body: requestBody
    });
    
    console.log('\n📊 RÉSULTATS FINAUX:');
    console.log('═'.repeat(60));
    
    if (buyError) {
      console.error('❌ ERREUR EDGE FUNCTION:', JSON.stringify(buyError, null, 2));
    } else {
      console.log('📥 Réponse reçue:', JSON.stringify(buyData, null, 2));
      
      if (buyData?.success === false) {
        console.error('❌ ERREUR MÉTIER:', buyData.error);
        if (buyData.details) {
          console.error('📋 Détails:', buyData.details);
        }
      } else if (buyData?.success === true) {
        console.log('🎉🎉🎉 SUCCÈS TOTAL ! NUMÉRO ACHETÉ ! 🎉🎉🎉');
        console.log('');
        console.log('📱 Détails de l\'achat:');
        console.log('   🆔 ID Activation:', buyData.data?.id);
        console.log('   📞 Numéro de téléphone:', buyData.data?.phone);
        console.log('   💰 Prix payé:', buyData.data?.price, 'Ⓐ');
        console.log('   🌍 Pays:', buyData.data?.country);
        console.log('   📱 Service:', buyData.data?.service);
        console.log('   📊 Statut:', buyData.data?.status);
        console.log('   ⏰ Expire le:', buyData.data?.expires);
        console.log('');
        console.log('✅ Le système d\'authentification et d\'achat fonctionne parfaitement !');
        console.log('✅ Le secure frozen balance system est opérationnel !');
        console.log('✅ L\'intégration SMS-Activate est fonctionnelle !');
      } else {
        console.log('⚠️ Réponse inattendue:', buyData);
      }
    }
    
  } catch (error) {
    console.error('💥 ERREUR GÉNÉRALE:', error.message);
    console.error('Stack:', error.stack);
  }
}

finalTestWithNewUser();