import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Ajout de la colonne external_id à transactions...\n');

const migration = `
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_id TEXT;
  CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(external_id);
`;

try {
  // Exécuter la migration
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: migration });
  
  if (error) {
    console.error('❌ Erreur:', error.message);
    
    // Si la fonction exec_sql n'existe pas, essayons directement
    console.log('\n🔄 Tentative via REST API...');
    const { data: result, error: directError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (!directError) {
      console.log('✅ La table transactions est accessible');
      console.log('\n⚠️  Appliquons la migration manuellement via SQL Editor de Supabase Dashboard:');
      console.log('\n' + migration);
    }
  } else {
    console.log('✅ Migration appliquée avec succès!');
  }
  
  // Vérifier que la colonne existe
  console.log('\n📊 Vérification de la structure de transactions...');
  const { data: check, error: checkError } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);
  
  if (!checkError && check && check[0]) {
    console.log('Colonnes disponibles:', Object.keys(check[0]));
    if ('external_id' in check[0]) {
      console.log('✅ external_id est bien présent!');
    } else {
      console.log('⚠️  external_id n\'est pas encore visible, il faut l\'ajouter manuellement');
    }
  }
  
} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.log('\n📝 Exécutez ce SQL manuellement dans Supabase Dashboard > SQL Editor:');
  console.log(migration);
}
