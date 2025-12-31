#!/usr/bin/env node
/**
 * Test diagnostic PayDunya pour identifier l'erreur
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function diagnosticPayDunya() {
  console.log('🔧 DIAGNOSTIC PAYDUNYA - IDENTIFICATION DU PROBLÈME');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 1. Vérifier la configuration PayDunya dans la DB
  console.log('\n1️⃣ VÉRIFICATION CONFIGURATION DB...');
  const { data: paydunyaConfig, error: configError } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'paydunya')
    .single();
  
  if (configError) {
    console.log('❌ Erreur config DB:', configError.message);
    return;
  }
  
  console.log('✅ Config PayDunya trouvée:');
  console.log('   - Actif:', paydunyaConfig.is_active);
  console.log('   - Mode:', paydunyaConfig.config?.mode);
  console.log('   - Master Key:', paydunyaConfig.config?.master_key?.substring(0, 15) + '...');
  
  // 2. Prendre un utilisateur de test
  console.log('\n2️⃣ RÉCUPÉRATION UTILISATEUR TEST...');
  const { data: user } = await supabase
    .from('users')
    .select('id, email, phone')
    .limit(1)
    .single();
  
  if (!user) {
    console.log('❌ Aucun utilisateur disponible pour le test');
    return;
  }
  
  console.log('✅ Utilisateur test:', user.id.substring(0, 8) + '...');
  
  // 3. Tester la fonction Edge PayDunya
  console.log('\n3️⃣ TEST FONCTION EDGE PAYDUNYA...');
  
  try {
    const response = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE`
      },
      body: JSON.stringify({
        amount: 1000,
        userId: user.id,
        email: user.email || 'test@onesms-sn.com',
        phone: user.phone || '+221771234567',
        metadata: {
          test: true,
          diagnostic: true
        }
      })
    });
    
    const responseText = await response.text();
    
    console.log('📡 Status:', response.status);
    console.log('📄 Response:', responseText);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('\n✅ SUCCÈS! PayDunya fonctionne:');
      console.log('   - Transaction:', result.transaction_id);
      console.log('   - URL Paiement:', result.payment_url);
      console.log('   - Token:', result.token);
      
      // Vérifier la transaction dans la DB
      console.log('\n4️⃣ VÉRIFICATION TRANSACTION DB...');
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', result.transaction_id)
        .single();
      
      if (transaction) {
        console.log('✅ Transaction trouvée en DB:');
        console.log('   - Status:', transaction.status);
        console.log('   - Amount:', transaction.amount);
        console.log('   - External ID:', transaction.external_id);
      }
      
    } else {
      console.log('\n❌ ERREUR IDENTIFIÉE!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Code:', response.status);
      console.log('Message:', responseText);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Analyser l'erreur
      try {
        const errorData = JSON.parse(responseText);
        console.log('\n🔍 ANALYSE DE L\'ERREUR:');
        if (errorData.error) {
          console.log('   - Erreur:', errorData.error);
        }
        if (errorData.success === false) {
          console.log('   - Échec confirmé');
        }
      } catch (e) {
        console.log('   - Réponse non-JSON:', responseText);
      }
    }
    
  } catch (error) {
    console.log('\n💥 ERREUR RÉSEAU/TECHNIQUE:');
    console.log('   -', error.message);
  }
  
  console.log('\n🎯 DIAGNOSTIC TERMINÉ');
}

diagnosticPayDunya().catch(console.error);