const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

console.log('🔍 Vérification des rentals via API REST...\n');

const response = await fetch(`${SUPABASE_URL}/rest/v1/rentals?order=created_at.desc&limit=3&select=*`, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`
  }
});

const data = await response.json();

if (!Array.isArray(data)) {
  console.error('❌ Erreur:', data);
} else {
  console.log(`✅ ${data.length} rental(s) trouvé(s)\n`);
  data.forEach((rental, i) => {
    console.log(`📞 Rental ${i + 1}:`);
    console.log(`  ID: ${rental.id}`);
    console.log(`  Phone: ${rental.phone || 'MANQUANT'}`);
    console.log(`  Service: ${rental.service_code || 'MANQUANT'}`);
    console.log(`  Country: ${rental.country_code || 'MANQUANT'}`);
    console.log(`  Status: ${rental.status}`);
    console.log(`  User ID: ${rental.user_id}`);
    console.log(`  Rental ID: ${rental.rental_id || rental.rent_id || 'MANQUANT'}`);
    console.log(`  Created: ${rental.created_at}`);
    console.log(`  Expires: ${rental.expires_at || rental.end_date || 'MANQUANT'}`);
    console.log(`  Duration: ${rental.duration_hours || rental.rent_hours || 'MANQUANT'}h`);
    console.log(`  Messages: ${rental.message_count || 0}`);
    console.log(`  Provider: ${rental.provider || 'MANQUANT'}`);
    console.log('');
  });
  
  // Vérifier les colonnes disponibles
  if (data.length > 0) {
    console.log('�� Toutes les colonnes disponibles:');
    console.log(Object.keys(data[0]).join(', '));
  }
}
