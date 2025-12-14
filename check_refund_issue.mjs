import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const activationId = '90060be1-8ed6-4edf-ad4d-a68c278c95b2';
const userId = '1b09b322-39d3-4aed-9be3-6564735f733c';

async function checkRefundIssue() {
    console.log('='.repeat(80));
    console.log('🔍 VÉRIFICATION DU PROBLÈME DE REMBOURSEMENT');
    console.log('='.repeat(80));
    
    // 1. Vérifier le solde actuel de l'utilisateur
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    console.log('\n�� Utilisateur:');
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Solde actuel: ${user.balance} FCFA`);
    
    // 2. Rechercher TOUTES les transactions de type refund
    console.log('\n💰 Recherche de TOUTES les transactions de remboursement:');
    const { data: refundTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .or('type.eq.refund,type.eq.credit,type.eq.recharge')
        .order('created_at', { ascending: false });
    
    if (refundTx && refundTx.length > 0) {
        console.log(`\n  ${refundTx.length} transaction(s) de crédit/remboursement:`);
        refundTx.forEach((tx, i) => {
            console.log(`\n  ${i + 1}. [${tx.type}] ${tx.amount} FCFA`);
            console.log(`     ID: ${tx.id}`);
            console.log(`     Description: ${tx.description}`);
            console.log(`     Activation ID: ${tx.activation_id}`);
            console.log(`     Date: ${tx.created_at}`);
        });
    } else {
        console.log('  ❌ Aucune transaction de remboursement trouvée!');
    }
    
    // 3. Calculer ce que devrait être le solde
    const { data: allTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    
    console.log('\n📊 Historique complet des transactions:');
    let calculatedBalance = 0;
    allTx?.forEach((tx, i) => {
        calculatedBalance += tx.amount;
        console.log(`  ${i + 1}. ${tx.amount >= 0 ? '+' : ''}${tx.amount} FCFA = ${calculatedBalance} FCFA - [${tx.type}] ${tx.description?.substring(0, 40)}... (${tx.created_at})`);
    });
    
    console.log('\n📈 Résumé:');
    console.log(`  - Solde calculé: ${calculatedBalance} FCFA`);
    console.log(`  - Solde en base: ${user.balance} FCFA`);
    console.log(`  - Différence: ${user.balance - calculatedBalance} FCFA`);
    
    // 4. Vérifier si le remboursement manque vraiment
    const { data: activation } = await supabase
        .from('activations')
        .select('*')
        .eq('id', activationId)
        .single();
    
    console.log('\n⚠️ DIAGNOSTIC FINAL:');
    console.log(`  - Statut activation: ${activation.status}`);
    console.log(`  - Prix payé: ${activation.price} FCFA`);
    
    // Vérifier si l'argent a été restitué au solde même sans transaction
    if (user.balance === 368 && calculatedBalance !== user.balance) {
        console.log('\n  ✅ Le solde semble avoir été ajusté correctement (368 FCFA) mais la transaction de remboursement n\'a pas été créée.');
        console.log('  → Le remboursement a probablement été fait directement sur le solde sans créer de transaction.');
    } else if (activation.status === 'refunded') {
        console.log('\n  🚨 PROBLÈME: Le statut est "refunded" mais:');
        console.log(`     - Solde calculé: ${calculatedBalance} FCFA`);
        console.log(`     - Solde actuel: ${user.balance} FCFA`);
        
        if (calculatedBalance === user.balance) {
            console.log('\n  ❌ Le remboursement n\'a PAS été effectué!');
            console.log(`     L'utilisateur devrait avoir ${calculatedBalance + activation.price} FCFA`);
            console.log(`     Montant manquant: ${activation.price} FCFA`);
        }
    }
    
    console.log('\n' + '='.repeat(80));
}

checkRefundIssue().catch(console.error);
