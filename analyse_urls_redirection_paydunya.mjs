#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Charger les variables d'environnement
dotenv.config();

console.log('🔍 ANALYSE DES URLS DE REDIRECTION PAYDUNYA');
console.log('=' .repeat(50));

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyseConfigurationPayDunya() {
  console.log('\n📋 1. CONFIGURATION PAYDUNYA DANS LA BASE DE DONNÉES');
  console.log('-'.repeat(40));

  try {
    const { data: paymentProviders, error } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('provider_code', 'paydunya');

    if (error) {
      console.error('❌ Erreur requête:', error.message);
      return;
    }

    if (!paymentProviders || paymentProviders.length === 0) {
      console.log('⚠️  Aucun fournisseur PayDunya trouvé dans payment_providers');
      return;
    }

    const paydunya = paymentProviders[0];
    console.log(`✅ PayDunya trouvé - ID: ${paydunya.id}`);
    console.log(`   Actif: ${paydunya.is_active ? '✅' : '❌'}`);
    console.log(`   Nom: ${paydunya.provider_name}`);
    
    if (paydunya.config) {
      console.log('\n🔧 Configuration PayDunya:');
      console.log(`   Mode: ${paydunya.config.mode || 'NON DÉFINI'}`);
      console.log(`   Master Key: ${paydunya.config.master_key ? '✅ Définie' : '❌ Manquante'}`);
      console.log(`   Private Key: ${paydunya.config.private_key ? '✅ Définie' : '❌ Manquante'}`);
      console.log(`   Token: ${paydunya.config.token ? '✅ Défini' : '❌ Manquant'}`);
    }

    return paydunya;
  } catch (error) {
    console.error('❌ Erreur analyse config:', error.message);
  }
}

async function analyseURLsEnvironnement() {
  console.log('\n🌐 2. VARIABLES D\'ENVIRONNEMENT URLS');
  console.log('-'.repeat(40));

  const variables = [
    'VITE_APP_URL',
    'VITE_SUPABASE_URL',
    'APP_URL'
  ];

  variables.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? `✅ ${value}` : '❌ NON DÉFINIE'}`);
  });

  // Analyser le fichier .env directement
  try {
    const envContent = readFileSync('.env', 'utf8');
    console.log('\n📄 Contenu fichier .env pour PayDunya:');
    
    const paydunyaLines = envContent.split('\n').filter(line => 
      line.includes('PAYDUNYA') || 
      line.includes('APP_URL') ||
      line.includes('CALLBACK') ||
      line.includes('RETURN') ||
      line.includes('CANCEL')
    );
    
    paydunyaLines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        console.log(`   ${line}`);
      }
    });
  } catch (error) {
    console.log('⚠️  Impossible de lire le fichier .env');
  }
}

function analyseURLsCodeSource() {
  console.log('\n💾 3. ANALYSE DES URLS DANS LE CODE SOURCE');
  console.log('-'.repeat(40));

  try {
    // Analyser la fonction paydunya-create-payment
    const paymentFunctionPath = './supabase/functions/paydunya-create-payment/index.ts';
    const paymentFunction = readFileSync(paymentFunctionPath, 'utf8');
    
    console.log('📁 Fonction paydunya-create-payment:');
    
    // Rechercher les URLs de redirection
    const urlPatterns = [
      /cancel_url:\s*`([^`]+)`/g,
      /return_url:\s*`([^`]+)`/g,
      /callback_url:\s*`([^`]+)`/g
    ];
    
    urlPatterns.forEach((pattern, index) => {
      const match = pattern.exec(paymentFunction);
      if (match) {
        const urlType = ['Cancel URL', 'Return URL', 'Callback URL'][index];
        console.log(`   ✅ ${urlType}: ${match[1]}`);
      }
    });

    // Analyser les URLs API PayDunya
    const apiUrlMatch = paymentFunction.match(/const apiUrl = mode === 'live'\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/);
    if (apiUrlMatch) {
      console.log(`   ✅ API Live URL: ${apiUrlMatch[1]}`);
      console.log(`   ✅ API Test URL: ${apiUrlMatch[2]}`);
    }

  } catch (error) {
    console.log('⚠️  Erreur lecture fonction PayDunya:', error.message);
  }
}

async function analyseSystemSettings() {
  console.log('\n⚙️  4. PARAMÈTRES SYSTÈME');
  console.log('-'.repeat(40));

  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['app_url', 'payment_callback_url', 'payment_return_url', 'payment_cancel_url']);

    if (error) {
      console.error('❌ Erreur requête system_settings:', error.message);
      return;
    }

    if (settings && settings.length > 0) {
      settings.forEach(setting => {
        console.log(`   ${setting.key}: ${setting.value}`);
      });
    } else {
      console.log('⚠️  Aucun paramètre d\'URL trouvé dans system_settings');
    }
  } catch (error) {
    console.error('❌ Erreur analyse system_settings:', error.message);
  }
}

