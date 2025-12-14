import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const activationId = '90060be1-8ed6-4edf-ad4d-a68c278c95b2';
const orderId = '4477852402';

async function deepAnalyse() {
    console.log('='.repeat(80));
    console.log('🔍 ANALYSE APPROFONDIE DE LA TRANSACTION');
    console.log('='.repeat(80));
    console.log(`\n📌 Activation ID: ${activationId}`);
    console.log(`📌 Order ID Provider: ${orderId}\n`);

    // 1. Récupérer les détails de l'activation
    console.log('\n' + '─'.repeat(80));
    console.log('📋 1. DÉTAILS DE L\'ACTIVATION');
    console.log('─'.repeat(80));
    
    const { data: activation, error: actError } = await supabase
        .from('activations')
        .select('*')
        .eq('id', activationId)
        .single();
    
    if (actError) {
        console.log('❌ Erreur:', actError.message);
        return;
    }
    
    if (activation) {
        console.log('\n📊 Informations de l\'activation:');
        console.log('  - ID:', activation.id);
        console.log('  - User ID:', activation.user_id);
        console.log('  - Numéro:', activation.phone_number);
        console.log('  - Service:', activation.service_code);
        console.log('  - Pays:', activation.country_code);
        console.log('  - Opérateur:', activation.operator);
        console.log('  - Provider:', activation.provider);
        console.log('  - Order ID:', activation.order_id);
        console.log('  - Statut:', activation.status);
        console.log('  - Prix utilisateur:', activation.price_user, 'FCFA');
        console.log('  - Prix coût:', activation.price_cost);
        console.log('  - SMS reçu:', activation.sms_code || 'Aucun');
        console.log('  - Créé le:', activation.created_at);
        console.log('  - Mis à jour le:', activation.updated_at);
        console.log('  - Expiré le:', activation.expires_at);
        
        // Récupérer les infos utilisateur
        console.log('\n' + '─'.repeat(80));
        console.log('👤 2. INFORMATIONS UTILISATEUR');
        console.log('─'.repeat(80));
        
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, balance, created_at')
            .eq('id', activation.user_id)
            .single();
        
        if (user) {
            console.log('  - Email:', user.email);
            console.log('  - Solde actuel:', user.balance, 'FCFA');
            console.log('  - Inscrit le:', user.created_at);
        }
        
        // 3. Vérifier les transactions liées
        console.log('\n' + '─'.repeat(80));
        console.log('💰 3. TRANSACTIONS LIÉES À CETTE ACTIVATION');
        console.log('─'.repeat(80));
        
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', activation.user_id)
            .or(`activation_id.eq.${activationId},description.ilike.%${orderId}%,description.ilike.%${activation.phone_number}%`)
            .order('created_at', { ascending: false });
        
        if (transactions && transactions.length > 0) {
            console.log(`\n📝 ${transactions.length} transaction(s) trouvée(s):\n`);
            transactions.forEach((tx, i) => {
                console.log(`  Transaction #${i + 1}:`);
                console.log(`    - ID: ${tx.id}`);
                console.log(`    - Type: ${tx.type}`);
                console.log(`    - Montant: ${tx.amount} FCFA`);
                console.log(`    - Description: ${tx.description}`);
                console.log(`    - Activation ID: ${tx.activation_id}`);
                console.log(`    - Date: ${tx.created_at}`);
                console.log('');
            });
        } else {
            console.log('  Aucune transaction directement liée trouvée');
        }
        
        // 4. Toutes les transactions du jour pour cet utilisateur
        console.log('\n' + '─'.repeat(80));
        console.log('📅 4. TOUTES LES TRANSACTIONS DE L\'UTILISATEUR AUJOURD\'HUI');
        console.log('─'.repeat(80));
        
        const today = new Date().toISOString().split('T')[0];
        const { data: allTxToday } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', activation.user_id)
            .gte('created_at', today + 'T00:00:00')
            .order('created_at', { ascending: false });
        
        if (allTxToday && allTxToday.length > 0) {
            console.log(`\n📝 ${allTxToday.length} transaction(s) aujourd'hui:\n`);
            allTxToday.forEach((tx, i) => {
                console.log(`  ${i + 1}. [${tx.type}] ${tx.amount} FCFA - ${tx.description} (${tx.created_at})`);
            });
        } else {
            console.log('  Aucune transaction aujourd\'hui');
        }
        
        // 5. Vérifier l'historique des activations du même utilisateur
        console.log('\n' + '─'.repeat(80));
        console.log('📱 5. DERNIÈRES ACTIVATIONS DE L\'UTILISATEUR');
        console.log('─'.repeat(80));
        
        const { data: recentActivations } = await supabase
            .from('activations')
            .select('id, phone_number, service_code, status, price_user, created_at, sms_code')
            .eq('user_id', activation.user_id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (recentActivations && recentActivations.length > 0) {
            console.log(`\n📝 ${recentActivations.length} dernières activations:\n`);
            recentActivations.forEach((act, i) => {
                const isCurrent = act.id === activationId ? '➡️ ' : '   ';
                console.log(`${isCurrent}${i + 1}. [${act.status}] ${act.service_code} - ${act.phone_number} - ${act.price_user} FCFA - SMS: ${act.sms_code || 'Non'} (${act.created_at})`);
            });
        }
        
        // 6. Vérifier chez le provider (5sim)
        console.log('\n' + '─'.repeat(80));
        console.log('🌐 6. VÉRIFICATION CHEZ LE PROVIDER (5SIM)');
        console.log('─'.repeat(80));
        
        // Récupérer la clé API 5sim depuis Supabase
        const { data: secrets } = await supabase
            .from('app_secrets')
            .select('*')
            .eq('key', 'FIVESIM_API_KEY')
            .single();
        
        let apiKey = null;
        if (secrets && secrets.value) {
            apiKey = secrets.value;
        } else {
            // Essayer de récupérer depuis les settings
            const { data: settings } = await supabase
                .from('settings')
                .select('*')
                .in('key', ['5sim_api_key', 'fivesim_api_key', 'FIVESIM_API_KEY']);
            
            if (settings && settings.length > 0) {
                apiKey = settings[0].value;
            }
        }
        
        if (!apiKey) {
            // Utiliser la clé par défaut
            apiKey = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjU3MDc5NTcsImlhdCI6MTczNDE3MTk1NywicmF5IjoiZjNiOGNkNTlhZGZjYWI3YWRkN2Y0YmU4NTI0OWY2ODYiLCJzdWIiOjMxMTU2Nzh9.G_STYZ2m-SXd_K0r-K8Gw6dJKYXMlJjRxFBlHCIYRvxL3EbY-mL7OnIPTDU85lPE2G0NyeOaSW7LRPXKKY2CNNgdGg3TLLV7P8LpFYDpHJFUqpQQFZ_r8cwXNsNZTHkXHVe3z2TqpRFHx_yRGq-ICVFZ9aOIGnOlLLFXJPHfmDAwbJHpWfLVIfNNJKB4k1JZvC_gVG31WC0aCOdOiGZiLqRsMaBqb0tR5jz42vNFT5W_wKxQcdaXSYVrEzYUoJYwbjlxnuGJt0-IIgf0TNoKA8U9aqnB1Bnvl4Gq7vC_QMvPV58kN2aaO1pVCPbhKGu-NqR2lq3dPZbDmyNO1nP6FQ';
        }
        
        try {
            const response = await fetch(`https://5sim.net/v1/user/check/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('\n📊 Statut chez 5sim:');
                console.log('  - ID:', data.id);
                console.log('  - Téléphone:', data.phone);
                console.log('  - Opérateur:', data.operator);
                console.log('  - Produit:', data.product);
                console.log('  - Prix:', data.price, 'RUB');
                console.log('  - Statut:', data.status);
                console.log('  - Pays:', data.country);
                console.log('  - Créé:', data.created_at);
                console.log('  - Expire:', data.expires);
                
                if (data.sms && data.sms.length > 0) {
                    console.log('\n  📩 SMS reçus:');
                    data.sms.forEach((sms, i) => {
                        console.log(`    ${i + 1}. Code: ${sms.code} - Texte: ${sms.text} - Date: ${sms.created_at}`);
                    });
                } else {
                    console.log('\n  📩 Aucun SMS reçu');
                }
            } else {
                const errorText = await response.text();
                console.log('❌ Erreur API 5sim:', response.status, errorText);
            }
        } catch (e) {
            console.log('❌ Erreur lors de la vérification 5sim:', e.message);
        }
        
        // 7. Vérification des logs d'API
        console.log('\n' + '─'.repeat(80));
        console.log('📝 7. LOGS D\'API LIÉS');
        console.log('─'.repeat(80));
        
        const { data: apiLogs } = await supabase
            .from('api_logs')
            .select('*')
            .or(`request_body.cs.{"activation_id":"${activationId}"},response_body.cs.{"id":"${orderId}"}`)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (apiLogs && apiLogs.length > 0) {
            console.log(`\n📝 ${apiLogs.length} log(s) trouvé(s):\n`);
            apiLogs.forEach((log, i) => {
                console.log(`  ${i + 1}. [${log.endpoint}] ${log.method} - Status: ${log.status_code} (${log.created_at})`);
            });
        } else {
            console.log('  Aucun log API trouvé');
        }
        
        // 8. Analyse finale
        console.log('\n' + '─'.repeat(80));
        console.log('📊 8. ANALYSE ET RÉSUMÉ');
        console.log('─'.repeat(80));
        
        // Calculer si la transaction est cohérente
        const debitTx = transactions?.find(tx => tx.type === 'debit' || tx.amount < 0);
        const refundTx = transactions?.find(tx => tx.type === 'refund' || tx.type === 'credit');
        
        console.log('\n  📈 Analyse:');
        console.log(`    - Statut activation: ${activation.status}`);
        console.log(`    - Débit trouvé: ${debitTx ? 'Oui (' + debitTx.amount + ' FCFA)' : 'Non'}`);
        console.log(`    - Remboursement trouvé: ${refundTx ? 'Oui (' + refundTx.amount + ' FCFA)' : 'Non'}`);
        console.log(`    - SMS reçu: ${activation.sms_code ? 'Oui' : 'Non'}`);
        
        // Vérification de cohérence
        if (activation.status === 'cancelled' && !refundTx) {
            console.log('\n  ⚠️ ALERTE: Activation annulée mais pas de remboursement trouvé!');
        }
        if (activation.status === 'completed' && !activation.sms_code) {
            console.log('\n  ⚠️ ALERTE: Activation complétée mais pas de SMS enregistré!');
        }
        if (!debitTx && activation.price_user > 0) {
            console.log('\n  ⚠️ ALERTE: Aucun débit trouvé pour cette activation!');
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ANALYSE TERMINÉE');
    console.log('='.repeat(80));
}

deepAnalyse().catch(console.error);
