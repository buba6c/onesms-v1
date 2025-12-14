#!/usr/bin/env node
/**
 * 🧪 TEST LOCAL PAYDUNYA INTEGRATION
 * 
 * Ce script teste l'intégration PayDunya en local :
 * 1. Vérifie la configuration PayDunya dans payment_providers
 * 2. Teste la création d'un paiement
 * 3. Teste la vérification d'un paiement
 * 4. Affiche les résultats
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🚀 TEST PAYDUNYA - Démarrage...\n');

// ============================================================================
// ÉTAPE 1: Vérifier la configuration PayDunya
// ============================================================================
async function checkPayDunyaConfig() {
  console.log('📋 ÉTAPE 1: Vérification configuration PayDunya\n');

  const { data: provider, error } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_code', 'paydunya')
    .single();

  if (error) {
    console.error('❌ Erreur récupération config:', error.message);
    return null;
  }

  console.log('✅ PayDunya trouvé:');
  console.log(`   - Nom: ${provider.provider_name}`);
  console.log(`   - Actif: ${provider.is_active ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Par défaut: ${provider.is_default ? '⭐ OUI' : '❌ NON'}`);
  console.log(`   - Moyens de paiement: ${provider.supported_methods?.length || 0} méthodes`);
  
  if (provider.config) {
    const hasKeys = !!(provider.config.master_key && provider.config.private_key && provider.config.token);
    console.log(`   - Clés API configurées: ${hasKeys ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - Mode: ${provider.config.mode || 'non défini'}`);
  } else {
    console.log('   - ⚠️ Aucune configuration trouvée');
  }

  console.log('');
  return provider;
}

// ============================================================================
// ÉTAPE 2: Créer un paiement test
// ============================================================================
async function createTestPayment(userId = null) {
  console.log('💳 ÉTAPE 2: Création paiement test\n');

  // Si pas d'userId fourni, récupérer le premier user admin
  if (!userId) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('❌ Aucun utilisateur trouvé pour le test');
      return null;
    }
    
    userId = users[0].id;
    console.log(`ℹ️  Utilisation utilisateur: ${users[0].email}\n`);
  }

  const testAmount = 1000; // 1000 FCFA pour test

  console.log('📤 Appel Edge Function: paydunya-create-payment');
  console.log(`   - Montant: ${testAmount} FCFA`);
  console.log(`   - User ID: ${userId}`);

  const { data, error } = await supabase.functions.invoke('paydunya-create-payment', {
    body: {
      amount: testAmount,
      userId: userId,
      email: 'test@onesms.com',
      phone: '+221771234567',
      metadata: {
        description: 'Test PayDunya local',
        type: 'test'
      }
    }
  });

  if (error) {
    console.error('\n❌ ERREUR création paiement:', error);
    
    // Essayer de lire le body de l'erreur
    try {
      const errorBody = await error.context?.json();
      console.error('📄 Détails erreur:', JSON.stringify(errorBody, null, 2));
    } catch (e) {
      console.error('⚠️  Impossible de lire le body de l\'erreur');
    }
    return null;
  }

  if (!data.success) {
    console.error('\n❌ Échec création paiement:', data.error);
    return null;
  }

  console.log('\n✅ PAIEMENT CRÉÉ AVEC SUCCÈS!');
  console.log(`   - Transaction ID: ${data.transaction_id}`);
  console.log(`   - Token PayDunya: ${data.token}`);
  console.log(`   - URL de paiement: ${data.payment_url}`);
  console.log('');
  
  return {
    transactionId: data.transaction_id,
    token: data.token,
    paymentUrl: data.payment_url
  };
}

// ============================================================================
// ÉTAPE 3: Vérifier le statut du paiement
// ============================================================================
async function verifyPayment(transactionId, token) {
  console.log('🔍 ÉTAPE 3: Vérification statut paiement\n');

  console.log('📤 Appel Edge Function: paydunya-verify-payment');
  console.log(`   - Transaction ID: ${transactionId}`);
  console.log(`   - Token: ${token}`);

  const { data, error } = await supabase.functions.invoke('paydunya-verify-payment', {
    body: {
      transactionId: transactionId,
      token: token
    }
  });

  if (error) {
    console.error('\n❌ ERREUR vérification:', error);
    return null;
  }

  console.log('\n✅ VÉRIFICATION RÉUSSIE!');
  console.log(`   - Statut transaction: ${data.status}`);
  console.log(`   - Détails PayDunya:`, JSON.stringify(data.paydunya_details, null, 2));
  console.log('');

  return data;
}

// ============================================================================
// ÉTAPE 4: Afficher tous les providers actifs
// ============================================================================
async function listActiveProviders() {
  console.log('📊 ÉTAPE 4: Liste des fournisseurs actifs\n');

  const { data: providers, error } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('❌ Erreur récupération providers:', error.message);
    return;
  }

  console.log(`Nombre de fournisseurs actifs: ${providers.length}\n`);

  providers.forEach((provider, index) => {
    console.log(`${index + 1}. ${provider.provider_name}`);
    console.log(`   - Code: ${provider.provider_code}`);
    console.log(`   - Par défaut: ${provider.is_default ? '⭐ OUI' : 'Non'}`);
    console.log(`   - Priorité: ${provider.priority}`);
    console.log(`   - Méthodes: ${provider.supported_methods?.length || 0}`);
    console.log('');
  });
}

// ============================================================================
// MAIN - Orchestration des tests
// ============================================================================
async function main() {
  try {
    // 1. Vérifier config PayDunya
    const paydunyaConfig = await checkPayDunyaConfig();
    
    if (!paydunyaConfig) {
      console.error('❌ Impossible de continuer sans configuration PayDunya');
      process.exit(1);
    }

    if (!paydunyaConfig.is_active) {
      console.log('⚠️  PayDunya est désactivé. Activation requise pour tester.\n');
      console.log('💡 Pour activer PayDunya:');
      console.log('   1. Aller sur https://onesms-sn.com/admin/payment-providers');
      console.log('   2. Configurer les clés API PayDunya');
      console.log('   3. Activer le toggle');
      console.log('');
      process.exit(0);
    }

    // 2. Lister les providers actifs
    await listActiveProviders();

    // 3. Créer un paiement test
    console.log('─'.repeat(80));
    const payment = await createTestPayment();
    
    if (!payment) {
      console.error('❌ Impossible de créer un paiement test');
      process.exit(1);
    }

    console.log('─'.repeat(80));
    console.log('\n🎉 TEST CRÉÉ AVEC SUCCÈS!\n');
    console.log('📝 PROCHAINES ÉTAPES POUR TESTER:\n');
    console.log('1. Ouvrir l\'URL de paiement dans votre navigateur:');
    console.log(`   ${payment.paymentUrl}`);
    console.log('');
    console.log('2. Simuler un paiement avec les comptes test PayDunya:');
    console.log('   - Compte client test avec solde fictif');
    console.log('   - Voir: https://paydunya.com/developers/sandbox');
    console.log('');
    console.log('3. Une fois le paiement effectué, tester la vérification:');
    console.log(`   node test_paydunya_local.mjs verify ${payment.transactionId}`);
    console.log('');
    console.log('4. Le webhook sera appelé automatiquement par PayDunya');
    console.log(`   URL webhook: ${process.env.VITE_SUPABASE_URL}/functions/v1/paydunya-webhook`);
    console.log('');

    // Si argument "verify" passé avec transaction ID
    if (process.argv[2] === 'verify' && process.argv[3]) {
      console.log('─'.repeat(80));
      await verifyPayment(process.argv[3], payment.token);
    }

    console.log('✅ Test terminé avec succès!\n');

  } catch (error) {
    console.error('\n❌ ERREUR GLOBALE:', error);
    process.exit(1);
  }
}

// Lancer le test
main();
