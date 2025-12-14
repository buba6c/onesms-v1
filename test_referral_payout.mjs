import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function testPayout() {
  // D'abord remettre le referral en qualified pour pouvoir le payer
  await supabase
    .from('referrals')
    .update({ status: 'qualified', reason: null })
    .eq('id', 'b834a1f7-f44f-4da8-8704-4f2b66c3b337');

  console.log('Referral remis en qualified');

  // Tester la fonction secure_referral_payout
  const { data, error } = await supabase.rpc('secure_referral_payout', {
    p_referral_id: 'b834a1f7-f44f-4da8-8704-4f2b66c3b337',
    p_bonus_referrer: 5,
    p_bonus_referee: 5,
    p_reason: 'referral_first_recharge'
  });

  console.log('=== RÉSULTAT PAYOUT ===');
  console.log('Data:', data);
  console.log('Error:', error);

  if (error) {
    console.log('ÉCHEC du payout');
    process.exit(1);
  }

  // Vérifier les balances
  const { data: referee } = await supabase.from('users').select('email, balance').eq('id', 'bc46c658-a5fe-45e3-b825-58edbf7a8264').single();
  const { data: referrer } = await supabase.from('users').select('email, balance').eq('id', 'dae7b6ad-aa2b-45ae-b523-a30c3de09563').single();
  
  console.log('\n=== BALANCES ===');
  console.log('Filleul', referee?.email, ':', referee?.balance);
  console.log('Parrain', referrer?.email, ':', referrer?.balance);
  
  // Vérifier le referral
  const { data: ref } = await supabase.from('referrals').select('status, rewarded_at').eq('id', 'b834a1f7-f44f-4da8-8704-4f2b66c3b337').single();
  console.log('\n=== REFERRAL ===');
  console.log('Status:', ref?.status);
  console.log('Rewarded at:', ref?.rewarded_at);

  // Vérifier les transactions bonus
  const { data: bonusTx } = await supabase.from('transactions').select('*').eq('type', 'referral_bonus').order('created_at', { ascending: false }).limit(5);
  console.log('\n=== TRANSACTIONS BONUS ===');
  console.log('Total:', bonusTx?.length);
  bonusTx?.forEach(tx => {
    console.log(`  ${tx.user_id.slice(0,8)}... : ${tx.amount} (${tx.status}) - ${tx.description}`);
  });
}

testPayout().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
