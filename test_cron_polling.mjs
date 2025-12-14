import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 TEST CRON POLLING SMS\n');

async function triggerCron() {
  const url = `${SUPABASE_URL}/functions/v1/cron-check-pending-sms`;
  
  console.log('📍 URL:', url);
  console.log('🔄 Déclenchement manuel du CRON...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    const text = await response.text();
    
    console.log('📊 Status:', response.status);
    console.log('📝 Response:', text);
    console.log('');
    
    if (response.ok) {
      console.log('✅ CRON exécuté avec succès !');
    } else {
      console.log('❌ Erreur CRON');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

triggerCron();
