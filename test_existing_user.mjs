import { createClient } from '@supabase/supabase-js';

console.log('👑 TEST COMPLET AVEC UTILISATEUR EXISTANT');
console.log('=' + '='.repeat(50));

async function testWithExistingUser() {
  const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
  
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userClient = createClient(supabaseUrl, anonKey);
  
  try {
    // 1. Prendre le premier utilisateur existant et lui ajouter du solde
    console.log('👤 Récupération d\'un utilisateur existant...');
    const { data: existingUsers, error: fetchError } = await adminClient
      .from('users')
      .select('*')
      .limit(1);
    
    if (fetchError || !existingUsers?.length) {
      console.error('❌ Aucun utilisateur trouvé:', fetchError);
      return;
    }
    
    const targetUser = existingUsers[0];
    console.log('✅ Utilisateur sélectionné:', {
      id: targetUser.id,
      email: targetUser.email,
      balance: targetUser.balance
    });
    
    // 2. Ajouter du solde
    if (targetUser.balance < 50) {
      console.log('💰 Ajout de solde...');
      const { data: updatedUser, error: updateError } = await adminClient
        .from('users')
        .update({ balance: 100.0 })
        .eq('id', targetUser.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erreur mise à jour solde:', updateError);
        return;
      }
      
      console.log('✅ Solde mis à jour:', {
        oldBalance: targetUser.balance,
        newBalance: updatedUser.balance
      });
    } else {
      console.log('✅ Solde suffisant:', targetUser.balance, 'Ⓐ');
    }
    
    // 3. Créer un token pour cet utilisateur (simulation d'authentification)
    console.log('\n🔑 Création d\'un token de test...');
    
    // Pour simuler l'authentification, on va créer un utilisateur temporaire
    // ou utiliser directement les API avec le service role
    
    console.log('🚀 TEST D\'ACHAT DIRECT AVEC SERVICE ROLE');
    console.log('-'.repeat(50));
    
    const requestBody = {
      country: 'france',
      operator: 'any',
      product: 'wa', // WhatsApp
      userId: targetUser.id,
      expectedPrice: 5
    };
    
    console.log('📦 Paramètres d\'achat:', requestBody);
    
    // Test direct avec fetch et service role
    console.log('🌐 Appel direct à l\'Edge Function...');
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/buy-sms-activate-number`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': anonKey
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseText = await response.text();
      
      console.log('\n📊 RÉSULTATS:');
      console.log('═'.repeat(50));
      console.log('Status:', response.status);
      console.log('Response:', responseText.substring(0, 1000));
      
      if (response.ok) {
        try {
          const buyData = JSON.parse(responseText);
          
          if (buyData.success === false) {
            console.error('❌ ERREUR MÉTIER:', buyData.error);
          } else if (buyData.success === true) {
            console.log('🎉 SUCCÈS ! Numéro acheté:');
            console.log('   ID:', buyData.data?.id);
            console.log('   Téléphone:', buyData.data?.phone);
            console.log('   Prix:', buyData.data?.price, 'Ⓐ');
          } else {
            console.log('⚠️ Réponse inattendue:', buyData);
          }
        } catch (parseError) {
          console.error('❌ Erreur parsing JSON:', parseError.message);
        }
      } else {
        console.error('❌ HTTP Error:', response.status, responseText);
      }
      
    } catch (fetchError) {
      console.error('❌ Erreur réseau:', fetchError.message);
    }
    
  } catch (error) {
    console.error('💥 ERREUR GÉNÉRALE:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWithExistingUser();