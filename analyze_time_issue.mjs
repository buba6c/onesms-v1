import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnqwvkojidholizgvqow.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucXd2a29qaWRob2xpemd2cW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjc5ODQwNywiZXhwIjoyMDQ4Mzc0NDA3fQ.UJCHRN-UgSK0FjB0U2EM1hVMxvIAy8h0qhQJqLGqSgc';
const SMS_API_KEY = '93b8A0d90d8A72f27f5ce65A9d5e60f7';

const supabase = createClient(supabaseUrl, serviceKey);

async function analyze() {
  console.log('🔍 Analyse des incohérences de temps...\n');
  console.log('📅 Date actuelle:', new Date().toISOString());
  console.log('📅 Date locale:', new Date().toLocaleString());
  console.log('');
  
  // Get user
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .ilike('email', '%buba6c%');
  
  if (!users?.length) {
    console.log('❌ User not found');
    return;
  }
  
  const user = users[0];
  console.log('👤 User:', user.email);
  
  // Get rentals
  const { data: rentals } = await supabase
    .from('rentals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`\n📋 ${rentals?.length || 0} locations trouvées\n`);
  
  for (const rental of rentals || []) {
    const rentId = rental.order_id || rental.rent_id || rental.rental_id;
    
    console.log('═'.repeat(70));
    console.log(`📱 Rental: ${rental.phone} (${rental.service_code})`);
    console.log(`   ID DB: ${rental.id}`);
    console.log(`   Status: ${rental.status}`);
    console.log('');
    
    // Dates dans la DB
    console.log('📅 DATES DANS LA DB:');
    console.log(`   created_at: ${rental.created_at}`);
    console.log(`   start_date: ${rental.start_date}`);
    console.log(`   end_date: ${rental.end_date}`);
    console.log(`   expires_at: ${rental.expires_at}`);
    console.log(`   rent_hours: ${rental.rent_hours || rental.duration_hours}`);
    console.log('');
    
    // Calcul du temps restant côté frontend
    const endDate = new Date(rental.end_date || rental.expires_at);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    console.log('⏱️ CALCUL TEMPS RESTANT (comme le frontend):');
    console.log(`   end_date parsed: ${endDate.toISOString()}`);
    console.log(`   now: ${now.toISOString()}`);
    console.log(`   diff (ms): ${diffMs}`);
    console.log(`   diff (seconds): ${diffSeconds}`);
    console.log(`   diff (minutes): ${diffMinutes}`);
    console.log(`   diff (hours): ${diffHours}`);
    console.log(`   diff (days): ${diffDays}`);
    console.log('');
    
    // Format comme le frontend
    if (diffSeconds > 0) {
      const h = Math.floor(diffSeconds / 3600);
      const m = Math.floor((diffSeconds % 3600) / 60);
      console.log(`   Format Dashboard actuel: ${h}h${m.toString().padStart(2, '0')}`);
      
      if (h >= 24) {
        const d = Math.floor(h / 24);
        const hRest = h % 24;
        console.log(`   Format correct (jours): ${d}j ${hRest}h ${m}min`);
      }
    } else {
      console.log(`   ⚠️ EXPIRÉ depuis ${Math.abs(diffMinutes)} minutes`);
    }
    console.log('');
    
    // Vérifier sur SMS-Activate
    if (rentId) {
      console.log(`🔄 VÉRIFICATION SMS-ACTIVATE (ID: ${rentId}):`);
      const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getRentStatus&id=${rentId}`;
      try {
        const res = await fetch(statusUrl);
        const text = await res.text();
        console.log(`   Response: ${text}`);
        
        try {
          const json = JSON.parse(text);
          if (json.status) {
            console.log(`   Status: ${json.status?.status}`);
            if (json.status?.end) {
              const apiEndDate = new Date(json.status.end);
              console.log(`   End date API: ${json.status.end}`);
              console.log(`   End date parsed: ${apiEndDate.toISOString()}`);
              
              const apiDiffMs = apiEndDate.getTime() - now.getTime();
              const apiDiffHours = Math.floor(apiDiffMs / (1000 * 60 * 60));
              const apiDiffDays = Math.floor(apiDiffHours / 24);
              console.log(`   Temps restant API: ${apiDiffDays}j ${apiDiffHours % 24}h`);
              
              // Comparer avec la DB
              if (Math.abs(endDate.getTime() - apiEndDate.getTime()) > 60000) {
                console.log(`   ⚠️ DÉSYNCHRONISATION DÉTECTÉE!`);
                console.log(`      DB: ${endDate.toISOString()}`);
                console.log(`      API: ${apiEndDate.toISOString()}`);
              }
            }
          }
        } catch (e) {
          console.log(`   Non-JSON response`);
        }
      } catch (e) {
        console.log(`   Error: ${e.message}`);
      }
    }
    console.log('');
  }
}

analyze().catch(console.error);
