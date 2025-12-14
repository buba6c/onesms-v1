import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 ANALYSE COMPLÈTE DES FOURNISSEURS DE PAIEMENT\n');

// 1. Vérifier tous les fournisseurs (sans cache)
const { data: providers, error } = await supabase
  .from('payment_providers')
  .select('*')
  .order('priority')
  .limit(10); // Forcer un nouveau fetch

if (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}

console.log(`📊 ${providers.length} fournisseur(s) trouvé(s):\n`);

providers.forEach((provider, index) => {
  console.log(`${index + 1}. ${provider.provider_name}`);
  console.log(`   Code: ${provider.provider_code}`);
  console.log(`   Actif: ${provider.is_active ? '✅ OUI' : '❌ NON'}`);
  console.log(`   Par défaut: ${provider.is_default ? '⭐ OUI' : '❌ NON'}`);
  console.log(`   Priorité: ${provider.priority}`);
  
  // Vérifier la configuration
  if (provider.config) {
    console.log(`   Configuration:`);
    
    if (provider.provider_code === 'moneyfusion') {
      const { api_key, api_secret, mode } = provider.config;
      console.log(`     - API Key: ${api_key ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`     - API Secret: ${api_secret ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`     - Mode: ${mode || 'non défini'}`);
      
      if (api_key) {
        console.log(`     - Clé API: ${api_key.substring(0, 10)}...`);
      }
    } else if (provider.provider_code === 'paydunya') {
      const { master_key, private_key, token, mode } = provider.config;
      console.log(`     - Master Key: ${master_key ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`     - Private Key: ${private_key ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`     - Token: ${token ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`     - Mode: ${mode || 'non défini'}`);
    }
  } else {
    console.log(`   ⚠️  Aucune configuration`);
  }
  
  console.log(`   Méthodes supportées: ${provider.supported_methods?.length || 0}`);
  if (provider.supported_methods?.length > 0) {
    console.log(`     ${provider.supported_methods.join(', ')}`);
  }
  console.log('');
});

// 2. Vérifier les fournisseurs actifs
const activeProviders = providers.filter(p => p.is_active);
console.log(`\n📌 RÉSUMÉ:`);
console.log(`   - Fournisseurs actifs: ${activeProviders.length}`);
console.log(`   - Fournisseur par défaut: ${providers.find(p => p.is_default)?.provider_name || 'Aucun'}`);

if (activeProviders.length === 0) {
  console.log('\n⚠️  ATTENTION: Aucun fournisseur actif! Les utilisateurs ne pourront pas recharger.');
} else if (activeProviders.length === 1) {
  console.log(`\n✅ Mode simple: 1 seul fournisseur actif (${activeProviders[0].provider_name})`);
  console.log('   Le sélecteur sera caché sur la page de recharge.');
} else {
  console.log(`\n✅ Mode choix: ${activeProviders.length} fournisseurs actifs`);
  console.log('   Le sélecteur sera visible sur la page de recharge.');
}

// 3. Vérifier si MoneyFusion a ses clés
const moneyfusion = providers.find(p => p.provider_code === 'moneyfusion');
if (moneyfusion) {
  console.log('\n🔍 ANALYSE DÉTAILLÉE MONEYFUSION:');
  if (!moneyfusion.config?.api_key || !moneyfusion.config?.api_secret) {
    console.log('❌ PROBLÈME: MoneyFusion n\'a pas de clés API configurées!');
    console.log('\n📝 Solution:');
    console.log('   1. Va sur Admin → Fournisseurs de Paiement');
    console.log('   2. Clique sur "Configurer" pour MoneyFusion');
    console.log('   3. Entre tes clés API MoneyFusion:');
    console.log('      - API Key (Clé API)');
    console.log('      - API Secret (Clé secrète)');
    console.log('      - Mode: test ou live');
  } else {
    console.log('✅ MoneyFusion est correctement configuré');
  }
}
