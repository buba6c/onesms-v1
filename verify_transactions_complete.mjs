import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function verifyTransactions() {
  console.log('=== VÉRIFICATION COMPLÈTE DES TRANSACTIONS ===\n');
  
  // 1. Compter toutes les transactions par type et status
  const { data: all } = await supabase
    .from('transactions')
    .select('type, status, amount, metadata, created_at')
    .order('created_at', { ascending: false });
  
  console.log(`Total transactions en DB: ${all?.length || 0}\n`);
  
  // Par type
  const byType = {};
  all?.forEach(t => {
    const key = t.type;
    if (!byType[key]) byType[key] = { total: 0, completed: 0, pending: 0, failed: 0, credits: 0, xof: 0 };
    byType[key].total++;
    byType[key][t.status] = (byType[key][t.status] || 0) + 1;
    if (t.status === 'completed') {
      byType[key].credits += Math.abs(t.amount) || 0;
      byType[key].xof += t.metadata?.amount_xof || Math.abs(t.amount) * 100 || 0;
    }
  });
  
  console.log('=== PAR TYPE ===');
  console.log('Type'.padEnd(20) + 'Total'.padStart(8) + 'OK'.padStart(8) + 'Pending'.padStart(10) + 'Failed'.padStart(10) + 'Crédits'.padStart(12) + 'XOF'.padStart(15));
  console.log('-'.repeat(83));
  
  Object.entries(byType)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([type, data]) => {
      console.log(
        type.padEnd(20) + 
        data.total.toString().padStart(8) + 
        (data.completed || 0).toString().padStart(8) + 
        (data.pending || 0).toString().padStart(10) + 
        (data.failed || 0).toString().padStart(10) +
        data.credits.toString().padStart(12) +
        data.xof.toLocaleString().padStart(15)
      );
    });
  
  // 2. Transactions de type "deposit" ou "credit" complétées
  console.log('\n=== DÉTAIL DES DÉPÔTS COMPLÉTÉS ===');
  const { data: deposits } = await supabase
    .from('transactions')
    .select('id, type, status, amount, created_at, metadata, user:users(email)')
    .in('type', ['deposit', 'credit', 'recharge', 'topup', 'payment', 'referral_bonus'])
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(30);
  
  console.log(`\n30 dernières recharges complétées:`);
  deposits?.forEach(t => {
    const xof = t.metadata?.amount_xof || t.amount * 100;
    const provider = t.metadata?.payment_provider || t.metadata?.provider || 'N/A';
    console.log(`  ${t.created_at?.slice(0,16)} | ${t.type.padEnd(15)} | ${t.amount.toString().padStart(4)} crédits | ${xof.toString().padStart(6)} FCFA | ${provider.padEnd(12)} | ${t.user?.email?.slice(0,30) || 'N/A'}`);
  });
  
  // 3. Total revenus par provider
  console.log('\n=== REVENUS PAR PROVIDER (Complétés) ===');
  const { data: allCompleted } = await supabase
    .from('transactions')
    .select('amount, metadata')
    .in('type', ['deposit', 'credit', 'recharge', 'topup', 'payment'])
    .eq('status', 'completed');
  
  const byProvider = {};
  allCompleted?.forEach(t => {
    const provider = t.metadata?.payment_provider || t.metadata?.provider || 'unknown';
    if (!byProvider[provider]) byProvider[provider] = { count: 0, credits: 0, xof: 0 };
    byProvider[provider].count++;
    byProvider[provider].credits += t.amount || 0;
    byProvider[provider].xof += t.metadata?.amount_xof || (t.amount * 100) || 0;
  });
  
  console.log('Provider'.padEnd(20) + 'Count'.padStart(8) + 'Crédits'.padStart(12) + 'XOF'.padStart(15));
  console.log('-'.repeat(55));
  Object.entries(byProvider)
    .sort((a, b) => b[1].xof - a[1].xof)
    .forEach(([provider, data]) => {
      console.log(
        provider.padEnd(20) + 
        data.count.toString().padStart(8) + 
        data.credits.toString().padStart(12) +
        data.xof.toLocaleString().padStart(15)
      );
    });
  
  // 4. Total général
  const totalCredits = allCompleted?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const totalXOF = allCompleted?.reduce((sum, t) => sum + (t.metadata?.amount_xof || t.amount * 100 || 0), 0) || 0;
  
  console.log('\n=== TOTAL GÉNÉRAL ===');
  console.log(`Transactions complétées: ${allCompleted?.length || 0}`);
  console.log(`Total crédits vendus: ${totalCredits.toLocaleString()}`);
  console.log(`Total revenus: ${totalXOF.toLocaleString()} FCFA`);
  
  // 5. Comparer avec ce que affiche l'interface (limite 500 vs 2000)
  console.log('\n=== IMPACT DE LA LIMITE ===');
  const typesFilter = ['recharge', 'topup', 'credit', 'payment', 'deposit', 'referral_bonus'];
  
  const { data: limit500 } = await supabase
    .from('transactions')
    .select('amount, metadata, status')
    .in('type', typesFilter)
    .order('created_at', { ascending: false })
    .limit(500);
  
  const { data: limit2000 } = await supabase
    .from('transactions')
    .select('amount, metadata, status')
    .in('type', typesFilter)
    .order('created_at', { ascending: false })
    .limit(2000);
  
  const completed500 = limit500?.filter(t => t.status === 'completed') || [];
  const completed2000 = limit2000?.filter(t => t.status === 'completed') || [];
  
  const xof500 = completed500.reduce((sum, t) => sum + (t.metadata?.amount_xof || t.amount * 100 || 0), 0);
  const xof2000 = completed2000.reduce((sum, t) => sum + (t.metadata?.amount_xof || t.amount * 100 || 0), 0);
  
  console.log(`Avec limite 500:  ${completed500.length} complétées, ${xof500.toLocaleString()} FCFA`);
  console.log(`Avec limite 2000: ${completed2000.length} complétées, ${xof2000.toLocaleString()} FCFA`);
  console.log(`Différence: ${completed2000.length - completed500.length} transactions, ${(xof2000 - xof500).toLocaleString()} FCFA`);
}

verifyTransactions().catch(console.error);
