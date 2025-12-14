import('dotenv/config');
import('@supabase/supabase-js').then(async m => {
  const { createClient } = m;
  
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
  );
  
  const code = '81a5ac89';
  
  console.log('🔍 Vérification du code de parrainage:', code);
  console.log('');
  
  // Chercher le parrain
  const { data: parrain, error } = await supabase
    .from('users')
    .select('id, email, referral_code, name')
    .eq('referral_code', code)
    .single();
  
  if (error || !parrain) {
    console.log('❌ Code invalide ou inexistant');
    console.log('');
    console.log('Codes valides disponibles:');
    const { data: users } = await supabase
      .from('users')
      .select('email, referral_code')
      .not('referral_code', 'is', null)
      .limit(5);
    users?.forEach(u => console.log('  -', u.referral_code, '→', u.email));
    process.exit(1);
  }
  
  console.log('✅ Code valide !');
  console.log('');
  console.log('📋 Info parrain:');
  console.log('  Email:', parrain.email);
  console.log('  Nom:', parrain.name || 'N/A');
  console.log('  ID:', parrain.id);
  console.log('');
  
  // Compter ses filleuls actuels
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', parrain.id);
  
  console.log('👥 Filleuls actuels:', count || 0);
  console.log('');
  console.log('✅ Prêt pour test inscription !');
  console.log('');
  console.log('🎯 Pour tester:');
  console.log('1. Va sur https://onesms-sn.com/register?ref=81a5ac89');
  console.log('2. Inscris-toi avec un nouveau compte');
  console.log('3. Vérifie que le referral est créé');
  console.log('');
  console.log('Ou simule avec: node test_signup_referral.mjs');
  
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
