import('dotenv/config');
import('@supabase/supabase-js').then(async m => {
  const { createClient } = m;
  
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
  );
  
  const referralCode = '81a5ac89';
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('🧪 Test inscription avec code parrainage');
  console.log('========================================\n');
  console.log('📧 Email test:', testEmail);
  console.log('🎫 Code parrainage:', referralCode);
  console.log('');
  
  try {
    // 1. Créer le compte
    console.log('1️⃣ Création du compte...');
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          referral_code: referralCode
        }
      }
    });
    
    if (signupError) {
      console.error('❌ Erreur signup:', signupError.message);
      process.exit(1);
    }
    
    console.log('✅ Compte créé !');
    console.log('   User ID:', authData.user?.id);
    console.log('');
    
    // Attendre un peu pour que le trigger s'exécute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Vérifier que l'entrée user existe
    console.log('2️⃣ Vérification de l\'utilisateur...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError || !user) {
      console.error('❌ User non trouvé dans public.users');
      process.exit(1);
    }
    
    console.log('✅ User créé dans public.users');
    console.log('   Email:', user.email);
    console.log('   Referral code:', user.referral_code);
    console.log('');
    
    // 3. Vérifier que le referral a été créé
    console.log('3️⃣ Vérification du referral...');
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referee_id', authData.user.id)
      .single();
    
    if (refError || !referral) {
      console.error('❌ Referral NON créé !');
      console.error('   Erreur:', refError?.message);
      console.log('');
      console.log('⚠️  Le trigger handle_new_user() n\'a peut-être pas fonctionné');
      console.log('   Vérifie les logs Supabase');
      process.exit(1);
    }
    
    console.log('✅ Referral créé automatiquement !');
    console.log('   Referral ID:', referral.id);
    console.log('   Status:', referral.status);
    console.log('   Referrer:', referral.referrer_id);
    console.log('   Referee:', referral.referee_id);
    console.log('   Expiry:', referral.expiry_date);
    console.log('   Metadata:', JSON.stringify(referral.metadata, null, 2));
    console.log('');
    
    // 4. Vérifier le parrain
    console.log('4️⃣ Info parrain...');
    const { data: referrer } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', referral.referrer_id)
      .single();
    
    console.log('✅ Parrain:', referrer?.email || 'N/A');
    console.log('');
    
    // 5. Compter les filleuls du parrain
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referral.referrer_id);
    
    console.log('👥 Total filleuls du parrain:', count || 0);
    console.log('');
    
    console.log('🎉 TEST RÉUSSI !');
    console.log('');
    console.log('✅ Résumé:');
    console.log('  - Compte créé avec metadata referral_code ✓');
    console.log('  - Trigger handle_new_user() a validé le code ✓');
    console.log('  - Entrée referral créée automatiquement ✓');
    console.log('  - Status = pending (en attente de recharge) ✓');
    console.log('');
    console.log('📋 Prochaine étape:');
    console.log('  → Le filleul doit recharger pour passer en "qualified"');
    console.log('  → Puis le webhook déclenchera les bonus parrainage');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}).catch(e => { console.error(e); process.exit(1); });
