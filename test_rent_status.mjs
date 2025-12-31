import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnqwvkojidholizgvqow.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucXd2a29qaWRob2xpemd2cW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjc5ODQwNywiZXhwIjoyMDQ4Mzc0NDA3fQ.UJCHRN-UgSK0FjB0U2EM1hVMxvIAy8h0qhQJqLGqSgc';
const SMS_API_KEY = '93b8A0d90d8A72f27f5ce65A9d5e60f7';

const supabase = createClient(supabaseUrl, serviceKey);

async function testRentStatus() {
  console.log('🔍 Test direct des locations de buba6c@gmail.com...\n');
  
  // 1. Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'buba6c@gmail.com')
    .single();
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  // 2. Get active rentals
  const { data: rentals } = await supabase
    .from('rentals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`📋 ${rentals?.length || 0} locations trouvées\n`);
  
  for (const rental of rentals || []) {
    const rentId = rental.order_id || rental.rent_id || rental.rental_id;
    console.log(`\n📱 Location ID: ${rental.id}`);
    console.log(`   Status DB: ${rental.status}`);
    console.log(`   order_id: ${rental.order_id}`);
    console.log(`   rent_id: ${rental.rent_id}`);
    console.log(`   rental_id: ${rental.rental_id}`);
    console.log(`   Phone: ${rental.phone}`);
    console.log(`   End: ${rental.end_date}`);
    
    if (!rentId) {
      console.log('   ⚠️ Pas de SMS-Activate ID trouvé');
      continue;
    }
    
    // Test getRentStatus
    console.log(`\n   🔄 Test getRentStatus (ID: ${rentId}):`);
    const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getRentStatus&id=${rentId}`;
    const statusRes = await fetch(statusUrl);
    const statusText = await statusRes.text();
    console.log(`   Response: ${statusText}`);
    
    // Test continueRentInfo
    console.log(`\n   💰 Test continueRentInfo (4h):`);
    const infoUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=continueRentInfo&id=${rentId}&hours=4`;
    const infoRes = await fetch(infoUrl);
    const infoText = await infoRes.text();
    console.log(`   Response: ${infoText}`);
    
    console.log('\n' + '─'.repeat(60));
  }
}

testRentStatus().catch(console.error);