function genererURLsExemples() {
  console.log('\n🎯 5. URLS GÉNÉRÉES AVEC LA CONFIGURATION ACTUELLE');
  console.log('-'.repeat(40));

  const baseUrl = process.env.VITE_APP_URL || 'https://onesms-sn.com';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const exampleTxId = 'tx_123456789';

  console.log('📍 URLs de redirection PayDunya:');
  console.log(`   Cancel URL: ${baseUrl}/payment/cancel?txid=${exampleTxId}`);
  console.log(`   Return URL: ${baseUrl}/payment/success?txid=${exampleTxId}`);
  console.log(`   Callback URL: ${supabaseUrl}/functions/v1/paydunya-webhook`);

  console.log('\n🔗 URLs API PayDunya:');
  console.log(`   Live API: https://app.paydunya.com/api/v1/checkout-invoice/create`);
  console.log(`   Test API: https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create`);
}

function verifierCoherence() {
  console.log('\n✅ 6. VÉRIFICATION DE COHÉRENCE');
  console.log('-'.repeat(40));

  const issues = [];

  // Vérifier VITE_APP_URL
  if (!process.env.VITE_APP_URL) {
    issues.push('❌ VITE_APP_URL non définie');
  } else if (!process.env.VITE_APP_URL.startsWith('https://')) {
    issues.push('⚠️  VITE_APP_URL devrait utiliser HTTPS en production');
  }

  // Vérifier SUPABASE_URL
  if (!process.env.VITE_SUPABASE_URL) {
    issues.push('❌ VITE_SUPABASE_URL non définie');
  } else if (!process.env.VITE_SUPABASE_URL.includes('supabase.co')) {
    issues.push('⚠️  VITE_SUPABASE_URL ne semble pas être une URL Supabase valide');
  }

  // Vérifier cohérence des domaines
  const appUrl = process.env.VITE_APP_URL;
  if (appUrl) {
    const domain = new URL(appUrl).hostname;
    console.log(`🌍 Domaine principal: ${domain}`);
    
    if (domain === 'localhost') {
      issues.push('⚠️  Configuration en développement (localhost)');
    }
  }

  if (issues.length === 0) {
    console.log('🎉 Aucun problème détecté!');
  } else {
    console.log('🚨 Problèmes détectés:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  return issues;
}

async function recommandations() {
  console.log('\n💡 7. RECOMMANDATIONS');
  console.log('-'.repeat(40));

  const appUrl = process.env.VITE_APP_URL;
  const isDev = !appUrl || appUrl.includes('localhost');

  if (isDev) {
    console.log('🔧 Configuration de développement détectée:');
    console.log('   • Assurez-vous que les URLs pointent vers votre environnement de dev');
    console.log('   • PayDunya sandbox doit être utilisé');
    console.log('   • Les callbacks peuvent ne pas fonctionner avec localhost');
  } else {
    console.log('🚀 Configuration de production:');
    console.log('   • Vérifiez que toutes les URLs utilisent HTTPS');
    console.log('   • Confirmez que les domaines sont accessibles');
    console.log('   • Testez les URLs de callback avec PayDunya');
  }

  console.log('\n📋 Liste de vérification URLs PayDunya:');
  console.log('   ☐ Cancel URL accessible et affiche une page d\'annulation');
  console.log('   ☐ Return URL accessible et affiche une page de succès');
  console.log('   ☐ Callback URL répond correctement aux webhooks PayDunya');
  console.log('   ☐ Variables d\'environnement cohérentes entre dev/prod');
  console.log('   ☐ Configuration PayDunya dans payment_providers active');
}

// Fonction principale
async function main() {
  try {
    await analyseConfigurationPayDunya();
    await analyseURLsEnvironnement();
    analyseURLsCodeSource();
    await analyseSystemSettings();
    genererURLsExemples();
    const issues = verifierCoherence();
    await recommandations();

    console.log('\n' + '='.repeat(50));
    console.log('🏁 ANALYSE TERMINÉE');
    
    if (issues.length === 0) {
      console.log('✅ Configuration PayDunya URLs semble correcte!');
    } else {
      console.log(`⚠️  ${issues.length} problème(s) détecté(s) - voir ci-dessus`);
    }

  } catch (error) {
    console.error('❌ Erreur durant l\'analyse:', error.message);
    process.exit(1);
  }
}

main();