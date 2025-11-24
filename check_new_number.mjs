#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNumber() {
  console.log('🔍 Recherche du numéro +447455944076...\n');
  
  const { data, error } = await supabase
    .from('activations')
    .select('*')
    .ilike('phone', '%7455944076%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Aucune activation trouvée pour ce numéro');
    console.log('\n📊 Vérification des dernières activations:');
    
    const { data: recent } = await supabase
      .from('activations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recent && recent.length > 0) {
      console.log(`\nℹ️  ${recent.length} dernière(s) activation(s):`);
      recent.forEach((act, i) => {
        console.log(`\n${i+1}. Phone: ${act.phone}`);
        console.log(`   Order ID: ${act.order_id}`);
        console.log(`   Status: ${act.status}`);
        console.log(`   Charged: ${act.charged || false}`);
        console.log(`   Created: ${act.created_at}`);
      });
    }
    return;
  }

  console.log(`✅ Trouvé ${data.length} activation(s):\n`);
  
  data.forEach((act, index) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📱 Activation #${index + 1}:`);
    console.log(`   ID: ${act.id}`);
    console.log(`   Order ID: ${act.order_id}`);
    console.log(`   Phone: ${act.phone}`);
    console.log(`   Service: ${act.service_code}`);
    console.log(`   Country: ${act.country_code}`);
    console.log(`   Operator: ${act.operator}`);
    console.log(`   Status: ${act.status}`);
    console.log(`   Charged: ${act.charged || false}`);
    console.log(`   Price: ${act.price} XOF`);
    console.log(`   SMS Code: ${act.sms_code || 'N/A'}`);
    console.log(`   SMS Text: ${act.sms_text || 'N/A'}`);
    console.log(`   SMS Received At: ${act.sms_received_at || 'N/A'}`);
    console.log(`   Created: ${act.created_at}`);
    console.log(`   Expires: ${act.expires_at}`);
    console.log(`   Cancelled: ${act.cancelled_at || 'N/A'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}

checkNumber().catch(console.error);
