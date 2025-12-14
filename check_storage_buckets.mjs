import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
  console.log('🗄️  Vérification des buckets Storage...\n');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (buckets && buckets.length > 0) {
    console.log('Buckets existants:');
    buckets.forEach(bucket => {
      console.log(`  • ${bucket.name} (${bucket.public ? 'Public' : 'Privé'})`);
    });
  } else {
    console.log('⚠️  Aucun bucket trouvé');
  }
}

checkBuckets();
