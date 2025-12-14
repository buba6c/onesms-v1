import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTimeoutActivations() {
    console.log('='.repeat(80));
    console.log('🔍 ANALYSE DES ACTIVATIONS TIMEOUT');
    console.log('='.repeat(80));
    
    // Récupérer toutes les activations timeout
    const { data: timeouts } = await supabase
        .from('activations')
        .select('id, user_id, order_id, service_code, price, frozen_amount, status, created_at, expires_at')
        .eq('status', 'timeout')
        .order('created_at', { ascending: false });
    
    console.log(`\n📊 ${timeouts?.length || 0} activations avec status='timeout'\n`);
    
    let problemCount = 0;
    let totalMissing = 0;
    
    for (const act of (timeouts || [])) {
        // Vérifier s'il y a eu un remboursement
        const { data: refundTx } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', act.user_id)
            .or(`activation_id.eq.${act.id},description.ilike.%${act.order_id}%`)
            .eq('type', 'refund');
        
        const { data: balanceOp } = await supabase
            .from('balance_operations')
            .select('*')
            .eq('activation_id', act.id)
            .eq('operation_type', 'refund');
        
        const hasRefund = (refundTx && refundTx.length > 0) || (balanceOp && balanceOp.length > 0);
        const hasFrozenAmount = act.frozen_amount > 0;
        
        if (!hasRefund && act.price > 0) {
            problemCount++;
            totalMissing += act.price;
            console.log(`❌ PROBLÈME: ${act.id.substring(0, 8)}...`);
            console.log(`   Service: ${act.service_code}`);
            console.log(`   Prix: ${act.price} FCFA`);
            console.log(`   Frozen: ${act.frozen_amount}`);
            console.log(`   Order: ${act.order_id}`);
            console.log(`   User: ${act.user_id}`);
            console.log(`   Créé: ${act.created_at}`);
            console.log('');
        }
    }
    
    console.log('─'.repeat(80));
    console.log(`\n📈 RÉSUMÉ:`);
    console.log(`  - Total activations timeout: ${timeouts?.length || 0}`);
    console.log(`  - Sans remboursement détecté: ${problemCount}`);
    console.log(`  - Montant potentiellement manquant: ${totalMissing} FCFA`);
    
    console.log('\n' + '='.repeat(80));
}

checkTimeoutActivations().catch(console.error);
