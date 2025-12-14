/**
 * Script de diagnostic des transactions MoneyFusion
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function diagnose() {
  console.log('═'.repeat(60));
  console.log('🔍 DIAGNOSTIC TRANSACTIONS MONEYFUSION');
  console.log('═'.repeat(60));

  // 1. Vérifier la structure de la table transactions
  console.log('\n📋 1. Structure de la table transactions:');
  const { data: sampleTx, error: sampleError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.log('   ❌ Erreur accès table:', sampleError.message);
    
    if (sampleError.code === '42P01') {
      console.log('   → La table "transactions" n\'existe pas!');
    } else if (sampleError.code === '42501') {
      console.log('   → Problème de permissions RLS');
    }
  } else {
    console.log('   ✅ Table accessible');
  }

  // 2. Compter les transactions par statut
  console.log('\n📊 2. Transactions par statut:');
  for (const status of ['pending', 'completed', 'failed']) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    console.log(`   ${status}: ${count || 0}`);
  }

  // 3. Compter les transactions par type
  console.log('\n📊 3. Transactions par type:');
  for (const type of ['deposit', 'recharge', 'topup', 'purchase', 'refund']) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
    if (count > 0) console.log(`   ${type}: ${count}`);
  }

  // 4. Vérifier les utilisateurs
  console.log('\n👥 4. Utilisateurs:');
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  console.log(`   Total: ${userCount || 0}`);

  // 5. Vérifier votre utilisateur (buba6c@gmail.com)
  console.log('\n🔍 5. Votre compte (buba6c@gmail.com):');
  const { data: myUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'buba6c@gmail.com')
    .single();
  
  if (userError) {
    console.log('   ❌ Erreur:', userError.message);
  } else if (myUser) {
    console.log('   ✅ Trouvé!');
    console.log(`   - ID: ${myUser.id}`);
    console.log(`   - Balance: ${myUser.balance || 0}`);
    console.log(`   - Activations: ${myUser.activations_balance || 0}`);
    console.log(`   - Role: ${myUser.role || 'user'}`);
    
    // Vérifier les transactions de cet utilisateur
    console.log('\n📜 6. Vos transactions:');
    const { data: myTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', myUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (txError) {
      console.log('   ❌ Erreur:', txError.message);
    } else if (myTx && myTx.length > 0) {
      console.log(`   ✅ ${myTx.length} transaction(s):`);
      myTx.forEach(tx => {
        console.log(`   - ${tx.created_at?.substring(0,16)} | ${tx.type} | ${tx.amount} | ${tx.status}`);
      });
    } else {
      console.log('   ⚠️ Aucune transaction trouvée');
    }
  } else {
    console.log('   ⚠️ Utilisateur non trouvé');
  }

  // 7. Test d'insertion (avec votre ID si disponible)
  console.log('\n🧪 7. Test d\'insertion transaction:');
  if (myUser) {
    const testTx = {
      user_id: myUser.id,
      type: 'deposit',
      amount: 1,
      status: 'pending',
      description: 'Test diagnostic',
      reference: `TEST_${Date.now()}`
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('transactions')
      .insert(testTx)
      .select();
    
    if (insertError) {
      console.log('   ❌ Insertion échouée:', insertError.code, insertError.message);
      console.log('   → Cause probable: Politique RLS bloque l\'insertion');
    } else {
      console.log('   ✅ Insertion OK!');
      // Supprimer le test
      await supabase.from('transactions').delete().eq('id', inserted[0].id);
      console.log('   ✅ Test supprimé');
    }
  }

  // 8. Résumé et recommandations
  console.log('\n' + '═'.repeat(60));
  console.log('📝 RÉSUMÉ ET RECOMMANDATIONS');
  console.log('═'.repeat(60));
  
  console.log(`
Si vos transactions n'apparaissent pas dans Admin, vérifiez:

1. 🔑 Les secrets Supabase Edge Functions:
   - MONEYFUSION_API_URL doit être configuré
   - Allez dans: Supabase Dashboard > Edge Functions > Secrets

2. 📜 Les logs Edge Functions:
   - Allez dans: Supabase Dashboard > Edge Functions > Logs
   - Cherchez "init-moneyfusion-payment" et "moneyfusion-webhook"

3. 🔒 Les politiques RLS sur la table transactions:
   - Les Edge Functions utilisent service_role qui bypass RLS
   - Exécutez FIX_TRANSACTIONS_RLS.sql si nécessaire

4. 📡 Le webhook MoneyFusion:
   - L'URL du webhook doit être: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneyfusion-webhook
   - Vérifiez que MoneyFusion envoie bien les notifications
`);
}

diagnose();
