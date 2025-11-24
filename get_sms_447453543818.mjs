// Récupérer le SMS pour l'activation +447453543818

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
const ACTIVATION_ID = '2b975076-b419-4e17-a5a8-18b50458224f'; // ID de l'activation
const ORDER_ID = '911037873'; // ID de la commande 5sim

console.log('📨 Récupération du SMS pour +447453543818...\n');

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/check-5sim-sms`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: USER_ID,
      activationId: ACTIVATION_ID,
      orderId: ORDER_ID
    })
  });

  const status = response.status;
  const data = await response.json();

  console.log(`Status: ${status}`);
  console.log(`Réponse:`, JSON.stringify(data, null, 2));

  if (data.success && data.sms) {
    console.log('\n✅ SMS RÉCUPÉRÉ !');
    console.log('━'.repeat(60));
    console.log(`📱 Téléphone: ${data.phone || '+447453543818'}`);
    console.log(`🔢 Code SMS: ${data.sms.code}`);
    console.log(`📝 Texte: ${data.sms.text}`);
    console.log(`⏰ Reçu le: ${data.sms.created_at}`);
    console.log('━'.repeat(60));
  } else if (data.error) {
    console.log(`\n❌ Erreur: ${data.error}`);
  } else {
    console.log('\n⏳ Pas encore de SMS reçu');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
}
