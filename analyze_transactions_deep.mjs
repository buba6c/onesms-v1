import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function analyze() {
  // 1. Vérifier tous les types de transactions existants
  console.log('=== ANALYSE DES TYPES DE TRANSACTIONS ===\n');
  
  const { data: types } = await supabase
    .from('transactions')
    .select('type, status')
    .order('created_at', { ascending: false });
  
  const typeCount = {};
  const statusCount = {};
  types?.forEach(t => {
    typeCount[t.type] = (typeCount[t.type] || 0) + 1;
    statusCount[t.status] = (statusCount[t.status] || 0) + 1;
  });
  
  console.log('Types de transactions:');
  Object.entries(typeCount).sort((a,b) => b[1]-a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log('\nStatuts:');
  Object.entries(statusCount).sort((a,b) => b[1]-a[1]).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // 2. Vérifier les recharges avec le filtre actuel
  const typesFilter = ['recharge', 'topup', 'credit', 'payment', 'deposit'];
  const { data: recharges, count: rechargeCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .in('type', typesFilter);
  
  console.log('\n=== TRANSACTIONS AVEC FILTRE ACTUEL ===');
  console.log('Types filtrés:', typesFilter.join(', '));
  console.log('Nombre total:', rechargeCount);
  
  // 3. Vérifier si des types sont exclus qui devraient être inclus
  console.log('\n=== TRANSACTIONS POTENTIELLEMENT EXCLUES ===');
  const { data: excluded } = await supabase
    .from('transactions')
    .select('id, type, status, amount, created_at, description')
    .not('type', 'in', `(${typesFilter.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (excluded?.length > 0) {
    console.log('Dernières transactions exclues du filtre:');
    excluded.forEach(t => {
      console.log(`  [${t.type}] ${t.status} - ${t.amount} crédits - ${t.created_at?.slice(0,10)} - ${(t.description || '').slice(0,50)}`);
    });
  } else {
    console.log('Aucune transaction exclue');
  }
  
  // 4. Vérifier les transactions complétées par mois
  console.log('\n=== RECHARGES COMPLÉTÉES PAR MOIS ===');
  const { data: completed } = await supabase
    .from('transactions')
    .select('amount, created_at, metadata')
    .in('type', typesFilter)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });
  
  const byMonth = {};
  completed?.forEach(t => {
    const month = t.created_at?.slice(0,7);
    if (!byMonth[month]) byMonth[month] = { count: 0, amount: 0, xof: 0 };
    byMonth[month].count++;
    byMonth[month].amount += t.amount || 0;
    byMonth[month].xof += t.metadata?.amount_xof || (t.amount * 100) || 0;
  });
  
  Object.entries(byMonth).sort((a,b) => b[0].localeCompare(a[0])).slice(0,12).forEach(([month, data]) => {
    console.log(`  ${month}: ${data.count} transactions, ${data.amount} crédits, ${data.xof.toLocaleString()} FCFA`);
  });
  
  // 5. Vérifier la limite de 500
  console.log('\n=== VÉRIFICATION LIMITE 500 ===');
  const { count: totalRecharges } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .in('type', typesFilter);
  
  console.log('Total recharges en DB:', totalRecharges);
  console.log('Limite actuelle dans le code:', 500);
  if (totalRecharges > 500) {
    console.log(`⚠️ ATTENTION: ${totalRecharges - 500} transactions sont coupées par la limite!`);
    
    // Voir les dates des transactions coupées
    const { data: cutoff } = await supabase
      .from('transactions')
      .select('created_at')
      .in('type', typesFilter)
      .order('created_at', { ascending: false })
      .range(499, 499);
    
    if (cutoff?.[0]) {
      console.log(`  La limite coupe à partir de: ${cutoff[0].created_at}`);
    }
  }
  
  // 6. Analyser les transactions récentes de décembre 2024
  console.log('\n=== TRANSACTIONS DÉCEMBRE 2024 ===');
  const { data: dec2024 } = await supabase
    .from('transactions')
    .select('id, type, status, amount, created_at, metadata, user_id')
    .in('type', typesFilter)
    .gte('created_at', '2024-12-01')
    .order('created_at', { ascending: false });
  
  console.log(`Transactions depuis 1er déc 2024: ${dec2024?.length || 0}`);
  
  const dec2024Completed = dec2024?.filter(t => t.status === 'completed') || [];
  console.log(`  - Complétées: ${dec2024Completed.length}`);
  
  const totalXOF = dec2024Completed.reduce((sum, t) => sum + (t.metadata?.amount_xof || t.amount * 100 || 0), 0);
  console.log(`  - Total XOF: ${totalXOF.toLocaleString()} FCFA`);
  
  // 7. Chercher des transactions avec des types non standard
  console.log('\n=== TYPES DE TRANSACTIONS UNIQUES ===');
  const allTypes = [...new Set(types?.map(t => t.type))];
  console.log('Tous les types:', allTypes.join(', '));
  
  // 8. Vérifier s'il y a des transactions "admin_credit" ou similaires
  const adminTypes = allTypes.filter(t => t?.includes('admin') || t?.includes('manual') || t?.includes('bonus'));
  if (adminTypes.length > 0) {
    console.log('\n=== TYPES ADMIN/MANUAL/BONUS ===');
    for (const adminType of adminTypes) {
      const { data: adminTx, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('type', adminType)
        .eq('status', 'completed');
      
      console.log(`  ${adminType}: ${count} transactions complétées`);
    }
  }
  
  // 9. Dernières 10 recharges pour vérification
  console.log('\n=== 10 DERNIÈRES RECHARGES ===');
  const { data: last10 } = await supabase
    .from('transactions')
    .select('id, type, status, amount, created_at, metadata, user:users(email)')
    .in('type', typesFilter)
    .order('created_at', { ascending: false })
    .limit(10);
  
  last10?.forEach(t => {
    const xof = t.metadata?.amount_xof || t.amount * 100;
    console.log(`  ${t.created_at?.slice(0,16)} | ${t.type.padEnd(10)} | ${t.status.padEnd(10)} | ${t.amount} crédits | ${xof} FCFA | ${t.user?.email?.slice(0,25) || 'N/A'}`);
  });
}

analyze().catch(console.error);
