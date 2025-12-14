import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTUxMTM3NiwiZXhwIjoyMDQ1MDg3Mzc2fQ.hdzf8XKPHvBN1yF0TQngxp79lABp0JBb_C-2tpAiLzI'
);

async function check() {
  // Vérifier les rentals actifs
  const { data: rentals } = await supabase
    .from('rentals')
    .select('id, country_code, service_code, phone, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('=== Rentals actifs ===');
  if (!rentals || rentals.length === 0) {
    console.log('Aucun rental actif');
  } else {
    rentals.forEach(r => {
      console.log(`Phone: ${r.phone}`);
      console.log(`  country_code: "${r.country_code}" (type: ${typeof r.country_code})`);
      console.log(`  service: ${r.service_code}`);
    });
  }

  // Vérifier TOUS les rentals récents
  const { data: allRentals } = await supabase
    .from('rentals')
    .select('id, country_code, service_code, phone, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('\n=== 10 derniers rentals (tous statuts) ===');
  allRentals?.forEach(r => {
    console.log(`${r.status} | country_code: "${r.country_code}" | ${r.service_code} | ${r.phone?.substring(0,10)}...`);
  });
}

check();
