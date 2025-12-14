import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.ysKIyDfRNPkx2JCOuuTUaJOBYANE6_E35VYW6vLwOPk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PHONE_TO_FIND = '6283152070987';

console.log('🔍 Recherche rental avec phone:', PHONE_TO_FIND);

// Chercher le rental avec ce numéro
const { data: rentals, error } = await supabase
  .from('rentals')
  .select('*')
  .or(`phone.like.%${PHONE_TO_FIND}%,phone.eq.${PHONE_TO_FIND},phone.eq.+${PHONE_TO_FIND}`);
  
if (error) {
  console.log('Erreur:', error.message);
} else if (rentals.length === 0) {
  console.log('Aucun rental trouvé avec ce numéro');
  
  // Lister tous les rentals récents
  const { data: allRentals } = await supabase
    .from('rentals')
    .select('id, phone, order_id, rent_id, rental_id, status, message_count, sms_count, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\n=== 10 DERNIERS RENTALS ===');
  allRentals?.forEach(r => {
    console.log(`Phone: ${r.phone}, ID: ${r.order_id || r.rent_id || r.rental_id}, Status: ${r.status}, Messages: ${r.message_count || r.sms_count || 0}`);
  });
} else {
  const rental = rentals[0];
  console.log('\n=== RENTAL INFO ===');
  console.log('ID Supabase:', rental.id);
  console.log('order_id:', rental.order_id);
  console.log('rent_id:', rental.rent_id);
  console.log('rental_id:', rental.rental_id);
  console.log('Phone:', rental.phone);
  console.log('Status:', rental.status);
  console.log('Message count:', rental.message_count);
  console.log('SMS count:', rental.sms_count);
  console.log('Expires at:', rental.expires_at || rental.end_date);
  console.log('Service:', rental.service_code);
  console.log('Created:', rental.created_at);
  
  // Vérifier quel ID est utilisé pour get-rent-status
  const smsActivateId = rental.order_id || rental.rent_id || rental.rental_id;
  console.log('\n=== SMS-ACTIVATE ID USED ===');
  console.log('ID for API:', smsActivateId);
  
  // Tester l'API SMS-Activate directement
  const SMS_ACTIVATE_API_KEY = '6510A3188b5A48e2AbAo8e721o6d15bd';
  const apiUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${smsActivateId}`;
  
  console.log('\n🌐 Appel API SMS-Activate getRentStatus...');
  console.log('URL:', apiUrl.replace(SMS_ACTIVATE_API_KEY, 'KEY_HIDDEN'));
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    console.log('\n📨 Réponse API:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.status === 'success' && data.values) {
      const messages = Object.values(data.values);
      console.log('\n=== MESSAGES ===');
      console.log('Nombre de messages:', data.quantity);
      messages.forEach((msg, i) => {
        console.log(`\nMessage ${i + 1}:`);
        console.log('  From:', msg.phoneFrom);
        console.log('  Text:', msg.text);
        console.log('  Date:', msg.date);
      });
    }
  } catch (e) {
    console.log('Erreur API:', e.message);
  }
}
