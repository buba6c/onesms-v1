import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 DIAGNOSTIC DES ERREURS DE PAIEMENT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  // 1. Vérifier les transactions récentes avec erreurs
  console.log('\n1️⃣ TRANSACTIONS RÉCENTES AVEC ERREURS:');
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);

  if (transError) {
    console.error('❌ Erreur requête transactions:', transError);
  } else {
    console.log(`📊 ${transactions?.length || 0} transactions échouées récentes:`);
    transactions?.forEach(t => {
      console.log(`   • ${t.id} - ${t.amount}€ - ${t.payment_provider} - ${new Date(t.created_at).toLocaleString()}`);
      if (t.error_message) console.log(`     ❌ ${t.error_message}`);
    });
  }

  // 2. Vérifier les logs d'erreurs dans payment_logs
  console.log('\n2️⃣ LOGS DE PAIEMENT RÉCENTS:');
  const { data: logs, error: logError } = await supabase
    .from('payment_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logError) {
    console.error('❌ Erreur requête logs:', logError);
  } else {
    console.log(`📊 ${logs?.length || 0} logs récents:`);
    logs?.forEach(log => {
      const status = log.success ? '✅' : '❌';
      console.log(`   ${status} ${log.action} - ${new Date(log.created_at).toLocaleString()}`);
      if (log.error_message) console.log(`     🚨 ${log.error_message}`);
      if (log.response_data) {
        const response = JSON.parse(log.response_data);
        if (response.error || response.message) {
          console.log(`     📝 ${response.error || response.message}`);
        }
      }
    });
  }

  // 3. Vérifier l'état PayDunya dans payment_providers
  console.log('\n3️⃣ CONFIGURATION PAYDUNYA:');
  const { data: providers, error: provError } = await supabase
    .from('payment_providers')
    .select('*')
    .eq('provider_name', 'paydunya');

  if (provError) {
    console.error('❌ Erreur requête providers:', provError);
  } else {
    console.log(`📊 ${providers?.length || 0} configurations PayDunya:`);
    providers?.forEach(p => {
      console.log(`   • ${p.provider_name} - ${p.is_active ? '✅ Actif' : '❌ Inactif'}`);
      console.log(`     📍 Mode: ${p.environment || 'non défini'}`);
      console.log(`     🔑 API Key: ${p.api_key ? 'Configurée' : 'Manquante'}`);
    });
  }

} catch (error) {
  console.error('🚨 ERREUR GÉNÉRALE:', error);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
