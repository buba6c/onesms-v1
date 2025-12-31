import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function findResendKey() {
  console.log('🔍 CHERCHE LA CLÉ RESEND_API_KEY DANS SUPABASE\n');
  console.log('='.repeat(60));
  
  // 1. Chercher dans app_settings
  console.log('\n1️⃣ Vérifier app_settings...');
  const { data: appSettings, error: e1 } = await supabase
    .from('app_settings')
    .select('*');
  
  if (!e1) {
    console.log('✅ Table trouvée:');
    appSettings?.forEach(s => console.log(`  - ${s.key}: ${s.value?.substring(0, 20)}...`));
  } else {
    console.log('❌ Table app_settings:', e1.message);
  }
  
  // 2. Chercher dans configuration
  console.log('\n2️⃣ Vérifier configuration...');
  const { data: config, error: e2 } = await supabase
    .from('configuration')
    .select('*');
  
  if (!e2) {
    console.log('✅ Table trouvée');
  } else {
    console.log('❌ Table configuration:', e2.message);
  }
  
  // 3. Chercher toutes les tables
  console.log('\n3️⃣ Lister TOUTES les tables de la base...');
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public');
  
  if (tables) {
    console.log('Tables publiques:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
  }
  
  // 4. Chercher une table avec "secret", "env", "config"
  console.log('\n4️⃣ Chercher tables avec secret/config/env...');
  if (tables) {
    const relevant = tables.filter(t => 
      t.table_name?.includes('secret') || 
      t.table_name?.includes('config') || 
      t.table_name?.includes('env') ||
      t.table_name?.includes('setting')
    );
    
    if (relevant.length > 0) {
      console.log('Tables pertinentes trouvées:');
      for (const table of relevant) {
        console.log(`\n  📋 Table: ${table.table_name}`);
        const { data } = await supabase
          .from(table.table_name)
          .select('*')
          .limit(5);
        if (data) {
          console.log(`     Contenu: ${JSON.stringify(data[0], null, 2).substring(0, 100)}...`);
        }
      }
    } else {
      console.log('Aucune table config trouvée');
    }
  }
  
  // 5. CLI HINT
  console.log('\n' + '='.repeat(60));
  console.log('💡 POUR RÉCUPÉRER LES SECRETS VIA CLI:\n');
  console.log('  1. Installer Supabase CLI: npm install -g supabase');
  console.log('  2. Authentifier: supabase login');
  console.log('  3. Lister les secrets: supabase secrets list --project-id htfqmamvmhdoixqcbbbw');
  console.log('  4. La clé RESEND_API_KEY y sera listée\n');
  
  console.log('📖 Ou aller directement à:');
  console.log('   https://app.supabase.com/project/htfqmamvmhdoixqcbbbw/settings/secrets\n');
}

findResendKey().catch(console.error);
