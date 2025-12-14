import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const activationId = '90060be1-8ed6-4edf-ad4d-a68c278c95b2';
const userId = '1b09b322-39d3-4aed-9be3-6564735f733c';

async function debugRefundFailure() {
    console.log('='.repeat(80));
    console.log('🔍 DEBUG: POURQUOI LE REMBOURSEMENT AUTOMATIQUE N\'A PAS MARCHÉ');
    console.log('='.repeat(80));
    
    // 1. Vérifier les détails de l'activation
    console.log('\n' + '─'.repeat(80));
    console.log('📋 1. ÉTAT DE L\'ACTIVATION');
    console.log('─'.repeat(80));
    
    const { data: activation } = await supabase
        .from('activations')
        .select('*')
        .eq('id', activationId)
        .single();
    
    if (activation) {
        console.log('\n  📌 Champs critiques pour le remboursement:');
        console.log(`  - frozen_amount: ${activation.frozen_amount} (⚠️ CRITIQUE)`);
        console.log(`  - charged: ${activation.charged}`);
        console.log(`  - status: ${activation.status}`);
        console.log(`  - price: ${activation.price}`);
        console.log(`  - expires_at: ${activation.expires_at}`);
        console.log(`  - created_at: ${activation.created_at}`);
        console.log(`  - updated_at: ${activation.updated_at}`);
        
        if (activation.frozen_amount === 0 || activation.frozen_amount === null) {
            console.log('\n  🚨 PROBLÈME DÉTECTÉ: frozen_amount = 0 ou null');
            console.log('     → Le système atomic_refund utilise frozen_amount pour savoir combien rembourser');
            console.log('     → Si frozen_amount = 0, le système pense que c\'est déjà remboursé!');
        }
    }
    
    // 2. Vérifier l'état du wallet utilisateur
    console.log('\n' + '─'.repeat(80));
    console.log('👤 2. ÉTAT DU WALLET UTILISATEUR');
    console.log('─'.repeat(80));
    
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (user) {
        console.log(`\n  - balance: ${user.balance} FCFA`);
        console.log(`  - frozen_balance: ${user.frozen_balance} FCFA`);
        console.log(`  - total disponible: ${user.balance} FCFA`);
        console.log(`  - total gelé: ${user.frozen_balance} FCFA`);
    }
    
    // 3. Vérifier les balance_operations
    console.log('\n' + '─'.repeat(80));
    console.log('📊 3. HISTORIQUE DES OPÉRATIONS DE SOLDE');
    console.log('─'.repeat(80));
    
    const { data: operations } = await supabase
        .from('balance_operations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (operations && operations.length > 0) {
        console.log(`\n  ${operations.length} dernières opérations:\n`);
        operations.forEach((op, i) => {
            console.log(`  ${i + 1}. [${op.operation_type}] ${op.amount} FCFA`);
            console.log(`     Activation ID: ${op.activation_id}`);
            console.log(`     Balance: ${op.balance_before} → ${op.balance_after}`);
            console.log(`     Frozen: ${op.frozen_before} → ${op.frozen_after}`);
            console.log(`     Raison: ${op.reason}`);
            console.log(`     Date: ${op.created_at}`);
            console.log('');
        });
    } else {
        console.log('  ❌ Aucune opération de solde trouvée!');
    }
    
    // 4. Vérifier si atomic_refund existe
    console.log('\n' + '─'.repeat(80));
    console.log('⚙️ 4. VÉRIFICATION DE LA FONCTION atomic_refund');
    console.log('─'.repeat(80));
    
    try {
        // Tester si la fonction existe en l'appelant avec des paramètres de test
        const { data: testResult, error: testError } = await supabase.rpc('atomic_refund', {
            p_user_id: '00000000-0000-0000-0000-000000000000', // UUID inexistant
            p_activation_id: '00000000-0000-0000-0000-000000000000',
            p_reason: 'TEST'
        });
        
        if (testError) {
            console.log(`\n  Résultat test: ${testError.message}`);
            if (testError.message.includes('does not exist')) {
                console.log('  🚨 FONCTION atomic_refund NON TROUVÉE!');
            } else if (testError.message.includes('not found') || testError.message.includes('Activation not found')) {
                console.log('  ✅ Fonction existe (erreur normale car UUID de test)');
            }
        } else {
            console.log('  ✅ Fonction atomic_refund existe et fonctionne');
            console.log('     Résultat:', testResult);
        }
    } catch (e) {
        console.log('  Erreur:', e.message);
    }
    
    // 5. Chercher dans les logs Edge Function (si accessible)
    console.log('\n' + '─'.repeat(80));
    console.log('📝 5. ANALYSE DU PROBLÈME');
    console.log('─'.repeat(80));
    
    console.log('\n  🔍 Hypothèses sur la cause du problème:');
    console.log('');
    
    if (activation?.frozen_amount === 0 || activation?.frozen_amount === null) {
        console.log('  ❌ CAUSE 1: frozen_amount = 0 au moment de l\'achat');
        console.log('     → Lors de l\'achat, le montant n\'a pas été correctement gelé');
        console.log('     → Du coup atomic_refund n\'a rien à rembourser');
        console.log('');
    }
    
    console.log('  ❌ CAUSE 2: Le polling SMS a peut-être arrêté avant l\'expiration');
    console.log('     → Le frontend doit vérifier régulièrement avec check-sms-activate-status');
    console.log('     → Si l\'utilisateur ferme l\'app, le polling s\'arrête');
    console.log('');
    
    console.log('  ❌ CAUSE 3: Pas de cron job côté serveur pour traiter les expirations');
    console.log('     → Le remboursement dépend uniquement du polling frontend');
    console.log('');
    
    // 6. Recommandations
    console.log('\n' + '─'.repeat(80));
    console.log('💡 6. RECOMMANDATIONS');
    console.log('─'.repeat(80));
    
    console.log('\n  1. Vérifier que buy-sms-activate-number gèle correctement les fonds');
    console.log('  2. Ajouter un cron job Supabase pour traiter les activations expirées');
    console.log('  3. Vérifier les logs de l\'Edge Function check-sms-activate-status');
    
    console.log('\n' + '='.repeat(80));
}

debugRefundFailure().catch(console.error);
