#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🧪 TEST MANUEL INIT-MONEYFUSION-PAYMENT\n');
console.log('='.repeat(80));

// 1. Authenticate
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  console.log('❌ Non authentifié. Veuillez vous connecter d\'abord.');
  console.log('Erreur:', authError);
  process.exit(1);
}

console.log('✅ Authentifié:', user.email);
console.log('User ID:', user.id);

// 2. Get user balance
const { data: profile } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', user.id)
  .single();

console.log('\n💰 Solde actuel:');
console.log('   Balance:', profile?.balance || 0, 'Ⓐ');
console.log('   Frozen:', profile?.frozen_balance || 0, 'Ⓐ');

// 3. Test init payment (petit montant pour test)
console.log('\n📞 Appel de init-moneyfusion-payment...');

const testPayload = {
  amount: 500, // 500 FCFA
  currency: 'XOF',
  description: 'TEST Rechargement 5 activations',
  metadata: {
    activations: 5,
    type: 'recharge',
    provider: 'moneyfusion',
    test: true
  },
  customer: {
    phone: '221000000000',
    first_name: 'Test',
    last_name: 'User'
  },
  return_url: 'https://onesms-sn.com/dashboard?payment=success'
};

console.log('Payload:', JSON.stringify(testPayload, null, 2));

try {
  const { data, error } = await supabase.functions.invoke('init-moneyfusion-payment', {
    body: testPayload
  });

  if (error) {
    console.log('\n❌ ERREUR lors de l\'appel:');
    console.log(error);
  } else {
    console.log('\n✅ SUCCÈS:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 Paiement initialisé avec succès!');
      console.log('Token:', data.data.token);
      console.log('Checkout URL:', data.data.checkout_url);
      console.log('Reference:', data.data.payment_ref);
      
      // Check if transaction was created
      console.log('\n🔍 Vérification de la transaction...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', data.data.payment_ref)
        .single();
      
      if (txs) {
        console.log('✅ Transaction créée en base:', txs.id);
        console.log('   Status:', txs.status);
        console.log('   Amount:', txs.amount, 'Ⓐ');
      } else {
        console.log('❌ Transaction PAS trouvée en base!');
      }
    } else {
      console.log('\n❌ Paiement NON initialisé');
      console.log('Message:', data.message || data.error);
    }
  }
} catch (e) {
  console.log('\n❌ EXCEPTION:', e.message);
  console.log(e);
}

console.log('\n' + '='.repeat(80));
