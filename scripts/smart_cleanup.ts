
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🚀 Starting Smart Cleanup...');

    // 1. Get all PENDING activations
    // We check EVERYTHING pending, because users funds are frozen
    const { data: activations, error } = await supabase
        .from('activations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ DB Error:', error);
        return;
    }

    console.log(`📋 Found ${activations.length} pending activations.`);

    for (const activation of activations) {
        const provider = activation.provider || 'sms-activate';
        console.log(`\n🔍 [${activation.id}] Checking (${provider})...`);

        // Determined correct function
        let funcName = 'check-sms-activate-status';
        if (provider === '5sim') funcName = 'check-5sim-status';
        if (provider === 'smspva') funcName = 'check-smspva-status';
        if (provider === 'onlinesim') funcName = 'check-onlinesim-status';

        try {
            console.log(`👉 Invoking ${funcName} for order ${activation.order_id}...`);

            const { data, error: funcError } = await supabase.functions.invoke(funcName, {
                body: {
                    activationId: activation.id,
                    userId: activation.user_id
                }
            });

            if (funcError) {
                console.error(`❌ Function Error:`, funcError);
            } else {
                if (data?.data?.status) {
                    console.log(`✅ Result: ${data.data.status.toUpperCase()}`);
                    if (data.data.status === 'timeout' || data.data.status === 'cancelled') {
                        console.log('   -> REFUNDED');
                    } else if (data.data.status === 'received') {
                        console.log('   -> COMMITTED (Charged)');
                    }
                } else {
                    console.log(`⚠️ Result:`, data);
                }
            }

        } catch (e) {
            console.error(`❌ Exception:`, e);
        }

        // Tiny delay
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n✅ Smart Cleanup Complete!');
}

main();
