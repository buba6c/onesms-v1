import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
// Clé depuis .env
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('🔍 Vérification services dans la DB\n');
  
  // Chercher WhatsApp par exemple
  const testCodes = ['wa', 'whatsapp', 'tg', 'telegram', 'go', 'google', 'ig', 'instagram'];
  
  for (const code of testCodes) {
    const { data, error } = await supabase
      .from('services')
      .select('id, code, name')
      .eq('code', code)
      .maybeSingle();
    
    if (error) {
      console.log(`❌ Erreur pour "${code}":`, error.message);
    } else if (data) {
      console.log(`✅ "${code}" trouvé: ID=${data.id}, Name=${data.name}`);
    } else {
      console.log(`⚠️ "${code}" NON TROUVÉ dans la DB`);
    }
  }
  
  // Lister quelques services existants
  console.log('\n📋 Premiers services dans la DB:');
  const { data: services } = await supabase
    .from('services')
    .select('code, name')
    .limit(15);
  
  services?.forEach(s => {
    console.log(`   - code: "${s.code}" | name: "${s.name}"`);
  });
}

check();
