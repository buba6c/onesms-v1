#!/usr/bin/env node
/**
 * Test API Moneroo - Identifier le mode (Sandbox vs Production)
 */

// Nouvelle clé fournie par l'utilisateur
const SECRET_KEY = 'pvk_1hreh7|01KCHZYV5P9WN4Q9T5384REGQH';

async function testMonerooAPI() {
  console.log('🔍 Test de l\'API Moneroo avec la nouvelle clé...\n');
  console.log('Clé utilisée:', SECRET_KEY);
  console.log('');
  
  try {
    // Test 1: Vérifier une requête simple
    const response = await fetch('https://api.moneroo.io/v1/payments', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Statut HTTP:', response.status);
    
    const data = await response.json();
    console.log('📄 Réponse:', JSON.stringify(data, null, 2));
    
    // Analyse de la réponse
    if (response.status === 401) {
      console.log('\n❌ Clé invalide ou expirée');
    } else if (response.status === 200) {
      console.log('\n✅ Clé valide');
      
      // Chercher des indices sur le mode
      if (data.message?.toLowerCase().includes('sandbox') || 
          data.message?.toLowerCase().includes('test')) {
        console.log('🧪 MODE SANDBOX détecté');
      } else if (data.message?.toLowerCase().includes('live') || 
                 data.message?.toLowerCase().includes('production')) {
        console.log('🚀 MODE PRODUCTION détecté');
      }
    }
    
    // Test 2: Créer un paiement test minimal
    console.log('\n📤 Test création de paiement...');
    
    const paymentResponse = await fetch('https://api.moneroo.io/v1/payments/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        amount: 100,
        currency: 'XOF',
        description: 'Test mode detection',
        customer: {
          email: 'test@onesms-sn.com',
          first_name: 'Test',
          last_name: 'Mode'
        },
        return_url: 'https://onesms-sn.com/test'
      })
    });
    
    const paymentData = await paymentResponse.json();
    console.log('📄 Réponse paiement:', JSON.stringify(paymentData, null, 2));
    
    // Analyser l'URL de checkout
    if (paymentData.data?.checkout_url) {
      const checkoutUrl = paymentData.data.checkout_url;
      console.log('\n🔗 Checkout URL:', checkoutUrl);
      
      if (checkoutUrl.includes('sandbox') || checkoutUrl.includes('test')) {
        console.log('🧪 MODE SANDBOX - L\'URL contient "sandbox" ou "test"');
      } else {
        console.log('🚀 MODE indéterminé par l\'URL');
        console.log('   → Le mode dépend de la clé API utilisée');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testMonerooAPI();
