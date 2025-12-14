import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const activationId = '90060be1-8ed6-4edf-ad4d-a68c278c95b2';
const orderId = '4477852402';
const userId = '1b09b322-39d3-4aed-9be3-6564735f733c';

// Clé API SMS-Activate
const smsActivateApiKey = 'd29edd5e1d04c3127d5253d5eAe70de8';

async function verifyTransaction() {
    console.log('='.repeat(80));
    console.log('🔍 VÉRIFICATION APPROFONDIE DE LA TRANSACTION');
    console.log('='.repeat(80));
    
    // 1. Récupérer l'activation complète avec tous les champs
    console.log('\n' + '─'.repeat(80));
    console.log('📋 1. DÉTAILS COMPLETS DE L\'ACTIVATION');
    console.log('─'.repeat(80));
    
    const { data: activation, error: actError } = await supabase
        .from('activations')
        .select('*')
        .eq('id', activationId)
        .single();
    
    if (activation) {
        console.log('\n📊 Tous les champs de l\'activation:');
        Object.keys(activation).forEach(key => {
            console.log(`  - ${key}: ${JSON.stringify(activation[key])}`);
        });
    }
    
    // 2. Vérifier TOUTES les transactions de cet utilisateur aujourd'hui
    console.log('\n' + '─'.repeat(80));
    console.log('💰 2. TOUTES LES TRANSACTIONS DE L\'UTILISATEUR');
    console.log('─'.repeat(80));
    
    const { data: allTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (allTx) {
        console.log(`\n📝 ${allTx.length} dernières transactions:\n`);
        allTx.forEach((tx, i) => {
            console.log(`  ${i + 1}. [${tx.type}] ${tx.amount} FCFA`);
            console.log(`     Description: ${tx.description}`);
            console.log(`     Activation ID: ${tx.activation_id || 'N/A'}`);
            console.log(`     Date: ${tx.created_at}`);
            console.log('');
        });
    }
    
    // 3. Vérifier le statut chez SMS-Activate
    console.log('\n' + '─'.repeat(80));
    console.log('🌐 3. VÉRIFICATION CHEZ SMS-ACTIVATE');
    console.log('─'.repeat(80));
    
    try {
        const response = await fetch(`https://api.sms-activate.io/stubs/handler_api.php?api_key=${smsActivateApiKey}&action=getStatus&id=${orderId}`);
        const result = await response.text();
        console.log('\n📊 Statut SMS-Activate:', result);
        
        // Interpréter le résultat
        if (result.includes('STATUS_WAIT_CODE')) {
            console.log('  ℹ️ Interprétation: En attente de SMS');
        } else if (result.includes('STATUS_OK')) {
            console.log('  ℹ️ Interprétation: SMS reçu');
        } else if (result.includes('STATUS_CANCEL')) {
            console.log('  ℹ️ Interprétation: Annulé');
        } else if (result.includes('NO_ACTIVATION')) {
            console.log('  ℹ️ Interprétation: Activation non trouvée ou expirée');
        }
    } catch (e) {
        console.log('❌ Erreur:', e.message);
    }
    
    // 4. Vérifier l'historique complet des activations
    console.log('\n' + '─'.repeat(80));
    console.log('📱 4. HISTORIQUE DES ACTIVATIONS DE L\'UTILISATEUR');
    console.log('─'.repeat(80));
    
    const { data: activations } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);
    
    if (activations) {
        console.log(`\n📝 ${activations.length} dernières activations:\n`);
        activations.forEach((act, i) => {
            const isCurrent = act.id === activationId ? '➡️ ' : '   ';
            console.log(`${isCurrent}${i + 1}. [${act.status}] ${act.service_code} - ${act.phone_number || 'No phone'}`);
            console.log(`     Prix: ${act.price_user || act.user_price || act.price || 'N/A'} FCFA`);
            console.log(`     Order ID: ${act.order_id}`);
            console.log(`     Créé: ${act.created_at}`);
            console.log(`     Expiré: ${act.expires_at}`);
            console.log('');
        });
    }
    
    // 5. Calculer le bilan
    console.log('\n' + '─'.repeat(80));
    console.log('📊 5. BILAN FINANCIER');
    console.log('─'.repeat(80));
    
    if (allTx) {
        const totalDebit = allTx.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0);
        const totalCredit = allTx.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
        const txForThisActivation = allTx.filter(tx => 
            tx.activation_id === activationId || 
            tx.description?.includes(orderId) ||
            tx.description?.includes('wa')
        );
        
        console.log(`\n  Total débits: ${totalDebit} FCFA`);
        console.log(`  Total crédits: ${totalCredit} FCFA`);
        console.log(`  Transactions pour cette activation: ${txForThisActivation.length}`);
        
        if (txForThisActivation.length > 0) {
            console.log('\n  Détails:');
            txForThisActivation.forEach(tx => {
                console.log(`    - [${tx.type}] ${tx.amount} FCFA - ${tx.description}`);
            });
        }
    }
    
    // 6. Vérifier si un remboursement est nécessaire
    console.log('\n' + '─'.repeat(80));
    console.log('⚠️ 6. DIAGNOSTIC');
    console.log('─'.repeat(80));
    
    // Chercher la transaction de débit pour WhatsApp
    const purchaseTx = allTx?.find(tx => 
        tx.description?.includes('wa') && 
        tx.type === 'purchase' &&
        new Date(tx.created_at).toISOString().split('T')[0] === new Date(activation?.created_at).toISOString().split('T')[0]
    );
    
    // Chercher un remboursement
    const refundTx = allTx?.find(tx => 
        (tx.type === 'refund' || tx.amount > 0) &&
        (tx.activation_id === activationId || tx.description?.includes(orderId))
    );
    
    console.log(`\n  📌 Statut activation: ${activation?.status}`);
    console.log(`  📌 Achat trouvé: ${purchaseTx ? 'Oui (' + purchaseTx.amount + ' FCFA)' : 'Non'}`);
    console.log(`  📌 Remboursement trouvé: ${refundTx ? 'Oui (' + refundTx.amount + ' FCFA)' : 'Non'}`);
    console.log(`  📌 SMS reçu: ${activation?.sms_code || activation?.code || 'Non'}`);
    
    if (activation?.status === 'timeout' && purchaseTx && !refundTx) {
        console.log('\n  🚨 PROBLÈME DÉTECTÉ: L\'activation a expiré mais le remboursement n\'a pas été effectué!');
        console.log(`     Montant à rembourser: ${Math.abs(purchaseTx.amount)} FCFA`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ VÉRIFICATION TERMINÉE');
    console.log('='.repeat(80));
}

verifyTransaction().catch(console.error);
