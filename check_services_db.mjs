import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTk0NjMsImV4cCI6MjA2MDQ3NTQ2M30.m4jrSPj9rvjEKMls4mIzQghXdpDuT1sVXd1bVXlK9mI';

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
    .limit(10);
  
  services?.forEach(s => {
    console.log(`   - code: "${s.code}" | name: "${s.name}"`);
  });
}

check();
