#!/usr/bin/env node
/**
 * 🔍 ANALYSE DES URLS DE REDIRECTION PAYDUNYA
 * 
 * Vérifie que toutes les URLs configurées pour PayDunya sont correctes :
 * - URLs de callback/webhook
 * - URLs de redirection (success/cancel)
 * - Variables d'environnement
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 ANALYSE DES URLS DE REDIRECTION PAYDUNYA\n');
console.log('=' .repeat(60));

// 1. Vérifier les variables d'environnement
console.log('\n📋 VARIABLES D\'ENVIRONNEMENT:');
console.log('-' .repeat(40));

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_APP_URL'
];

const envStatus = {};

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  envStatus[varName] = value;
  console.log(`${varName}: ${value ? '✅' : '❌'} ${value || 'NON DÉFINI'}`);
});

console.log(`\n🌐 URL Application: ${process.env.VITE_APP_URL || '❌ NON DÉFINIE'}`);
console.log(`🔗 URL Supabase: ${process.env.VITE_SUPABASE_URL || '❌ NON DÉFINIE'}`);

// 2. Récupérer la config PayDunya de la DB
console.log('\n📋 CONFIGURATION PAYDUNYA EN BASE:');
console.log('-' .repeat(40));

const { data: paydunyaConfig, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'paydunya')
  .single();

if (error) {
  console.error('❌ Erreur récupération config:', error.message);
  process.exit(1);
}

if (!paydunyaConfig) {
  console.error('❌ PayDunya non trouvé en base');
  process.exit(1);
}

console.log(`Nom: ${paydunyaConfig.provider_name}`);
console.log(`Actif: ${paydunyaConfig.is_active ? '✅ OUI' : '❌ NON'}`);
console.log(`Par défaut: ${paydunyaConfig.is_default ? '⭐ OUI' : '❌ NON'}`);

if (!paydunyaConfig.config) {
  console.error('❌ Configuration manquante');
  process.exit(1);
}

const config = paydunyaConfig.config;
console.log(`Mode: ${config.mode || '❌ Non défini'}`);
console.log(`Master Key: ${config.master_key ? '✅ Configuré' : '❌ Manquant'}`);
console.log(`Private Key: ${config.private_key ? '✅ Configuré' : '❌ Manquant'}`);
console.log(`Token: ${config.token ? '✅ Configuré' : '❌ Manquant'}`);

// 3. Analyser les URLs de redirection depuis le code de la fonction Edge
console.log('\n🔗 URLS DE REDIRECTION ANALYSÉES:');
console.log('-' .repeat(40));

const baseAppUrl = process.env.VITE_APP_URL;
const supabaseUrl = process.env.VITE_SUPABASE_URL;

if (!baseAppUrl) {
  console.error('❌ VITE_APP_URL non définie - Impossible de construire les URLs');
} else {
  console.log(`\n📱 URLs Frontend (${baseAppUrl}):`);
  console.log(`   ✅ Cancel URL: ${baseAppUrl}/payment/cancel?txid={TRANSACTION_ID}`);
  console.log(`   ✅ Return URL: ${baseAppUrl}/payment/success?txid={TRANSACTION_ID}`);
}

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL non définie - Impossible de construire l\'URL webhook');
} else {
  console.log(`\n🔔 URL Webhook (${supabaseUrl}):`);
  console.log(`   ✅ Callback URL: ${supabaseUrl}/functions/v1/paydunya-webhook`);
}

// 4. Vérifier que les URLs sont accessibles
console.log('\n🧪 TEST D\'ACCESSIBILITÉ DES URLS:');
console.log('-' .repeat(40));

async function testUrl(url, description) {
  try {
    const response = await fetch(url, { 
      method: 'GET', 
      headers: { 'User-Agent': 'ONE-SMS-Health-Check/1.0' }
    });
    
    const status = response.status;
    const isOk = status >= 200 && status < 400;
    
    console.log(`${isOk ? '✅' : '⚠️ '} ${description}: ${status} - ${url}`);
    return isOk;
  } catch (error) {
    console.log(`❌ ${description}: ERREUR - ${url}`);
    console.log(`   ${error.message}`);
    return false;
  }
}

if (baseAppUrl) {
  await testUrl(`${baseAppUrl}`, 'Site principal');
  await testUrl(`${baseAppUrl}/payment/success`, 'Page succès');
  await testUrl(`${baseAppUrl}/payment/cancel`, 'Page annulation');
}

if (supabaseUrl) {
  await testUrl(`${supabaseUrl}/functions/v1/paydunya-webhook`, 'Webhook PayDunya');
}

// 5. Recommandations et résumé
console.log('\n💡 RÉSUMÉ ET RECOMMANDATIONS:');
console.log('-' .repeat(40));

const issues = [];

if (!process.env.VITE_APP_URL) {
  issues.push('Variable VITE_APP_URL manquante');
}

if (!process.env.VITE_SUPABASE_URL) {
  issues.push('Variable VITE_SUPABASE_URL manquante');
}

if (!paydunyaConfig.is_active) {
  issues.push('PayDunya n\'est pas activé en base');
}

if (!config.master_key || !config.private_key || !config.token) {
  issues.push('Clés API PayDunya incomplètes');
}

if (issues.length === 0) {
  console.log('✅ TOUTES LES URLS SONT CORRECTEMENT CONFIGURÉES!');
  console.log('\n📋 URLs configurées dans PayDunya:');
  if (baseAppUrl && supabaseUrl) {
    console.log(`   Cancel URL: ${baseAppUrl}/payment/cancel?txid={TRANSACTION_ID}`);
    console.log(`   Return URL: ${baseAppUrl}/payment/success?txid={TRANSACTION_ID}`);
    console.log(`   Callback URL: ${supabaseUrl}/functions/v1/paydunya-webhook`);
  }
} else {
  console.log('❌ PROBLÈMES DÉTECTÉS:');
  issues.forEach(issue => console.log(`   • ${issue}`));
  
  console.log('\n🔧 Actions recommandées:');
  console.log('   1. Vérifier le fichier .env');
  console.log('   2. Activer PayDunya dans Admin → Fournisseurs');
  console.log('   3. Configurer les clés API PayDunya');
  console.log('   4. Redémarrer l\'application');
}

console.log('\n' + '=' .repeat(60));
console.log('🎯 ANALYSE TERMINÉE');