import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTUxMTM3NiwiZXhwIjoyMDQ1MDg3Mzc2fQ.hdzf8XKPHvBN1yF0TQngxp79lABp0JBb_C-2tpAiLzI'
);

async function check() {
  // Vérifier TOUTES les activations récentes (pas seulement d'un user)
  const { data: activations } = await supabase
    .from('activations')
    .select('id, country_code, service_code, phone, user_id')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log('🔍 20 dernières activations - country_code:');
  if (!activations || activations.length === 0) {
    console.log('  Aucune activation dans la DB');
  } else {
    activations.forEach(a => {
      console.log(`  - country_code: "${a.country_code}" | service: ${a.service_code} | phone: ${a.phone?.substring(0, 8)}...`);
    });
  }
  
  // Vérifier TOUS les rentals récents
  const { data: rentals } = await supabase
    .from('rentals')
    .select('id, country_code, service_code, phone, user_id')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log('\n🔍 20 derniers rentals - country_code:');
  if (!rentals || rentals.length === 0) {
    console.log('  Aucun rental dans la DB');
  } else {
    rentals.forEach(r => {
      console.log(`  - country_code: "${r.country_code}" | service: ${r.service_code} | phone: ${r.phone?.substring(0, 8)}...`);
    });
  }
  
  // Vérifier les countries dans la table countries
  const { data: countries } = await supabase
    .from('countries')
    .select('id, code, name')
    .limit(10);
    
  console.log('\n🔍 Exemples de countries dans la table:');
  countries?.forEach(c => {
    console.log(`  - id: ${c.id} | code: "${c.code}" | name: "${c.name}"`);
  });
}

check();
