#!/usr/bin/env node
/**
 * 🔧 CONFIGURATION CLÉS PAYDUNYA
 * Configure les clés API PayDunya dans la base de données
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔧 Configuration des clés PayDunya...\n');

async function configurePayDunya() {
  try {
    // Configuration PayDunya TEST
    const paydunyaConfig = {
      master_key: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
      public_key: 'test_public_iQ2Xt5KoOC1KT9l7tstvVhLLkiC',
      private_key: 'test_private_c7KkCGiFSBjGGlK59kaM87dUXKa',
      token: 'w8wLEciWYNOm6tmWNEDI',
      mode: 'test',
      callback_url: `${process.env.VITE_SUPABASE_URL}/functions/v1/paydunya-webhook`,
      return_url: 'https://onesms-sn.com/dashboard?payment=success',
      cancel_url: 'https://onesms-sn.com/topup?payment=cancel'
    };

    console.log('📝 Mise à jour de la configuration PayDunya...');

    const { data, error } = await supabase
      .from('payment_providers')
      .update({
        config: paydunyaConfig,
        updated_at: new Date().toISOString()
      })
      .eq('provider_code', 'paydunya')
      .select();

    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }

    console.log('✅ Configuration PayDunya mise à jour avec succès!\n');

    // Vérifier la configuration
    const { data: provider, error: checkError } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('provider_code', 'paydunya')
      .single();

    if (checkError) {
      throw new Error(`Erreur vérification: ${checkError.message}`);
    }

    console.log('📊 État PayDunya:');
    console.log(`   - Nom: ${provider.provider_name}`);
    console.log(`   - Actif: ${provider.is_active ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - Par défaut: ${provider.is_default ? '⭐ OUI' : '❌ NON'}`);
    console.log(`   - Mode: ${provider.config?.mode || 'non défini'}`);
    console.log(`   - Master Key: ${provider.config?.master_key ? provider.config.master_key.substring(0, 10) + '...' : '❌ Manquante'}`);
    console.log(`   - Private Key: ${provider.config?.private_key ? provider.config.private_key.substring(0, 15) + '...' : '❌ Manquante'}`);
    console.log(`   - Token: ${provider.config?.token ? provider.config.token.substring(0, 10) + '...' : '❌ Manquante'}`);
    console.log('');

    console.log('✅ PayDunya est maintenant configuré et prêt à être testé!\n');
    console.log('🧪 Pour tester, lance: node test_paydunya_local.mjs\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    process.exit(1);
  }
}

configurePayDunya();
