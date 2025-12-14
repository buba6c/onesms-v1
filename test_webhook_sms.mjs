import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Simuler un webhook SMS-Activate
async function testWebhook() {
  console.log('🧪 TEST WEBHOOK SMS-ACTIVATE\n');
  
  const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-sms-activate`;
  
  const payload = {
    activationId: '4488735117', // Order ID existant
    service: 'oi',
    text: 'Votre code de vérification est: 123456',
    code: '123456',
    country: 'fr',
    receivedAt: new Date().toISOString()
  };
  
  console.log('📍 URL:', webhookUrl);
  console.log('📦 Payload:', payload);
  console.log('');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': '142.91.156.119' // IP SMS-Activate
      },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    
    console.log('�� Status:', response.status);
    console.log('📝 Response:', text);
    console.log('');
    
    if (response.ok) {
      console.log('✅ Webhook accepté !');
    } else {
      console.log('❌ Webhook refusé');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWebhook();
