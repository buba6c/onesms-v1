import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function analyze() {
  console.log('========================================');
  console.log('   DEEP ANALYSE SYSTÈME DE PARRAINAGE   ');
  console.log('========================================\n');

  // 1. CONFIGURATION
  console.log('=== 1. CONFIGURATION ===');
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .like('key', 'referral%');
  
  const cfg = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
  console.log('Enabled:', cfg.referral_enabled);
  console.log('Bonus parrain:', cfg.referral_bonus_referrer);
  console.log('Bonus filleul:', cfg.referral_bonus_referee);
  console.log('Trigger:', cfg.referral_trigger);
  console.log('Min recharge:', cfg.referral_min_recharge_amount);
  console.log('Link base:', cfg.referral_link_base);

  // 2. TABLE REFERRALS
  console.log('\n=== 2. TABLE REFERRALS ===');
  const { data: referrals, error: refErr } = await supabase.from('referrals').select('*');
  if (refErr) {
    console.log('Erreur:', refErr.message);
  } else {
    console.log('Total referrals:', referrals?.length || 0);
    if (referrals && referrals.length > 0) {
      const byStatus = {};
      referrals.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      console.log('Par statut:', JSON.stringify(byStatus));
      console.log('\nDétails:');
      for (const r of referrals.slice(-10)) {
        // Get referrer email
        const { data: referrer } = await supabase.from('users').select('email').eq('id', r.referrer_id).single();
        const { data: referee } = await supabase.from('users').select('email').eq('id', r.referee_id).single();
        console.log(`  [${r.status}] Parrain: ${referrer?.email || 'N/A'} -> Filleul: ${referee?.email || 'N/A'} (${r.created_at})`);
      }
    }
  }

  // 3. TRANSACTIONS BONUS
  console.log('\n=== 3. TRANSACTIONS BONUS ===');
  const { data: bonusTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'referral_bonus');
  console.log('Total bonus transactions:', bonusTx?.length || 0);
  if (bonusTx && bonusTx.length > 0) {
    for (const tx of bonusTx.slice(-5)) {
      const { data: user } = await supabase.from('users').select('email').eq('id', tx.user_id).single();
      console.log(`  [${tx.status}] ${user?.email || 'N/A'}: ${tx.amount} (${tx.created_at})`);
    }
  }

  // 4. USERS AVEC REFERRAL_CODE
  console.log('\n=== 4. CODES DE PARRAINAGE ===');
  const { data: usersWithCode } = await supabase
    .from('users')
    .select('id, email, referral_code, referred_by')
    .not('referral_code', 'is', null);
  console.log('Users avec code:', usersWithCode?.length || 0);
  
  // Check referred_by column
  const { data: sampleUser } = await supabase.from('users').select('*').limit(1);
  const hasReferredBy = sampleUser && sampleUser[0] && 'referred_by' in sampleUser[0];
  console.log('Colonne referred_by existe:', hasReferredBy);

  if (hasReferredBy) {
    const { data: usersReferred } = await supabase
      .from('users')
      .select('id, email, referred_by')
      .not('referred_by', 'is', null);
    console.log('Users parrainés (referred_by set):', usersReferred?.length || 0);
    if (usersReferred && usersReferred.length > 0) {
      for (const u of usersReferred.slice(-5)) {
        console.log(`  ${u.email} parrainé par code: ${u.referred_by}`);
      }
    }
  }

  // 5. VÉRIFIER EDGE FUNCTIONS
  console.log('\n=== 5. EDGE FUNCTIONS ===');
  const functionsDir = './supabase/functions';
  const fs = await import('fs');
  if (fs.existsSync(functionsDir)) {
    const dirs = fs.readdirSync(functionsDir);
    const referralFuncs = dirs.filter(d => d.includes('referral'));
    console.log('Functions parrainage:', referralFuncs.join(', ') || 'Aucune');
  } else {
    console.log('Dossier supabase/functions non trouvé');
  }

  // 6. VÉRIFIER LE FLOW
  console.log('\n=== 6. ANALYSE DU FLOW ===');
  
  // Check authStore for referral handling
  const authStorePath = './src/stores/authStore.ts';
  if (fs.existsSync(authStorePath)) {
    const content = fs.readFileSync(authStorePath, 'utf-8');
    const hasApplyReferral = content.includes('apply-referral-code') || content.includes('referral_code');
    console.log('AuthStore gère le referral:', hasApplyReferral);
  }

  // Check register page
  const registerPath = './src/pages/RegisterPage.tsx';
  if (fs.existsSync(registerPath)) {
    const content = fs.readFileSync(registerPath, 'utf-8');
    const hasRefParam = content.includes('ref=') || content.includes('referral');
    console.log('RegisterPage gère ?ref=:', hasRefParam);
  }

  console.log('\n=== 7. PROBLÈMES POTENTIELS ===');
  
  // Check if trigger exists
  if (cfg.referral_trigger === 'first_recharge') {
    console.log('⚠️  Trigger: first_recharge - besoin webhook/trigger sur transactions');
  }
  
  if (referrals && referrals.length > 0) {
    const pending = referrals.filter(r => r.status === 'pending');
    if (pending.length > 0) {
      console.log(`⚠️  ${pending.length} referrals en pending - vérifier si le trigger fonctionne`);
    }
  }

  if (!bonusTx || bonusTx.length === 0) {
    console.log('⚠️  Aucune transaction bonus - le système n\'a jamais distribué de bonus');
  }

  console.log('\n=== FIN ANALYSE ===');
}

analyze().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
