import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Vérification des preuves Wave...\n');

  const { data, error } = await supabase
    .from('wave_payment_proofs')
    .select(`
      *,
      user:users!wave_payment_proofs_user_id_fkey (
        id,
        email,
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ ${data.length} preuve(s) trouvée(s):\n`);
    data.forEach((proof, i) => {
      console.log(`${i + 1}. ID: ${proof.id}`);
      console.log(`   User: ${proof.user?.email || 'N/A'}`);
      console.log(`   Montant: ${proof.amount} FCFA`);
      console.log(`   Activations: ${proof.activations}`);
      console.log(`   Status: ${proof.status}`);
      console.log(`   Proof URL: ${proof.proof_url}`);
      console.log(`   Créé le: ${new Date(proof.created_at).toLocaleString('fr-FR')}\n`);
    });
  } else {
    console.log('⚠️  Aucune preuve trouvée');
  }
}

checkData();
