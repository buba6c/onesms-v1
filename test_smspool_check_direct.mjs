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

async function testSMSPoolCheck() {
    console.log('🔍 Fetching SMSPool API Key...');
    const { data: setting, error: settingError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'smspool_api_key')
        .single();

    if (settingError || !setting?.value) {
        console.error('❌ Failed to get API Key:', settingError);
        return;
    }

    const apiKey = setting.value;
    console.log(`🔑 Key found: ${apiKey.substring(0, 5)}...`);

    // Get latest SMSPool activation
    console.log('🔍 Fetching latest SMSPool activation...');
    const { data: activations, error: activationError } = await supabase
        .from('activations')
        .select('*')
        .eq('provider', 'smspool')
        .order('created_at', { ascending: false })
        .limit(5);

    if (activationError || !activations || activations.length === 0) {
        console.error('❌ No SMSPool activations found:', activationError);
        return;
    }

    console.log(`\n📋 Found ${activations.length} recent SMSPool activations:`);
    activations.forEach((act, i) => {
        console.log(`  ${i + 1}. Order ID: ${act.order_id} | Phone: ${act.phone} | Status: ${act.status} | Code: ${act.sms_code || 'N/A'}`);
    });

    // Check status for each
    for (const activation of activations) {
        console.log(`\n🧪 Checking order: ${activation.order_id}...`);

        const checkUrl = `https://api.smspool.net/sms/check?key=${apiKey}&orderid=${activation.order_id}`;

        try {
            const res = await fetch(checkUrl);
            const data = await res.json();

            console.log(`📥 RAW Response for ${activation.order_id}:`);
            console.log(JSON.stringify(data, null, 2));

            if (data.status === 2) {
                console.log('✅ SMS RECEIVED!');
                console.log(`   Code: ${data.sms}`);
                console.log(`   Full: ${data.full_sms}`);
            } else if (data.status === 1) {
                console.log('⏳ Still Pending');
            } else if (data.status === 3) {
                console.log('❌ Expired/Cancelled');
            } else {
                console.log(`ℹ️ Unknown status: ${data.status}`);
            }

        } catch (e) {
            console.error(`❌ Request failed:`, e.message);
        }
    }
}

testSMSPoolCheck();
