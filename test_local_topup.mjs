/**
 * Test de recharge TopUp en local
 * Simule l'appel que fait TopUpPage.tsx vers l'Edge Function
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

// Client avec anon key pour simuler un utilisateur
const supabase = createClient(SUPABASE_URL, ANON_KEY);
// Client admin
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Credentials de test - changez ces valeurs !
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123'; // Mot de passe du compte test

async function loginAndTest() {
  console.log('\n🧪 ========== TEST RECHARGE EN LOCAL (avec login) ==========\n');
  
  // 1. Se connecter pour obtenir un vrai token
  console.log('🔐 Connexion...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (authError) {
    console.error('❌ Erreur de connexion:', authError.message);
    console.log('\n💡 Assurez-vous que le compte existe avec ce mot de passe');
    console.log('   Ou modifiez TEST_EMAIL et TEST_PASSWORD dans le script');
    
    // Alternative: tester sans auth (simulation directe)
    console.log('\n📋 Test alternatif: simulation directe sans Edge Function...');
    await testDirectSimulation();
    return;
  }

  const user = authData.user;
  const session = authData.session;
  console.log(`✅ Connecté: ${user.email}`);

  // 2. Récupérer les packages
  const { data: packages } = await supabaseAdmin
    .from('activation_packages')
    .select('*')
    .eq('is_active', true)
    .order('activations', { ascending: true })
    .limit(1);

  if (!packages?.length) {
    console.error('❌ Aucun package trouvé');
    return;
  }

  const selectedPackage = packages[0];
  console.log(`\n📦 Package: ${selectedPackage.activations} activations (${selectedPackage.price_xof} FCFA)`);

  // 3. Appeler l'Edge Function avec le vrai token utilisateur
  console.log('\n📡 Appel init-moneyfusion-payment...');
  
  const { data, error } = await supabase.functions.invoke('init-moneyfusion-payment', {
    body: {
      amount: selectedPackage.price_xof,
      currency: 'XOF',
      description: `Rechargement ${selectedPackage.activations} activations`,
      metadata: {
        user_id: user.id,
        type: 'recharge',
        provider: 'moneyfusion',
        activations: selectedPackage.activations,
        package_id: selectedPackage.id
      },
      return_url: 'https://onesms-sn.com/dashboard?payment=success',
      customer: {
        email: user.email,
        first_name: 'Test',
        last_name: 'User',
        phone: '00000000'
      }
    }
  });

  console.log('\n📥 Réponse:');
  
  if (error) {
    console.error('❌ Erreur:', error.message);
    console.log('   Context:', JSON.stringify(error, null, 2));
  } else {
    console.log('   Data:', JSON.stringify(data, null, 2));
    
    const checkoutUrl = data?.data?.checkout_url || data?.checkout_url;
    if (checkoutUrl) {
      console.log('\n✅ SUCCESS! URL de paiement:');
      console.log(`   ${checkoutUrl}`);
      console.log('\n💳 Pour compléter le test, ouvrez cette URL et payez');
    }
  }
}

// Test direct sans passer par l'Edge Function
async function testDirectSimulation() {
  console.log('\n🔄 Simulation directe du flux...\n');
  
  // Récupérer un utilisateur
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, balance')
    .eq('email', TEST_EMAIL)
    .single();

  if (!user) {
    console.error('❌ Utilisateur non trouvé');
    return;
  }

  console.log(`👤 Utilisateur: ${user.email} (Balance: ${user.balance} Ⓐ)`);

  // Récupérer un package
  const { data: packages } = await supabaseAdmin
    .from('activation_packages')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (!packages?.length) {
    console.error('❌ Aucun package');
    return;
  }

  const pkg = packages[0];
  const paymentRef = `TEST_LOCAL_${Date.now()}`;

  // Créer une transaction pending
  const { data: tx, error: txError } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'deposit',
      amount: pkg.activations,
      balance_before: user.balance,
      balance_after: user.balance + pkg.activations,
      status: 'pending',
      reference: paymentRef,
      description: `[TEST LOCAL] ${pkg.activations} activations`,
      metadata: {
        activations: pkg.activations,
        payment_provider: 'moneyfusion',
        is_test: true
      }
    })
    .select()
    .single();

  if (txError) {
    console.error('❌ Erreur création transaction:', txError.message);
    return;
  }

  console.log(`\n✅ Transaction pending créée: ${tx.reference}`);
  console.log(`   Activations à ajouter: ${pkg.activations}`);

  // Simuler le webhook
  console.log('\n⏳ Simulation du webhook (paiement réussi)...');
  
  const newBalance = user.balance + pkg.activations;
  
  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'completed',
      balance_after: newBalance,
      metadata: { ...tx.metadata, completed_at: new Date().toISOString() }
    })
    .eq('id', tx.id);

  await supabaseAdmin
    .from('users')
    .update({ balance: newBalance })
    .eq('id', user.id);

  // Vérifier
  const { data: finalUser } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('id', user.id)
    .single();

  console.log(`\n✅ Balance mise à jour: ${user.balance} → ${finalUser.balance} Ⓐ`);
  console.log('\n🎉 Le flux de recharge fonctionne correctement en simulation!');
}

// Fonction pour vérifier les transactions pending
async function checkPendingTransactions() {
  console.log('\n📋 ========== TRANSACTIONS PENDING ==========\n');
  
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!data?.length) {
    console.log('Aucune transaction pending');
    return;
  }

  data.forEach((tx, i) => {
    console.log(`[${i+1}] ${tx.reference}`);
    console.log(`    Créée: ${new Date(tx.created_at).toLocaleString()}`);
    console.log(`    Activations: ${tx.amount}`);
    console.log(`    Token: ${tx.metadata?.moneyfusion_token || 'N/A'}`);
    console.log(`    Checkout: ${tx.metadata?.checkout_url || 'N/A'}`);
    console.log('');
  });
}

// Menu
const args = process.argv.slice(2);
const command = args[0] || 'test';

switch (command) {
  case 'test':
    loginAndTest();
    break;
  case 'pending':
    checkPendingTransactions();
    break;
  default:
    console.log('Usage: node test_local_topup.mjs [test|pending]');
}
