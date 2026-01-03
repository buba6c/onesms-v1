
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSMSPool() {
    console.log('🔍 Fetching SMSPool API Key...');
    const { data: setting, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'smspool_api_key')
        .single();

    if (error || !setting?.value) {
        console.error('❌ Failed to get API Key:', error);
        return;
    }

    const apiKey = setting.value;
    const country = 'US'; // USA
    const variants = ['whatsapp', '1012', 'wa']; // Name, ID, Short

    console.log(`🔑 Key found: ${apiKey.substring(0, 5)}...`);
    console.log(`🇺🇸 Testing Country: ${country}`);

    for (const service of variants) {
        console.log(`\n🧪 Testing Service: "${service}"...`);

        const params = new URLSearchParams();
        params.append('key', apiKey);
        params.append('country', country);
        params.append('service', service);

        // POST request
        try {
            const res = await fetch('https://api.smspool.net/purchase/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            const data = await res.json();
            console.log(`📄 Response for "${service}":`, JSON.stringify(data, null, 2));

            if (data.success === 1) {
                console.log('✅ SUCCESS! Cancellling immediately...');
                // Cancel
                const orderId = data.order_id;
                const cancelParams = new URLSearchParams();
                cancelParams.append('key', apiKey);
                cancelParams.append('orderid', orderId);
                await fetch('https://api.smspool.net/api/cancel', { // Check endpoint
                    method: 'POST', // or GET
                    body: cancelParams
                });
                // Actually cancel endpoint is /sms/cancel usually.
                const cRes = await fetch(`https://api.smspool.net/sms/cancel?key=${apiKey}&orderid=${orderId}`);
                console.log('Cancelled:', await cRes.json());
            }

        } catch (e) {
            console.error(`❌ Request failed:`, e.message);
        }
    }
}

testSMSPool();
