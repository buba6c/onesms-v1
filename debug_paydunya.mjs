#!/usr/bin/env node
/**
 * Vérifier la config PayDunya et afficher l'erreur détaillée
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Vérification PayDunya...\n');

// 1. Vérifier la config
const { data: provider, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'paydunya')
  .single();

if (error) {
  console.error('❌ Erreur:', error);
  process.exit(1);
}

console.log('📋 Config PayDunya:');
console.log('- Actif:', provider.is_active);
console.log('- Config:', provider.config);
console.log('');

// 2. Test direct de l'Edge Function
console.log('🧪 Test Edge Function...\n');

const { data, error: fnError } = await supabase.functions.invoke('paydunya-create-payment', {
  body: {
    amount: 1000,
    userId: '589c44ab-20aa-4e0c-b7a1-d5f4dda78137',
    email: 'test@onesms.com',
    phone: '+221771234567'
  }
});

if (fnError) {
  console.error('❌ Erreur Edge Function:');
  console.error('Message:', fnError.message);
  console.error('Context:', fnError.context);
  
  // Essayer de lire le body de la réponse
  if (fnError.context && fnError.context.body) {
    try {
      const reader = fnError.context.body.getReader();
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      console.error('Body:', text);
    } catch (e) {
      console.error('Impossible de lire le body');
    }
  }
} else {
  console.log('✅ Succès!');
  console.log('Data:', JSON.stringify(data, null, 2));
}
