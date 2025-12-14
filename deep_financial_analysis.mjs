import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🔬 DEEP ANALYSE - PROBLÈMES FINANCIERS DÉTECTÉS\n');
console.log('='.repeat(70) + '\n');

// ============================================================================
// 1. ANALYSE DÉTAILLÉE USER buba6c@gmail.com
// ============================================================================
console.log('👤 1. ANALYSE USER buba6c@gmail.com\n');

const { data: bubaUser } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'buba6c@gmail.com')
  .single();

console.log('   Balance actuelle:', bubaUser?.balance);
console.log('   Frozen balance:', bubaUser?.frozen_balance);
console.log('');

// Activations pending pour cet utilisateur
const { data: bubaPendingActs } = await supabase
  .from('activations')
  .select('id, price, status, created_at, service_code, phone, order_id')
  .eq('user_id', bubaUser?.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

console.log('   Activations PENDING:', bubaPendingActs?.length);
const totalPending = (bubaPendingActs || []).reduce((sum, a) => sum + (a.price || 0), 0);
console.log('   Total pending:', totalPending.toFixed(2), 'Ⓐ');
console.log('');

for (const act of bubaPendingActs || []) {
  const ageMinutes = Math.floor((Date.now() - new Date(act.created_at).getTime()) / 60000);
  console.log(`   - ${act.service_code} | ${act.phone} | ${act.price}Ⓐ | ${ageMinutes}min ago`);
}

// Transactions pending pour cet utilisateur
const { data: bubaPendingTx } = await supabase
  .from('transactions')
  .select('id, amount, status, created_at, type, related_activation_id')
  .eq('user_id', bubaUser?.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

console.log('\n   Transactions PENDING:', bubaPendingTx?.length);
const totalPendingTx = (bubaPendingTx || []).reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
console.log('   Total pending tx:', totalPendingTx.toFixed(2), 'Ⓐ');

// Écart
console.log('\n   📊 ÉCART FROZEN:');
console.log(`      frozen_balance: ${bubaUser?.frozen_balance}`);
console.log(`      activations pending: ${totalPending.toFixed(2)}`);
console.log(`      transactions pending: ${totalPendingTx.toFixed(2)}`);
console.log(`      diff (frozen - pending_act): ${(bubaUser?.frozen_balance - totalPending).toFixed(2)}`);

// ============================================================================
// 2. ANALYSE BUG: Rent sans frozen_balance
// ============================================================================
console.log('\n\n' + '='.repeat(70));
console.log('🏠 2. ANALYSE BUG RENT - Pas de frozen_balance\n');

// Lire le code de buy-sms-activate-rent
console.log('   ⚠️ PROBLÈME IDENTIFIÉ:');
console.log('   Le flux RENT ne gèle PAS les crédits avant l\'achat!');
console.log('   → buy-sms-activate-rent.ts débit directement la balance');
console.log('   → Sans passer par frozen_balance');
console.log('');
console.log('   💡 DIFFÉRENCE avec ACTIVATION:');
console.log('   - ACTIVATION: freeze → API call → si OK: balance -= price, frozen -= price');
console.log('   - RENT: balance -= price (direct, sans protection)');
console.log('');
console.log('   ⚠️ RISQUE:');
console.log('   Si l\'API rent échoue APRÈS le débit, l\'utilisateur perd ses crédits!');

// ============================================================================
// 3. ANALYSE: 52 transactions pending depuis > 30 min
// ============================================================================
console.log('\n\n' + '='.repeat(70));
console.log('⏰ 3. TRANSACTIONS PENDING > 30 MIN\n');

const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const { data: oldPendingTx } = await supabase
  .from('transactions')
  .select('id, user_id, amount, status, created_at, type, related_activation_id')
  .eq('status', 'pending')
  .lt('created_at', thirtyMinAgo)
  .order('created_at', { ascending: true })
  .limit(10);

console.log('   Échantillon de transactions pending anciennes:\n');
for (const tx of oldPendingTx || []) {
  const ageHours = Math.floor((Date.now() - new Date(tx.created_at).getTime()) / 3600000);
  
  // Vérifier l'activation liée
  let activationStatus = 'N/A';
  if (tx.related_activation_id) {
    const { data: act } = await supabase
      .from('activations')
      .select('status')
      .eq('id', tx.related_activation_id)
      .single();
    activationStatus = act?.status || 'NOT FOUND';
  }
  
  console.log(`   - TX ${tx.id.slice(0,8)}... | ${tx.amount}Ⓐ | ${ageHours}h ago | activation: ${activationStatus}`);
}

// ============================================================================
// 4. ANALYSE: 92 activations sans transaction
// ============================================================================
console.log('\n\n' + '='.repeat(70));
console.log('❌ 4. ACTIVATIONS SANS TRANSACTION (échantillon)\n');

// Récupérer toutes les activations récentes
const { data: recentActs } = await supabase
  .from('activations')
  .select('id, user_id, price, status, created_at, service_code')
  .order('created_at', { ascending: false })
  .limit(100);

// Récupérer toutes les transactions purchase
const { data: allPurchaseTx } = await supabase
  .from('transactions')
  .select('id, related_activation_id')
  .eq('type', 'purchase');

const txActIds = new Set((allPurchaseTx || []).map(t => t.related_activation_id).filter(Boolean));

const orphanActs = (recentActs || []).filter(a => !txActIds.has(a.id));

console.log('   Activations récentes sans transaction:\n');
for (const act of orphanActs.slice(0, 10)) {
  console.log(`   - ${act.status} | ${act.service_code} | ${act.price}Ⓐ | ${act.created_at.slice(0,10)}`);
}

console.log(`\n   Total: ${orphanActs.length} activations sans transaction`);
console.log('\n   💡 CAUSE PROBABLE:');
console.log('   - Anciennes activations créées avant l\'ajout de related_activation_id');
console.log('   - Ou bug où la transaction est créée mais le link échoue');

// ============================================================================
// 5. ANALYSE: 63 transactions purchase sans activation
// ============================================================================
console.log('\n\n' + '='.repeat(70));
console.log('🔗 5. TRANSACTIONS ORPHELINES (sans activation liée)\n');

const { data: orphanTx } = await supabase
  .from('transactions')
  .select('id, user_id, amount, status, created_at, description')
  .eq('type', 'purchase')
  .is('related_activation_id', null)
  .order('created_at', { ascending: false })
  .limit(10);

console.log('   Échantillon:\n');
for (const tx of orphanTx || []) {
  console.log(`   - ${tx.status} | ${tx.amount}Ⓐ | ${tx.created_at.slice(0,10)} | ${tx.description?.slice(0,50)}...`);
}

console.log('\n   💡 CAUSE PROBABLE:');
console.log('   - Transaction créée mais activation a échoué');
console.log('   - Anciennes transactions avant l\'ajout de related_activation_id');

// ============================================================================
// 6. RECOMMANDATIONS
// ============================================================================
console.log('\n\n' + '='.repeat(70));
console.log('🔧 ACTIONS RECOMMANDÉES\n');

console.log('1️⃣ CORRIGER frozen_balance pour buba6c@gmail.com:');
console.log(`   UPDATE users SET frozen_balance = ${totalPending.toFixed(2)} WHERE email = 'buba6c@gmail.com';`);
console.log('');

console.log('2️⃣ AJOUTER frozen_balance au flux RENT (buy-sms-activate-rent.ts):');
console.log('   → Étape 1: Geler les crédits avant l\'API call');
console.log('   → Étape 2: Si API échoue, dégeler');
console.log('   → Étape 3: Si OK, débiter balance et dégeler');
console.log('');

console.log('3️⃣ NETTOYER les transactions pending > 1 jour:');
console.log('   → Vérifier l\'activation liée');
console.log('   → Si activation received/cancelled → marquer tx completed/failed');
console.log('   → Si activation pending expirée → annuler et dégeler');
console.log('');

console.log('4️⃣ Balances incohérentes:');
console.log('   → admin@onesms.test, admin@onesms.com: crédits initiaux sans transaction');
console.log('   → Créer des transactions "initial_balance" pour traçabilité');

console.log('\n✅ Analyse terminée!\n');
