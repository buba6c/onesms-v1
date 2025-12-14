import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://rwgohcsdtfrapsbxkavr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z29oY3NkdGZyYXBzYnhrYXZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTUzMTAwMiwiZXhwIjoyMDQ3MTA3MDAyfQ.kpJP0nKjp8y04njO8aR1dIe2JpyRGVzYPGj4dH9xS3g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = fs.readFileSync('deep_wallet_analysis.sql', 'utf8');

// Split par sections pour exécuter séparément
const sections = sql.split(/SELECT '===.*?===' as section;/).filter(s => s.trim());

console.log('📊 EXÉCUTION ANALYSE PROFONDE WALLET...\n');

for (let i = 0; i < sections.length; i++) {
  const section = sections[i].trim();
  if (!section) continue;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: section });
    
    if (error) {
      console.log(`❌ Erreur section ${i + 1}:`, error.message);
      continue;
    }
    
    if (data && data.length > 0) {
      console.log(`\n=== SECTION ${i + 1} ===`);
      console.table(data);
    }
  } catch (err) {
    console.log(`⚠️ Erreur catch section ${i + 1}:`, err.message);
  }
}

console.log('\n✅ Analyse terminée');
