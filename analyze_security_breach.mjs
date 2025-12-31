import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function analyzeSecurityBreach() {
  console.log('🔍 ANALYSE FAILLE SÉCURITÉ - ududuzin@proton.me\n');
  console.log('='.repeat(70));
  
  // 1. Vérifier l'historique admin@onesms.com
  console.log('\n=== 1. HISTORIQUE admin@onesms.com ===');
  const { data: adminUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@onesms.com')
    .single();
  console.log('Role actuel:', adminUser?.role);
  console.log('Updated at:', adminUser?.updated_at);
  
  // 2. Chercher tous les credit_admin dans les dernières 48h
  console.log('\n=== 2. TOUS LES CRÉDITS ADMIN (48h) ===');
  const twoDaysAgo = new Date(Date.now() - 48*60*60*1000).toISOString();
  const { data: adminCredits } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('operation_type', 'credit_admin')
    .gte('created_at', twoDaysAgo)
    .order('created_at', { ascending: false });
  
  if (adminCredits && adminCredits.length > 0) {
    for (const c of adminCredits) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', c.user_id)
        .single();
      console.log('User:', user?.email);
      console.log('Amount:', c.amount);
      console.log('Date:', c.created_at);
      console.log('Reason:', c.reason);
      console.log('---');
    }
  } else {
    console.log('Aucun crédit admin trouvé');
  }
  
  // 3. Vérifier ududuzin
  console.log('\n=== 3. USER ududuzin@proton.me ===');
  const { data: ududUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'ududuzin@proton.me')
    .single();
  console.log('ID:', ududUser?.id);
  console.log('Role actuel:', ududUser?.role);
  console.log('Balance:', ududUser?.balance);
  console.log('Created:', ududUser?.created_at);
  console.log('Updated:', ududUser?.updated_at);
  
  // 4. Auth info pour ududuzin
  console.log('\n=== 4. AUTH INFO ===');
  const { data: authData } = await supabase.auth.admin.getUserById(ududUser.id);
  if (authData?.user) {
    console.log('Email:', authData.user.email);
    console.log('Created:', authData.user.created_at);
    console.log('Last sign in:', authData.user.last_sign_in_at);
    console.log('Provider:', authData.user.app_metadata?.provider);
    console.log('Providers:', authData.user.app_metadata?.providers);
    console.log('User metadata:', JSON.stringify(authData.user.user_metadata));
  }
  
  // 5. Toutes les transactions credit
  console.log('\n=== 5. TRANSACTIONS TYPE CREDIT (48h) ===');
  const { data: creditTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'credit')
    .gte('created_at', twoDaysAgo)
    .order('created_at', { ascending: false });
  
  if (creditTxs && creditTxs.length > 0) {
    for (const tx of creditTxs) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', tx.user_id)
        .single();
      console.log('User:', user?.email);
      console.log('Amount:', tx.amount);
      console.log('Date:', tx.created_at);
      console.log('Method:', tx.payment_method);
      console.log('Meta:', JSON.stringify(tx.metadata));
      console.log('---');
    }
  }
  
  // 6. Chercher si admin@onesms.com a des opérations suspectes
  console.log('\n=== 6. OPÉRATIONS admin@onesms.com (48h) ===');
  const { data: adminOps } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', adminUser?.id)
    .gte('created_at', twoDaysAgo)
    .order('created_at', { ascending: false });
  
  if (adminOps && adminOps.length > 0) {
    adminOps.forEach(op => {
      console.log(op.created_at, '|', op.operation_type, '|', op.amount, '|', op.reason);
    });
  } else {
    console.log('Aucune opération');
  }
  
  // 7. Vérifier les RLS policies
  console.log('\n=== 7. ANALYSE DES VECTEURS D\'ATTAQUE ===');
  console.log('');
  console.log('SCÉNARIOS POSSIBLES:');
  console.log('1. 🔴 IDOR (Insecure Direct Object Reference)');
  console.log('   - Appel direct à l\'Edge Function admin-add-credit sans vérification');
  console.log('');
  console.log('2. 🔴 Manipulation du rôle client-side');
  console.log('   - Le frontend passe le rôle dans la requête au lieu de le vérifier côté serveur');
  console.log('');
  console.log('3. 🔴 JWT manipulation');
  console.log('   - Modification du JWT pour inclure role=admin');
  console.log('');
  console.log('4. 🔴 RPC function sans vérification');
  console.log('   - Fonction SQL appelable directement qui ne vérifie pas le rôle');
  console.log('');
  console.log('5. 🔴 RLS bypass');
  console.log('   - Policy trop permissive sur la table users permettant UPDATE du rôle');
}

analyzeSecurityBreach().catch(console.error);
