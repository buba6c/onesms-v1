import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 CONFIGURATION DES FOURNISSEURS DE PAIEMENT\n');

// 1. Mettre à jour MoneyFusion - Les clés sont déjà dans Supabase Secrets, on garde juste la structure
console.log('📋 Étape 1: Configuration MoneyFusion');

// MoneyFusion utilise les variables d'environnement directement dans l'Edge Function
// On met juste un placeholder dans la config pour que l'admin sache que c'est configuré
const { error: updateError } = await supabase
  .from('payment_providers')
  .update({
    config: {
      api_key: 'CONFIGURED_IN_SUPABASE_SECRETS',
      api_secret: 'CONFIGURED_IN_SUPABASE_SECRETS',
      api_url: 'CONFIGURED_IN_SUPABASE_SECRETS',
      mode: 'live',
      note: 'Les vraies clés sont dans Supabase Edge Function Secrets'
    }
  })
  .eq('provider_code', 'moneyfusion');

if (updateError) {
  console.error('❌ Erreur mise à jour MoneyFusion:', updateError.message);
} else {
  console.log('✅ MoneyFusion mis à jour (clés dans Supabase Secrets)');
}

// 2. Réinsérer PayDunya
console.log('\n📋 Étape 2: Réinsertion de PayDunya');

const paydunya = {
  provider_code: 'paydunya',
  provider_name: 'PayDunya',
  is_active: true,
  is_default: false,
  priority: 1,
  config: {
    master_key: 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
    private_key: 'test_private_c7KkCGiFSBjGGlK59kaM87dUXKa',
    token: 'w8wLEciWYNOm6tmWNEDI',
    mode: 'test'
  },
  supported_methods: [
    'orange-money',
    'mtn-money',
    'moov-money',
    'wave',
    'free-money',
    'e-money',
    'visa',
    'mastercard'
  ],
  logo_url: null,
  description: 'Paiement via PayDunya - Orange Money, Wave, MTN, Moov, Cartes bancaires'
};

// Vérifier si PayDunya existe déjà
const { data: existing } = await supabase
  .from('payment_providers')
  .select('id')
  .eq('provider_code', 'paydunya')
  .single();

if (existing) {
  // Mettre à jour
  const { error: updateError } = await supabase
    .from('payment_providers')
    .update(paydunya)
    .eq('provider_code', 'paydunya');

  if (updateError) {
    console.error('❌ Erreur mise à jour PayDunya:', updateError.message);
  } else {
    console.log('✅ PayDunya mis à jour');
  }
} else {
  // Insérer
  const { error: insertError } = await supabase
    .from('payment_providers')
    .insert(paydunya);

  if (insertError) {
    console.error('❌ Erreur insertion PayDunya:', insertError.message);
  } else {
    console.log('✅ PayDunya inséré');
  }
}

// 3. Vérifier le résultat final
console.log('\n📊 Résultat final:');
const { data: finalProviders } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_active, is_default')
  .order('priority');

finalProviders?.forEach(p => {
  console.log(`   ${p.is_active ? '✅' : '❌'} ${p.provider_name} (${p.provider_code}) ${p.is_default ? '⭐' : ''}`);
});

console.log('\n✅ Configuration terminée!');
