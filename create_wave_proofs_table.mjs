import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('📋 Création de la table wave_payment_proofs...\n');

  const sql = readFileSync('./supabase/migrations/20251212_create_wave_payment_proofs.sql', 'utf8');
  
  // Exécuter via un simple INSERT pour tester la connexion
  const { data, error } = await supabase
    .from('wave_payment_proofs')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    // Table n'existe pas - doit être créée via SQL Editor
    console.log('⚠️  La table n\'existe pas encore.');
    console.log('\n📝 Copiez le contenu de ce fichier dans le SQL Editor :');
    console.log('   supabase/migrations/20251212_create_wave_payment_proofs.sql\n');
    console.log('🔗 SQL Editor : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new\n');
  } else if (!error) {
    console.log('✅ La table wave_payment_proofs existe déjà !\n');
  } else {
    console.log('❌ Erreur:', error.message);
  }
}

createTable();
