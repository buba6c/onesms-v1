import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const transactionId = 'e3f7a0a5-9770-4905-90af-4a6518a5bcc8';

console.log('🔍 ANALYSE TRANSACTION SPÉCIFIQUE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📄 ID Transaction: ${transactionId}`);

try {
  // 1. Récupérer la transaction principale
  console.log('\n1️⃣ TRANSACTION PRINCIPALE:');
  const { data: transaction, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (transError) {
    console.error('❌ Erreur transaction:', transError.message);
    if (transError.code === 'PGRST116') {
      console.log('   💡 Transaction non trouvée dans la base');
    }
  } else if (transaction) {
    console.log('✅ Transaction trouvée:');
    console.log(`   📅 Créée le: ${new Date(transaction.created_at).toLocaleString('fr-FR')}`);
    console.log(`   👤 User ID: ${transaction.user_id}`);
    console.log(`   💰 Montant: ${transaction.amount} FCFA`);
    console.log(`   📝 Type: ${transaction.type}`);
    console.log(`   🎯 Status: ${transaction.status}`);
    console.log(`   📄 Référence: ${transaction.reference}`);
    console.log(`   🔗 External ID: ${transaction.external_id || 'Aucun'}`);
    console.log(`   �� Description: ${transaction.description}`);
    
    if (transaction.metadata) {
      console.log(`   📊 Metadata:`);
      try {
        const metadata = typeof transaction.metadata === 'string' 
          ? JSON.parse(transaction.metadata) 
          : transaction.metadata;
        Object.entries(metadata).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      } catch (e) {
        console.log(`      Raw: ${JSON.stringify(transaction.metadata)}`);
      }
    }
    
    if (transaction.error_message) {
      console.log(`   🚨 Erreur: ${transaction.error_message}`);
    }
  }

  // 2. Chercher dans les payment_logs
  console.log('\n2️⃣ LOGS DE PAIEMENT ASSOCIÉS:');
  const { data: logs, error: logError } = await supabase
    .from('payment_logs')
    .select('*')
    .or(`transaction_id.eq.${transactionId},request_data.ilike.%${transactionId}%,response_data.ilike.%${transactionId}%`)
    .order('created_at', { ascending: false });

  if (logError) {
    console.error('❌ Erreur logs:', logError.message);
  } else {
    console.log(`📊 ${logs?.length || 0} logs trouvés:`);
    logs?.forEach((log, index) => {
      console.log(`\n   📝 Log ${index + 1}:`);
      console.log(`      📅 ${new Date(log.created_at).toLocaleString('fr-FR')}`);
      console.log(`      🎯 Action: ${log.action}`);
      console.log(`      ${log.success ? '✅' : '❌'} Success: ${log.success}`);
      
      if (log.error_message) {
        console.log(`      🚨 Erreur: ${log.error_message}`);
      }
      
      if (log.request_data) {
        console.log(`      📤 Request: ${log.request_data.substring(0, 200)}...`);
      }
      
      if (log.response_data) {
        console.log(`      📥 Response: ${log.response_data.substring(0, 200)}...`);
      }
    });
  }

  // 3. Rechercher dans d'autres tables liées
  console.log('\n3️⃣ DONNÉES UTILISATEUR:');
  if (transaction?.user_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, balance, created_at')
      .eq('id', transaction.user_id)
      .single();

    if (userError) {
      console.error('❌ Erreur utilisateur:', userError.message);
    } else if (user) {
      console.log('👤 Utilisateur associé:');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   💰 Solde actuel: ${user.balance} FCFA`);
      console.log(`   📅 Compte créé: ${new Date(user.created_at).toLocaleString('fr-FR')}`);
    }
  }

  // 4. Recherche par référence externe si disponible
  if (transaction?.external_id) {
    console.log('\n4️⃣ RECHERCHE PAR TOKEN PAYDUNYA:');
    console.log(`   🎫 Token PayDunya: ${transaction.external_id}`);
    
    // Test de vérification du statut via PayDunya
    try {
      const statusCheck = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${transaction.external_id}`, {
        method: 'GET',
        headers: {
          'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
          'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
          'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
        }
      });
      
      if (statusCheck.ok) {
        const statusResult = await statusCheck.json();
        console.log(`   📊 Statut PayDunya: ${statusResult.response_code}`);
        console.log(`   💬 Message: ${statusResult.response_text}`);
      } else {
        console.log(`   ❌ Impossible de vérifier le statut PayDunya`);
      }
    } catch (e) {
      console.log(`   ⚠️  Erreur vérification PayDunya: ${e.message}`);
    }
  }

  // 5. Résumé de l'analyse
  console.log('\n🎯 RÉSUMÉ DE L\'ANALYSE:');
  if (transaction) {
    console.log(`   📋 Transaction: ${transaction.status.toUpperCase()}`);
    console.log(`   💰 Montant: ${transaction.amount} FCFA`);
    console.log(`   📅 Date: ${new Date(transaction.created_at).toLocaleDateString('fr-FR')}`);
    console.log(`   🔄 Logs associés: ${logs?.length || 0}`);
    
    if (transaction.status === 'pending') {
      console.log('   ⏳ Status: En attente de confirmation');
    } else if (transaction.status === 'completed') {
      console.log('   ✅ Status: Paiement confirmé');
    } else if (transaction.status === 'failed') {
      console.log('   ❌ Status: Paiement échoué');
    }
  } else {
    console.log('   ❌ Transaction non trouvée');
  }

} catch (error) {
  console.error('🚨 ERREUR GÉNÉRALE:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
