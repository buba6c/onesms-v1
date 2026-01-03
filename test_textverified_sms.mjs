// Test TextVerified SMS fetch with Simple Token
// Run with: node test_textverified_sms.mjs

const TEXTVERIFIED_BASE_URL = 'https://www.textverified.com/api/pub/v2';

// Simple Token from system_settings (direct auth - no username needed)
const SIMPLE_TOKEN = '1_RBhGTeqihAYiozC2Au39Wj9eiwCsbRwRz2E3sdOlOZuwUHvDkEQ83WXBiygGP9i6laeEmuXO';

// The order ID from the failed activation
const ORDER_ID = 'lr_01KE06W9HNEHCGAJ86SW9B0SHY';

async function main() {
    // Use Simple Token directly as Bearer
    const token = SIMPLE_TOKEN;
    console.log('✅ Using Simple Token for auth');

    // 1. Get verification details
    console.log('\n📋 Fetching verification details for:', ORDER_ID);
    const verifyRes = await fetch(`${TEXTVERIFIED_BASE_URL}/verifications/${ORDER_ID}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0'
        }
    });

    if (!verifyRes.ok) {
        console.error('❌ Verification fetch failed:', verifyRes.status, await verifyRes.text());
        return;
    }

    const verifyData = await verifyRes.json();
    console.log('\n📊 VERIFICATION RESPONSE:');
    console.log(JSON.stringify(verifyData, null, 2));

    // 2. Check if SMS link exists
    if (verifyData.sms && verifyData.sms.href) {
        console.log('\n📨 Fetching SMS from:', verifyData.sms.href);

        const smsRes = await fetch(verifyData.sms.href, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (smsRes.ok) {
            const smsData = await smsRes.json();
            console.log('\n📱 SMS RESPONSE:');
            console.log(JSON.stringify(smsData, null, 2));

            // Show available keys
            if (smsData.data && smsData.data.length > 0) {
                console.log('\n🔑 SMS object keys:', Object.keys(smsData.data[0]));
            }
        } else {
            console.error('❌ SMS fetch failed:', smsRes.status, await smsRes.text());
        }
    } else {
        console.log('\n⚠️ No sms.href in verification response');
        console.log('Available keys:', Object.keys(verifyData));
    }

    // 3. Try direct SMS endpoint
    console.log('\n🔄 Trying direct SMS endpoint...');
    const directSmsRes = await fetch(`${TEXTVERIFIED_BASE_URL}/sms?reservationId=${ORDER_ID}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0'
        }
    });

    if (directSmsRes.ok) {
        const directSmsData = await directSmsRes.json();
        console.log('\n📱 DIRECT SMS RESPONSE:');
        console.log(JSON.stringify(directSmsData, null, 2));
    } else {
        console.error('❌ Direct SMS failed:', directSmsRes.status, await directSmsRes.text());
    }
}

main().catch(console.error);
