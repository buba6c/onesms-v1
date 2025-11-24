const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
);

async function checkActivation() {
  console.log('🔍 Recherche du numéro +44 7429215087...\n');
  
  const { data, error } = await supabase
    .from('activations')
    .select('*')
    .ilike('phone_number', '%7429215087%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Aucune activation trouvée pour ce numéro');
    return;
  }

  console.log(`✅ Trouvé ${data.length} activation(s):\n`);
  
  data.forEach((act, index) => {
    console.log(`📱 Activation #${index + 1}:`);
    console.log(`   Order ID: ${act.order_id}`);
    console.log(`   Phone: ${act.phone_number}`);
    console.log(`   Status: ${act.status}`);
    console.log(`   SMS Code: ${act.sms_code || 'Aucun'}`);
    console.log(`   SMS Text: ${act.sms_text || 'Aucun'}`);
    console.log(`   Created: ${act.created_at}`);
    console.log(`   Expires: ${act.expires_at}`);
    console.log(`   SMS Received At: ${act.sms_received_at || 'Jamais'}`);
    console.log('');
  });
}

checkActivation();
