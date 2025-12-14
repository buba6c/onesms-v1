import { createClient } from '@supabase/supabase-js';

console.log('💰 AJOUT DE BALANCE À L\'UTILISATEUR DE TEST');
console.log('=' + '='.repeat(50));

async function addBalanceAndTest() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userClient = createClient(supabaseUrl, anonKey);
  
  try {
    // 1. S'authentifier
    console.log('🔐 Authentification utilisateur test@example.com...');
    const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      console.error('❌ Erreur authentification:', authError.message);
      return;
    }
    
    const userId = authData.user.id;
    console.log('✅ Utilisateur authentifié:', {
      id: userId,
      email: authData.user.email
    });
    
    // 2. Vérifier le solde actuel
    console.log('💰 Vérification du solde actuel...');
    const { data: currentUser, error: fetchError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('❌ Erreur récupération utilisateur:', fetchError);
      return;
    }
    
    console.log('👤 Utilisateur actuel:', {
      email: currentUser.email,
      balance: currentUser.balance,
      frozen_balance: currentUser.frozen_balance
    });
    
    // 3. Ajouter du solde si nécessaire
    if (currentUser.balance < 50) {
      console.log('💸 Ajout de 100 Ⓐ au solde...');
      const { data: updatedUser, error: updateError } = await adminClient
        .from('users')
        .update({ balance: 100.0 })
        .eq('id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erreur mise à jour solde:', updateError);
        return;
      }
      
      console.log('✅ Solde mis à jour:', {
        oldBalance: currentUser.balance,
        newBalance: updatedUser.balance
      });
    } else {
      console.log('✅ Solde suffisant:', currentUser.balance, 'Ⓐ');
    }
    
    // 4. Maintenant tester l'achat
    console.log('\n🚀 TEST D\'ACHAT AVEC SOLDE SUFFISANT');
    console.log('-'.repeat(50));
    
    const requestBody = {
      country: 'france',
      operator: 'any',
      product: 'wa', // WhatsApp
      userId: userId,
      expectedPrice: 5
    };
    
    console.log('📦 Paramètres d\'achat:', requestBody);
    
    console.log('🌐 Appel Edge Function buy-sms-activate-number...');
    const { data: buyData, error: buyError } = await userClient.functions.invoke('buy-sms-activate-number', {
      body: requestBody
    });
    
    console.log('\n📊 RÉSULTATS:');
    console.log('═'.repeat(50));
    
    if (buyError) {
      console.error('❌ ERREUR EDGE FUNCTION:', buyError);
      console.error('Details:', JSON.stringify(buyError, null, 2));
    } else {
      console.log('✅ Réponse reçue:', JSON.stringify(buyData, null, 2));
      
      if (buyData?.success === false) {
        console.error('❌ ERREUR MÉTIER:', buyData.error);
        if (buyData.details) {
          console.error('Details:', buyData.details);
        }
      } else if (buyData?.success === true) {
        console.log('🎉 SUCCÈS ! Numéro acheté:');
        console.log('   ID:', buyData.data?.id);
        console.log('   Téléphone:', buyData.data?.phone);
        console.log('   Prix:', buyData.data?.price, 'Ⓐ');
        console.log('   Service:', buyData.data?.service);
        console.log('   Pays:', buyData.data?.country);
        console.log('   Statut:', buyData.data?.status);
        console.log('   Expire:', buyData.data?.expires);
      } else {
        console.log('⚠️ Réponse inattendue:', buyData);
      }
    }
    
  } catch (error) {
    console.error('💥 ERREUR GÉNÉRALE:', error.message);
    console.error('Stack:', error.stack);
  }
}

addBalanceAndTest();