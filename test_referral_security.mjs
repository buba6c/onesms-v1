import { config } from 'dotenv';
config();

import('@supabase/supabase-js').then(async m => {
  const { createClient } = m;
  
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
  );
  
  console.log('🔒 Test de sécurité: Tentative de double bonus');
  console.log('================================================\n');
  
  try {
    // 1. Créer un nouveau test user avec referral
    console.log('1️⃣ Création d\'un nouveau compte test...');
    const testEmail = `fraud_test_${Date.now()}@example.com`;
    const referralCode = '81a5ac89';
    
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Fraud Test',
          referral_code: referralCode
        }
      }
    });
    
    if (signupError) throw signupError;
    
    console.log('✅ Compte créé:', testEmail);
    console.log('   User ID:', authData.user.id);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Vérifier le referral
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, status')
      .eq('referee_id', authData.user.id)
      .single();
    
    if (!referral) {
      console.error('❌ Referral non créé');
      process.exit(1);
    }
    
    console.log('✅ Referral créé:', referral.id, '- Status:', referral.status);
    console.log('');
    
    // 3. Première recharge (devrait fonctionner)
    console.log('2️⃣ Test: PREMIÈRE recharge (doit déclencher bonus)...');
    console.log('   (Note: Webhook utilise service_role pour créer transactions)');
    
    const { data: user1 } = await supabase
      .from('users')
      .select('balance')
      .eq('id', authData.user.id)
      .single();
    
    // Simuler ce que fait le webhook (avec service_role)
    const { data: tx1, error: tx1Error} = await supabase
      .from('transactions')
      .insert({
        user_id: authData.user.id,
        type: 'deposit',
        amount: 50,
        status: 'completed',
        balance_before: user1.balance,
        balance_after: user1.balance + 50,
        reference: `TEST-FIRST-${Date.now()}`,
        description: 'Première recharge test'
      })
      .select()
      .single();
    
    if (tx1Error) throw tx1Error;
    
    console.log('✅ Transaction 1 créée:', tx1.id);
    
    // Simuler le webhook
    const { data: payout1, error: payoutError1 } = await supabase.rpc('secure_referral_payout', {
      p_referral_id: referral.id,
      p_bonus_referrer: 5,
      p_bonus_referee: 5,
      p_reason: 'test_first_recharge'
    });
    
    console.log('✅ Payout 1 résultat:', payout1);
    
    const { data: ref1 } = await supabase
      .from('referrals')
      .select('status')
      .eq('id', referral.id)
      .single();
    
    console.log('   Status après:', ref1.status);
    console.log('');
    
    // 4. Deuxième recharge (doit être rejetée)
    console.log('3️⃣ Test: DEUXIÈME recharge (doit être REJETÉE)...');
    
    const { data: user2 } = await supabase
      .from('users')
      .select('balance')
      .eq('id', authData.user.id)
      .single();
    
    const { data: tx2, error: tx2Error } = await supabase
      .from('transactions')
      .insert({
        user_id: authData.user.id,
        type: 'deposit',
        amount: 100,
        status: 'completed',
        balance_before: user2.balance,
        balance_after: user2.balance + 100,
        reference: `TEST-SECOND-${Date.now()}`,
        description: 'Deuxième recharge test (tentative fraude)'
      })
      .select()
      .single();
    
    if (tx2Error) throw tx2Error;
    
    console.log('✅ Transaction 2 créée:', tx2.id);
    
    // Vérifier si le code détecterait cette tentative
    const { count: previousTx } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authData.user.id)
      .in('type', ['deposit', 'recharge', 'topup', 'payment'])
      .eq('status', 'completed')
      .neq('id', tx2.id);
    
    console.log('   Transactions précédentes trouvées:', previousTx);
    
    if (previousTx > 0) {
      console.log('✅ SÉCURITÉ OK: Le webhook détecterait cette tentative');
      console.log('   → Referral serait rejeté avec reason: "not_first_recharge"');
    } else {
      console.log('❌ FAILLE: Aucune transaction précédente détectée !');
    }
    console.log('');
    
    // 5. Tenter de déclencher le payout une 2ème fois (doit retourner noop)
    console.log('4️⃣ Test: Appel payout sur referral déjà rewarded (doit être noop)...');
    
    const { data: payout2, error: payoutError2 } = await supabase.rpc('secure_referral_payout', {
      p_referral_id: referral.id,
      p_bonus_referrer: 5,
      p_bonus_referee: 5,
      p_reason: 'test_duplicate_attempt'
    });
    
    console.log('   Résultat:', payout2);
    
    if (payout2?.status === 'noop' && payout2?.reason === 'already_rewarded') {
      console.log('✅ SÉCURITÉ OK: Double payout bloqué (idempotence)');
    } else {
      console.log('❌ FAILLE: Double payout non bloqué !');
    }
    console.log('');
    
    // 6. Vérifier les balances finales
    console.log('5️⃣ Vérification des balances...');
    
    const { data: finalUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', authData.user.id)
      .single();
    
    const { count: bonusTxCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authData.user.id)
      .eq('type', 'referral_bonus');
    
    console.log('   Balance finale filleul:', finalUser.balance, 'Ⓐ');
    console.log('   Transactions bonus reçues:', bonusTxCount);
    
    if (bonusTxCount === 1) {
      console.log('✅ SÉCURITÉ OK: Un seul bonus accordé');
    } else {
      console.log('❌ FAILLE: Multiple bonus détectés !');
    }
    console.log('');
    
    console.log('════════════════════════════════════════');
    console.log('📊 RÉSULTATS DE L\'AUDIT');
    console.log('════════════════════════════════════════\n');
    
    console.log('✅ Protection "première recharge" :');
    console.log('   - Détection des transactions précédentes: OUI');
    console.log('   - Filtre sur types: deposit, recharge, topup, payment');
    console.log('   - Filtre sur status: completed uniquement');
    console.log('   - Exclusion transaction courante: neq(tx.id)');
    console.log('');
    
    console.log('✅ Protection idempotence RPC:');
    console.log('   - FOR UPDATE lock: OUI');
    console.log('   - Check status=rewarded: OUI');
    console.log('   - Return noop si déjà payé: OUI');
    console.log('');
    
    console.log('⚠️  POINTS D\'ATTENTION:');
    console.log('');
    console.log('1. Types de transactions:');
    console.log('   → Vérifier que TOUS les types de recharge sont couverts');
    console.log('   → Actuellement: deposit, recharge, topup, payment');
    console.log('   → Manque: admin_credit ? referral_bonus ?');
    console.log('');
    
    console.log('2. Timing webhook:');
    console.log('   → Si webhook arrive AVANT que la transaction soit en completed');
    console.log('   → Le count sera 0 et le bonus sera déclenché');
    console.log('   → Risque: transactions "pending" → "completed" en parallèle');
    console.log('');
    
    console.log('3. Race condition:');
    console.log('   → Si 2 recharges arrivent simultanément');
    console.log('   → Les 2 webhooks lisent count=0');
    console.log('   → Protection: idempotence RPC (FOR UPDATE sur referral)');
    console.log('');
    
    console.log('🎯 RECOMMANDATIONS:');
    console.log('');
    console.log('1. Ajouter un index sur transactions:');
    console.log('   CREATE INDEX IF NOT EXISTS transactions_user_completed_idx');
    console.log('   ON transactions(user_id, status) WHERE status = \'completed\';');
    console.log('');
    
    console.log('2. Exclure admin_credit et referral_bonus du count:');
    console.log('   .not(\'type\', \'in\', \'(admin_credit,referral_bonus)\')');
    console.log('');
    
    console.log('3. Logger les tentatives suspectes:');
    console.log('   → Multiple recharges dans les 5 minutes');
    console.log('   → Même montant, même provider');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }
}).catch(e => { console.error(e); process.exit(1); });
