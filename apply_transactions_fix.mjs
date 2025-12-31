import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔧 Application de la correction RLS pour transactions...\n');

// Lire le fichier SQL
const sqlContent = readFileSync('./fix_transactions_rls_urgent.sql', 'utf-8');

// Séparer les commandes SQL (en ignorant les commentaires et SELECT de vérification)
const commands = sqlContent
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => 
    cmd && 
    !cmd.startsWith('--') && 
    !cmd.startsWith('COMMENT') &&
    !cmd.match(/^SELECT.*FROM pg_/)
  );

console.log(`📝 ${commands.length} commandes SQL à exécuter\n`);

let successCount = 0;
let errorCount = 0;

for (const [index, command] of commands.entries()) {
  if (!command) continue;
  
  const preview = command.substring(0, 80).replace(/\n/g, ' ');
  console.log(`\n[${index + 1}/${commands.length}] ${preview}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_raw_sql', {
      sql_query: command + ';'
    });
    
    if (error) {
      // Essayer avec la méthode alternative
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL}`
        },
        body: JSON.stringify({ sql_query: command + ';' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      console.log('  ✅ Exécuté (méthode alternative)');
      successCount++;
    } else {
      console.log('  ✅ Exécuté');
      successCount++;
    }
  } catch (err) {
    console.error(`  ❌ Erreur: ${err.message}`);
    errorCount++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Succès: ${successCount}`);
console.log(`❌ Erreurs: ${errorCount}`);
console.log(`${'='.repeat(60)}\n`);

// Vérifier les policies finales
console.log('🔍 Vérification des policies...\n');

const { data: policies, error: policiesError } = await supabase
  .from('pg_policies')
  .select('*')
  .eq('tablename', 'transactions');

if (policiesError) {
  console.error('❌ Erreur lors de la récupération des policies:', policiesError);
} else {
  console.log(`📋 ${policies?.length || 0} policies trouvées sur transactions:\n`);
  policies?.forEach(p => {
    console.log(`  - ${p.policyname} (${p.cmd}) → ${p.roles}`);
  });
}

process.exit(errorCount > 0 ? 1 : 0);
