import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac'
);

console.log('🔍 Vérification des rentals...\n');

const { data, error } = await supabase
  .from('rentals')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(3);

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log(`✅ ${data.length} rental(s) trouvé(s)\n`);
  data.forEach((rental, i) => {
    console.log(`📞 Rental ${i + 1}:`);
    console.log(`  ID: ${rental.id}`);
    console.log(`  Phone: ${rental.phone || 'MANQUANT'}`);
    console.log(`  Service: ${rental.service_code || 'MANQUANT'}`);
    console.log(`  Country: ${rental.country_code || 'MANQUANT'}`);
    console.log(`  Status: ${rental.status}`);
    console.log(`  Rental ID: ${rental.rental_id || rental.rent_id || 'MANQUANT'}`);
    console.log(`  Created: ${rental.created_at}`);
    console.log(`  Expires: ${rental.expires_at || rental.end_date || 'MANQUANT'}`);
    console.log(`  Duration: ${rental.duration_hours || rental.rent_hours || 'MANQUANT'}h`);
    console.log(`  Messages: ${rental.message_count || 0}`);
    console.log('');
  });
}
