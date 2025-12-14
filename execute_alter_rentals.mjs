import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzI1Njc2MiwiZXhwIjoyMDQ4ODMyNzYyfQ.gWdXq5h3xNRsP0ViZRlVsEbmM6yx_QRNYR9vqfJ5LgI';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📋 Exécution ALTER TABLE rentals...\n');

const sql = fs.readFileSync('./ALTER_RENTALS_ADD_COLUMNS.sql', 'utf8');

// Exécuter le SQL
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Erreur:', error);
  
  // Si la fonction exec_sql n'existe pas, créons-la
  console.log('\n📝 Création de la fonction exec_sql...');
  
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN json_build_object('success', true);
    END;
    $$;
  `;
  
  const { error: funcError } = await supabase.rpc('exec_sql', { sql_query: createFunctionSql });
  
  if (funcError) {
    console.log('\n⚠️ Impossible de créer la fonction. Veuillez exécuter manuellement:');
    console.log('\n📂 Allez sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor');
    console.log('📂 SQL Editor > New query');
    console.log('📂 Copiez le contenu de ALTER_RENTALS_ADD_COLUMNS.sql');
    console.log('📂 Cliquez sur Run');
  }
} else {
  console.log('✅ ALTER TABLE exécuté avec succès!');
  console.log('📊 Résultat:', data);
  
  // Vérifier les colonnes
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'rentals')
    .eq('table_schema', 'public');
  
  console.log('\n📋 Colonnes de la table rentals:');
  columns?.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });
}
