import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 VÉRIFICATION DES PAIEMENTS PAYDUNYA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  // 1. Vérifier les transactions récentes
  console.log('\n1️⃣ TRANSACTIONS RÉCENTES:');
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (transError) {
    console.error('❌ Erreur transactions:', transError.message);
  } else {
    console.log(`📊 ${transactions?.length || 0} transactions trouvées:`);
    transactions?.forEach(t => {
      const timestamp = new Date(t.created_at).toLocaleString('fr-FR');
      console.log(`   ${t.status === 'completed' ? '✅' : t.status === 'pending' ? '⏳' : '❌'} ${t.id}`);
      console.log(`     💰 ${t.amount}€ - ${t.type} - ${timestamp}`);
      console.log(`     👤 User: ${t.user_id}`);
      console.log(`     📝 Status: ${t.status}`);
      if (t.external_id) console.log(`     🎫 PayDunya Token: ${t.external_id}`);
      if (t.error_message) console.log(`     🚨 Erreur: ${t.error_message}`);
      console.log('');
    });
  }

  // 2. Vérifier les logs de paiement
  console.log('2️⃣ LOGS DE PAIEMENT:');
  const { data: logs, error: logError } = await supabase
    .from('payment_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error('❌ Erreur logs:', logError.message);
  } else {
    console.log(`📊 ${logs?.length || 0} logs récents:`);
    logs?.forEach(log => {
      const timestamp = new Date(log.created_at).toLocaleString('fr-FR');
      console.log(`   ${log.success ? '✅' : '❌'} ${log.action} - ${timestamp}`);
      if (log.error_message) console.log(`     🚨 ${log.error_message}`);
      if (log.response_data) {
        try {
          const response = JSON.parse(log.response_data);
          if (response.token) console.log(`     🎫 Token: ${response.token}`);
          if (response.response_text) console.log(`     🔗 URL: ${response.response_text}`);
        } catch (e) {
          console.log(`     📝 Data: ${log.response_data.substring(0, 100)}...`);
        }
      }
      console.log('');
    });
  }

  // 3. Test direct PayDunya avec les dernières clés
  console.log('3️⃣ TEST DIRECT PAYDUNYA:');
  const testResponse = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
      'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
      'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
    },
    body: JSON.stringify({
      invoice: {
        total_amount: 100,
        description: "Test vérification - OneSMS",
      },
      store: {
        name: "OneSMS Verification",
        tagline: "Test de vérification"
      },
      actions: {
        cancel_url: "https://google.com",
        return_url: "https://google.com",
        callback_url: "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook"
      }
    })
  });

  const testResult = await testResponse.json();
  console.log(`   📊 Status: ${testResponse.status}`);
  console.log(`   🔍 Code: ${testResult.response_code}`);
  
  if (testResponse.ok && testResult.response_code === "00") {
    console.log('   ✅ PayDunya API fonctionne !');
    console.log(`   🎫 Test Token: ${testResult.token}`);
  } else {
    console.log('   ❌ Problème PayDunya API');
    console.log(`   💬 Message: ${testResult.response_text}`);
  }

  console.log('\n🎯 RÉSUMÉ:');
  console.log('   📊 Transactions dans la base: ' + (transactions?.length || 0));
  console.log('   📝 Logs de paiement: ' + (logs?.length || 0));
  console.log('   🔧 PayDunya API: ' + (testResult.response_code === "00" ? '✅ OK' : '❌ Problème'));

} catch (error) {
  console.error('🚨 ERREUR GÉNÉRALE:', error.message);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
