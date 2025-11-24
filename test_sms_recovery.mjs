// Tester la récupération du SMS via l'Edge Function check-5sim-sms

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg';

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

// Liste des numéros à tester
const phoneNumbers = [
  { phone: '+447455944076', orderId: 'unknown' },
  { phone: '+447429215087', orderId: 'unknown' }
];

console.log('🔍 Test de récupération des SMS via check-5sim-sms Edge Function\n');

for (const { phone, orderId } of phoneNumbers) {
  console.log(`📱 Test pour ${phone}...`);
  
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
        activationId: null, // On n'a pas l'ID de l'activation
        orderId: orderId === 'unknown' ? null : orderId
      })
    });

    const status = response.status;
    const data = await response.json();

    console.log(`  Status: ${status}`);
    console.log(`  Réponse:`, JSON.stringify(data, null, 2));

    if (data.sms) {
      console.log(`  ✅ SMS trouvé !`);
      console.log(`  Code: ${data.sms.code}`);
      console.log(`  Texte: ${data.sms.text}`);
    } else {
      console.log(`  ⏳ Pas encore de SMS`);
    }

  } catch (error) {
    console.log(`  ❌ Erreur: ${error.message}`);
  }
  
  console.log('');
}

// Vérifier si l'utilisateur a des activations dans la DB maintenant
console.log('📊 Vérification des activations en DB...\n');

try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/activations?user_id=eq.${USER_ID}&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const activations = await response.json();

  if (activations.length === 0) {
    console.log('⚠️ Aucune activation en DB');
    console.log('');
    console.log('💡 L\'utilisateur voit le numéro sur le dashboard mais il n\'est PAS en DB.');
    console.log('   Cela signifie que le numéro est uniquement dans le state React local.');
    console.log('   Après un refresh (F5), le numéro devrait disparaître.');
    console.log('');
    console.log('📋 Actions à faire:');
    console.log('   1. Demander à l\'utilisateur de faire F5 pour refresh');
    console.log('   2. Acheter un NOUVEAU numéro pour tester si les permissions sont OK');
    console.log('   3. Vérifier immédiatement si le nouveau numéro apparaît en DB');
  } else {
    console.log(`✅ ${activations.length} activation(s) trouvée(s):`);
    activations.forEach(act => {
      console.log(`  - ${act.phone} (${act.service_code}) - Status: ${act.status}`);
      if (act.sms_code) {
        console.log(`    📨 Code SMS: ${act.sms_code}`);
      }
    });
  }

} catch (error) {
  console.log(`❌ Erreur: ${error.message}`);
}
