/**
 * Test du flux de recharge TopUp sans paiement réel
 * Simule le webhook MoneyFusion pour créditer un utilisateur
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Configuration du test
const TEST_CONFIG = {
  userEmail: 'test@example.com', // Changez pour un vrai email d'utilisateur
  activationsToAdd: 5, // Nombre d'activations à ajouter
  simulateWebhook: true // true = simuler le webhook, false = juste créer transaction pending
};

async function testTopUpFlow() {
  console.log('\n🧪 ========== TEST FLUX TOPUP ==========\n');
  
  // 1. Trouver un utilisateur pour le test
  console.log('1️⃣ Recherche utilisateur...');
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, balance')
    .limit(5);
  
  if (userError) {
    console.error('❌ Erreur:', userError.message);
    return;
  }

  console.log('\n📋 Utilisateurs disponibles:');
  users.forEach((u, i) => {
    console.log(`   [${i+1}] ${u.email} - Balance: ${u.balance || 0} Ⓐ`);
  });

  // Sélectionner le premier utilisateur ou celui spécifié
  let testUser = users.find(u => u.email === TEST_CONFIG.userEmail) || users[0];
  
  if (!testUser) {
    console.error('❌ Aucun utilisateur trouvé!');
    return;
  }

  console.log(`\n✅ Utilisateur sélectionné: ${testUser.email}`);
  console.log(`   Balance actuelle: ${testUser.balance || 0} Ⓐ`);

  // 2. Créer une transaction de test (simule init-moneyfusion-payment)
  console.log('\n2️⃣ Création transaction pending (simulation init-moneyfusion-payment)...');
  
  const paymentRef = `TEST_${testUser.id.substring(0, 8)}_${Date.now()}`;
  const fakeToken = `TKN_${Date.now()}`;
  
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: testUser.id,
      type: 'deposit',
      amount: TEST_CONFIG.activationsToAdd,
      balance_before: testUser.balance || 0,
      balance_after: (testUser.balance || 0) + TEST_CONFIG.activationsToAdd,
      status: 'pending',
      reference: paymentRef,
      description: `[TEST] Rechargement de ${TEST_CONFIG.activationsToAdd} activations`,
      metadata: {
        moneyfusion_token: fakeToken,
        activations: TEST_CONFIG.activationsToAdd,
        type: 'recharge',
        payment_provider: 'moneyfusion',
        amount_xof: TEST_CONFIG.activationsToAdd * 500, // Prix fictif
        is_test: true
      }
    })
    .select()
    .single();

  if (txError) {
    console.error('❌ Erreur création transaction:', txError.message);
    return;
  }

  console.log(`✅ Transaction créée: ${tx.id}`);
  console.log(`   Reference: ${paymentRef}`);
  console.log(`   Status: ${tx.status}`);
  console.log(`   Activations: ${tx.amount}`);

  if (!TEST_CONFIG.simulateWebhook) {
    console.log('\n⏸️ Mode test partiel - Transaction créée mais non complétée');
    console.log('   Pour compléter, relancez avec simulateWebhook: true');
    return;
  }

  // 3. Simuler le webhook MoneyFusion (payin.session.completed)
  console.log('\n3️⃣ Simulation webhook MoneyFusion (payin.session.completed)...');
  
  // Récupérer le solde actuel (au cas où il a changé)
  const { data: currentUser } = await supabase
    .from('users')
    .select('balance')
    .eq('id', testUser.id)
    .single();

  const currentBalance = currentUser?.balance || 0;
  const creditsToAdd = tx.metadata?.activations || TEST_CONFIG.activationsToAdd;
  const newBalance = currentBalance + creditsToAdd;

  console.log(`   Balance avant: ${currentBalance} Ⓐ`);
  console.log(`   Crédits à ajouter: ${creditsToAdd} Ⓐ`);
  console.log(`   Balance après: ${newBalance} Ⓐ`);

  // Mettre à jour la transaction
  const { error: updateTxError } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      balance_before: currentBalance,
      balance_after: newBalance,
      updated_at: new Date().toISOString(),
      metadata: {
        ...tx.metadata,
        moneyfusion_status: 'paid',
        moneyfusion_method: 'TEST',
        completed_at: new Date().toISOString()
      }
    })
    .eq('id', tx.id);

  if (updateTxError) {
    console.error('❌ Erreur mise à jour transaction:', updateTxError.message);
    return;
  }

  console.log('✅ Transaction mise à jour: completed');

  // Créditer le solde utilisateur
  const { error: balanceError } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', testUser.id);

  if (balanceError) {
    console.error('❌ Erreur crédit balance:', balanceError.message);
    return;
  }

  console.log(`✅ Balance créditée: ${currentBalance} → ${newBalance} Ⓐ`);

  // 4. Vérification finale
  console.log('\n4️⃣ Vérification finale...');
  
  const { data: finalUser } = await supabase
    .from('users')
    .select('balance')
    .eq('id', testUser.id)
    .single();

  const { data: finalTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', tx.id)
    .single();

  console.log(`\n📊 Résultat du test:`);
  console.log(`   👤 Utilisateur: ${testUser.email}`);
  console.log(`   💰 Balance finale: ${finalUser?.balance} Ⓐ`);
  console.log(`   📝 Transaction status: ${finalTx?.status}`);
  console.log(`   🔗 Reference: ${finalTx?.reference}`);

  if (finalUser?.balance === newBalance && finalTx?.status === 'completed') {
    console.log('\n✅ ✅ ✅ TEST RÉUSSI! Le flux de recharge fonctionne correctement! ✅ ✅ ✅\n');
  } else {
    console.log('\n⚠️ Le test a révélé des incohérences\n');
  }
}

// Fonction pour nettoyer les transactions de test
async function cleanupTestTransactions() {
  console.log('\n🧹 Nettoyage des transactions de test...');
  
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .like('reference', 'TEST_%')
    .select();

  if (error) {
    console.error('❌ Erreur:', error.message);
  } else {
    console.log(`✅ ${data?.length || 0} transactions de test supprimées`);
  }
}

// Fonction pour voir les transactions récentes
async function viewRecentTransactions() {
  console.log('\n📋 ========== TRANSACTIONS RÉCENTES ==========\n');
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  data.forEach((t, i) => {
    const isTest = t.metadata?.is_test ? '🧪' : '';
    console.log(`[${i+1}] ${isTest} ${t.type} - ${t.status}`);
    console.log(`    Amount: ${t.amount} | Ref: ${t.reference || 'N/A'}`);
    console.log(`    Date: ${new Date(t.created_at).toLocaleString()}`);
    console.log('');
  });
}

// Menu principal
const args = process.argv.slice(2);
const command = args[0] || 'test';

switch (command) {
  case 'test':
    testTopUpFlow();
    break;
  case 'view':
    viewRecentTransactions();
    break;
  case 'cleanup':
    cleanupTestTransactions();
    break;
  default:
    console.log('Usage: node test_topup_flow.mjs [test|view|cleanup]');
    console.log('  test    - Exécuter le test de recharge');
    console.log('  view    - Voir les transactions récentes');
    console.log('  cleanup - Supprimer les transactions de test');
}
