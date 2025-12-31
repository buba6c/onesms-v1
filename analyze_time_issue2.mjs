const SMS_API_KEY = '93b8A0d90d8A72f27f5ce65A9d5e60f7';
const RENT_ID = '30918188';

async function analyze() {
  console.log('🔍 Analyse du temps sur SMS-Activate...\n');
  console.log('📅 Date actuelle UTC:', new Date().toISOString());
  console.log('📅 Date locale:', new Date().toLocaleString());
  console.log('');
  
  // Get rent status from SMS-Activate
  const statusUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_API_KEY}&action=getRentStatus&id=${RENT_ID}`;
  const res = await fetch(statusUrl);
  const text = await res.text();
  
  console.log('🔄 SMS-ACTIVATE Response:');
  console.log(text);
  console.log('');
  
  try {
    const json = JSON.parse(text);
    if (json.status) {
      console.log('📊 Parsed Status:');
      console.log(`   status: ${json.status.status}`);
      console.log(`   phone: ${json.status.phone}`);
      console.log(`   start: ${json.status.start}`);
      console.log(`   end: ${json.status.end}`);
      
      if (json.status.end) {
        // Parse the end date
        const endStr = json.status.end;
        const apiEndDate = new Date(endStr);
        const now = new Date();
        
        console.log('\n⏱️ CALCUL TEMPS RESTANT:');
        console.log(`   end_date string: "${endStr}"`);
        console.log(`   end_date parsed: ${apiEndDate.toISOString()}`);
        console.log(`   end_date getTime(): ${apiEndDate.getTime()}`);
        console.log(`   now getTime(): ${now.getTime()}`);
        
        const diffMs = apiEndDate.getTime() - now.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffHours = Math.floor(diffSeconds / 3600);
        const diffDays = Math.floor(diffHours / 24);
        
        console.log(`\n   Différence:`);
        console.log(`   - ms: ${diffMs}`);
        console.log(`   - seconds: ${diffSeconds}`);
        console.log(`   - hours: ${diffHours}`);
        console.log(`   - days: ${diffDays}`);
        
        // Format
        const d = Math.floor(diffHours / 24);
        const h = diffHours % 24;
        const m = Math.floor((diffSeconds % 3600) / 60);
        console.log(`\n   Format correct: ${d}j ${h}h ${m}min`);
        console.log(`   Format heures seules: ${diffHours}h${m.toString().padStart(2, '0')}`);
      }
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

analyze().catch(console.error);
