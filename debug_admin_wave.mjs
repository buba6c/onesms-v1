import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log('🔍 Debug Admin Wave Payments\n');

  // 1. Vérifier les preuves
  const { data: proofs, error: proofsError } = await supabase
    .from('wave_payment_proofs')
    .select('*')
    .order('created_at', { ascending: false });

  if (proofsError) {
    console.error('❌ Erreur preuves:', proofsError.message);
    return;
  }

  console.log(`✅ ${proofs?.length || 0} preuve(s) trouvée(s)\n`);

  if (proofs && proofs.length > 0) {
    // 2. Récupérer les users
    const userIds = [...new Set(proofs.map(p => p.user_id))];
    console.log('User IDs:', userIds);

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', userIds);

    if (usersError) {
      console.error('❌ Erreur users:', usersError.message);
    } else {
      console.log(`✅ ${users?.length || 0} utilisateur(s) trouvé(s)\n`);
      
      // 3. Afficher le résultat joint
      proofs.forEach((proof, i) => {
        const user = users?.find(u => u.id === proof.user_id);
        console.log(`${i + 1}. Preuve ${proof.id.substring(0, 8)}...`);
        console.log(`   User: ${user?.email || 'NON TROUVÉ'} (${user?.name || 'N/A'})`);
        console.log(`   Montant: ${proof.amount} FCFA`);
        console.log(`   Activations: ${proof.activations}`);
        console.log(`   Status: ${proof.status}`);
        console.log(`   Image: ${proof.proof_url ? 'OUI' : 'NON'}`);
        console.log('');
      });
    }
  }
}

debug();
