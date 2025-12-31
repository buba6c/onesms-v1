#!/usr/bin/env node
/**
 * Activer PayDunya dans payment_providers
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function activatePayDunya() {
  console.log('🔧 Activation de PayDunya...\n');

  // Vérifier la config actuelle
  const { data: provider, error } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'paydunya')
    .single();

  if (error) {
    console.error('❌ Erreur récupération:', error.message);
    return;
  }

  console.log('Config PayDunya actuelle:');
  console.log('- is_active:', provider.is_active);
  console.log('- Mode:', provider.config?.mode);
  console.log('- Master key présente:', !!provider.config?.master_key);
  console.log('- Private key présente:', !!provider.config?.private_key);
  console.log('- Token présent:', !!provider.config?.token);

  if (provider.is_active) {
    console.log('\n✅ PayDunya est déjà actif!');
    return;
  }

  // Activer PayDunya
  const { data: updated, error: updateError } = await supabase
    .from('payment_providers')
    .update({ is_active: true })
    .eq('provider_code', 'paydunya')
    .select()
    .single();

  if (updateError) {
    console.error('\n❌ Erreur activation:', updateError.message);
    return;
  }

  console.log('\n✅ PayDunya activé avec succès!');
  console.log('- is_active:', updated.is_active);
}

activatePayDunya().catch(console.error);
