import { createClient } from '@supabase/supabase-js';

// Use direct supabase URL
const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzM5NzY5NywiZXhwIjoyMDYyOTczNjk3fQ.m5gMeLLNyEfJIrSKJwBrMXbznzeVbgbm3i-VnP-QHXE';

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log('🔍 Vérification des temps dans la DB...\n');
  console.log('📅 Now UTC:', new Date().toISOString());
  console.log('');
  
  // Get recent rentals
  const { data: rentals, error } = await supabase
    .from('rentals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log(`📋 ${rentals?.length || 0} locations récentes\n`);
  
  for (const r of rentals || []) {
    console.log('═'.repeat(60));
    console.log(`📱 ${r.phone} (${r.service_code})`);
    console.log(`   Status: ${r.status}`);
    console.log(`   end_date: ${r.end_date}`);
    console.log(`   expires_at: ${r.expires_at}`);
    console.log(`   rent_hours: ${r.rent_hours}`);
    
    // Calculate
    const endDate = new Date(r.end_date || r.expires_at);
    const now = new Date();
    const diffMs = endDate - now;
    const diffSeconds = Math.floor(diffMs / 1000);
    const totalHours = Math.floor(diffSeconds / 3600);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const mins = Math.floor((diffSeconds % 3600) / 60);
    
    console.log(`\n   ⏱️ Temps restant:`);
    console.log(`   Total seconds: ${diffSeconds}`);
    console.log(`   Total hours: ${totalHours}`);
    
    if (diffSeconds > 0) {
      if (days > 0) {
        console.log(`   Format: ${days}j ${hours}h ${mins}min`);
      } else {
        console.log(`   Format: ${hours}h ${mins}min`);
      }
    } else {
      console.log(`   ❌ EXPIRÉ`);
    }
    console.log('');
  }
}

check().catch(console.error);
