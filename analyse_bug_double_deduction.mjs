/**
 * ANALYSE BUG CRITIQUE: 31 - 5 = 21 ???
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
);

const USER_ID = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

async function analyseProbleme() {
  console.log('🔴 ANALYSE DU BUG: 31 - 5 = 21 ???\n');

  // 1. État actuel
  const { data: user } = await supabase
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', USER_ID)
    .single();
  
  console.log('📊 ÉTAT ACTUEL DB:');
  console.log('   Balance réelle:', user?.balance, 'Ⓐ');
  console.log('   Frozen:', user?.frozen_balance, 'Ⓐ');
  console.log('   Disponible (balance-frozen):', (user?.balance - user?.frozen_balance).toFixed(2), 'Ⓐ');

  // 2. Dernières opérations de balance
  console.log('\n📋 DERNIÈRES OPÉRATIONS (balance_operations):');
  const { data: ops } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(8);
  
  ops?.forEach((op, i) => {
    console.log(`\n   ${i+1}. ${op.operation_type.toUpperCase()} - ${op.amount} Ⓐ`);
    console.log(`      Avant: balance=${op.balance_before}, frozen=${op.frozen_before}`);
    console.log(`      Après: balance=${op.balance_after}, frozen=${op.frozen_after}`);
    console.log(`      Date: ${new Date(op.created_at).toLocaleString()}`);
  });

  // 3. Activations pending
  console.log('\n📱 ACTIVATIONS EN COURS:');
  const { data: pending } = await supabase
    .from('activations')
    .select('id, status, frozen_amount, price, service_code, created_at')
    .eq('user_id', USER_ID)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false });
  
  let totalFrozen = 0;
  pending?.forEach((a, i) => {
    console.log(`   ${i+1}. ${a.service_code} | status: ${a.status} | prix: ${a.price}Ⓐ | frozen: ${a.frozen_amount}Ⓐ`);
    totalFrozen += parseFloat(a.frozen_amount || 0);
  });
  
  console.log(`\n   Total frozen calculé: ${totalFrozen} Ⓐ`);
  console.log(`   Frozen en DB: ${user?.frozen_balance} Ⓐ`);

  // 4. Analyse du problème
  console.log('\n🔍 ANALYSE DU PROBLÈME:');
  console.log('   Avant: solde=31, frozen=5, balance_réelle=36.84');
  console.log('   Après: solde=21, frozen=10');
  console.log('   Différence solde: 31-21 = 10 Ⓐ (mais achat = 5 Ⓐ)');
  console.log('   Différence frozen: 10-5 = 5 Ⓐ (correct)');
  console.log('');
  console.log('   ⚠️  HYPOTHÈSE 1: Le système fait DEUX déductions:');
  console.log('      - balance -= prix (freeze normal)');
  console.log('      - balance -= prix ENCORE (bug)');
  console.log('');
  console.log('   ⚠️  HYPOTHÈSE 2: Affichage calcule mal');
  console.log('      - disponible = balance - frozen - autre_chose?');
  
  // 5. Vérification mathématique
  console.log('\n📐 VÉRIFICATION MATHÉMATIQUE:');
  const balanceDB = user?.balance;
  const frozenDB = user?.frozen_balance;
  const disponibleCalcule = balanceDB - frozenDB;
  
  console.log(`   Balance DB: ${balanceDB}`);
  console.log(`   Frozen DB: ${frozenDB}`);
  console.log(`   Disponible calculé: ${disponibleCalcule.toFixed(2)}`);
  console.log(`   Disponible affiché: 21`);
  
  if (Math.abs(disponibleCalcule - 21) < 1) {
    console.log('\n   ✅ Le calcul DB est correct (balance - frozen = ~21)');
    console.log('   → Le problème est que balance a été réduite 2x au lieu de 1x');
  } else {
    console.log('\n   ❌ Incohérence entre DB et affichage');
  }
}

analyseProbleme().catch(console.error);
