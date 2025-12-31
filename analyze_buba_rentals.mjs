import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const SMS_ACTIVATE_API_KEY = '8587A1de38e2A5f5f9d90985Af47f5eb';
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php';

async function analyze() {
  console.log('🔍 ANALYSE DEEP\n');

  const { data: rentals, error } = await supabase
    .from('rentals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log(`Found ${rentals?.length} rentals`);
  
  for (const r of rentals || []) {
    const rentId = r.order_id || r.rent_id || r.rental_id;
    const endDate = new Date(r.end_date);
    const now = new Date();
    const hoursLeft = Math.round((endDate - now) / (1000 * 60 * 60));
    const isExpired = endDate < now;

    console.log(`\n📋 ${r.phone} (${r.service_code})`);
    console.log(`   DB ID: ${r.id}`);
    console.log(`   API ID: ${rentId}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   End: ${r.end_date} (${isExpired ? 'EXPIRÉ' : hoursLeft + 'h restantes'})`);
    console.log(`   User: ${r.user_id}`);

    if (rentId) {
      console.log(`\n   🔄 API Check...`);
      const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentId}`;
      const statusResp = await fetch(statusUrl);
      const statusText = await statusResp.text();
      console.log(`   getRentStatus: ${statusText.substring(0, 150)}`);

      const infoUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentInfo&id=${rentId}&hours=4`;
      const infoResp = await fetch(infoUrl);
      const infoText = await infoResp.text();
      console.log(`   continueRentInfo: ${infoText}`);
    }
  }
}

analyze().catch(console.error);
