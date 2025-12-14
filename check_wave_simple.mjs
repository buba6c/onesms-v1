import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('wave_payment_proofs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌', error.message);
    return;
  }

  console.log(`✅ ${data?.length || 0} preuve(s):`);
  data?.forEach(p => {
    console.log(`\n- ${p.amount} FCFA | ${p.activations} act | ${p.status}`);
    console.log(`  URL: ${p.proof_url?.substring(0, 60)}...`);
  });
}

check();
