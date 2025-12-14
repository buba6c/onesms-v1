import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4NjQxOTgsImV4cCI6MjA0ODQ0MDE5OH0.s75aut4dqzAP48umt_A1c-z8i4aiN7L7c4mIBZ6JQco';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

console.log('🔍 Vérification structure table activations...\n');

const { data, error } = await sb
  .from('activations')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Erreur:', error.message);
} else if (data && data.length > 0) {
  console.log('📋 Colonnes disponibles:');
  Object.keys(data[0]).forEach(col => {
    console.log(`   - ${col}: ${typeof data[0][col]} = ${data[0][col]}`);
  });
} else {
  console.log('⚠️  Aucune activation trouvée');
}
