import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🔍 AUDIT FINANCIER APPROFONDI - ONE SMS V1\n');
console.log('='.repeat(70) + '\n');

// ============================================================================
// 1. ANALYSE DES FLUX FINANCIERS - ACTIVATION
// ============================================================================
console.log('📱 1. ANALYSE FLUX ACTIVATION\n');

// Récupérer toutes les activations
const { data: activations, error: actErr } = await supabase
  .from('activations')
  .select('id, user_id, price, status, created_at, order_id')
  .order('created_at', { ascending: false })
  .limit(100);

if (actErr) {
  console.error('Erreur activations:', actErr);
}

// Récupérer les transactions liées aux activations
const { data: actTransactions, error: actTxErr } = await supabase
  .from('transactions')
  .select('id, user_id, amount, status, type, related_activation_id, created_at')
  .eq('type', 'purchase')
  .order('created_at', { ascending: false })
  .limit(200);

if (actTxErr) {
  console.error('Erreur transactions activation:', actTxErr);
}

// Vérifications
let activationIssues = [];

// 1.1. Activations sans transaction correspondante
console.log('   1.1 Vérification: Activations SANS transaction correspondante');
for (const act of activations || []) {
  const tx = actTransactions?.find(t => t.related_activation_id === act.id);
  if (!tx) {
    activationIssues.push({
      type: 'ACTIVATION_SANS_TRANSACTION',
      activation_id: act.id,
      user_id: act.user_id,
      price: act.price,
      status: act.status,
      created_at: act.created_at
    });
  }
}
console.log(`       → ${activationIssues.filter(i => i.type === 'ACTIVATION_SANS_TRANSACTION').length} activations sans transaction\n`);

// 1.2. Transactions pending depuis trop longtemps
console.log('   1.2 Vérification: Transactions PENDING depuis > 30 minutes');
const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const oldPendingTx = actTransactions?.filter(t => 
  t.status === 'pending' && t.created_at < thirtyMinAgo
) || [];
console.log(`       → ${oldPendingTx.length} transactions pending anciennes\n`);

// 1.3. Activations reçues mais transaction non completed
console.log('   1.3 Vérification: Activations RECEIVED avec transaction PENDING');
let receivedButPending = 0;
for (const act of (activations || []).filter(a => a.status === 'received')) {
  const tx = actTransactions?.find(t => t.related_activation_id === act.id);
  if (tx && tx.status === 'pending') {
    receivedButPending++;
    activationIssues.push({
      type: 'RECEIVED_MAIS_TX_PENDING',
      activation_id: act.id,
      transaction_id: tx.id,
      price: act.price,
      user_id: act.user_id
    });
  }
}
console.log(`       → ${receivedButPending} incohérences trouvées\n`);

// ============================================================================
// 2. ANALYSE DES FLUX FINANCIERS - RENT
// ============================================================================
console.log('🏠 2. ANALYSE FLUX RENT\n');

// Récupérer tous les rentals
const { data: rentals, error: rentErr } = await supabase
  .from('rentals')
  .select('id, user_id, total_cost, status, created_at, rental_id')
  .order('created_at', { ascending: false })
  .limit(100);

if (rentErr) {
  console.error('Erreur rentals:', rentErr);
}

// Récupérer les transactions liées aux rents
const { data: rentTransactions, error: rentTxErr } = await supabase
  .from('transactions')
  .select('id, user_id, amount, status, type, related_rental_id, created_at')
  .eq('type', 'rental')
  .order('created_at', { ascending: false })
  .limit(200);

if (rentTxErr) {
  console.error('Erreur transactions rent:', rentTxErr);
}

let rentIssues = [];

// 2.1. Rentals sans transaction
console.log('   2.1 Vérification: Rentals SANS transaction correspondante');
for (const rent of rentals || []) {
  const tx = rentTransactions?.find(t => t.related_rental_id === rent.id);
  if (!tx) {
    rentIssues.push({
      type: 'RENT_SANS_TRANSACTION',
      rental_id: rent.id,
      user_id: rent.user_id,
      price: rent.total_cost,
      status: rent.status,
      created_at: rent.created_at
    });
  }
}
console.log(`       → ${rentIssues.filter(i => i.type === 'RENT_SANS_TRANSACTION').length} rentals sans transaction\n`);

// 2.2. Montants incohérents
console.log('   2.2 Vérification: Montants différents entre rental et transaction');
let amountMismatch = 0;
for (const rent of rentals || []) {
  const tx = rentTransactions?.find(t => t.related_rental_id === rent.id);
  if (tx && Math.abs(Math.abs(tx.amount) - rent.total_cost) > 0.01) {
    amountMismatch++;
    rentIssues.push({
      type: 'MONTANT_DIFFERENT',
      rental_id: rent.id,
      rent_price: rent.total_cost,
      tx_amount: tx.amount,
      difference: rent.total_cost - Math.abs(tx.amount)
    });
  }
}
console.log(`       → ${amountMismatch} montants différents\n`);

// ============================================================================
// 3. ANALYSE BALANCE & FROZEN_BALANCE PAR UTILISATEUR
// ============================================================================
console.log('💰 3. ANALYSE BALANCE & FROZEN_BALANCE\n');

const { data: users, error: userErr } = await supabase
  .from('users')
  .select('id, email, balance, frozen_balance')
  .gt('frozen_balance', 0);

if (userErr) {
  console.error('Erreur users:', userErr);
}

console.log(`   Utilisateurs avec frozen_balance > 0: ${users?.length || 0}\n`);

let balanceIssues = [];

for (const user of users || []) {
  // Vérifier si le frozen_balance correspond à des activations pending
  const { data: pendingActs } = await supabase
    .from('activations')
    .select('id, price, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending');

  const totalPendingPrice = (pendingActs || []).reduce((sum, a) => sum + (a.price || 0), 0);
  
  // Si frozen_balance ne match pas les pending activations
  if (Math.abs(user.frozen_balance - totalPendingPrice) > 0.01) {
    balanceIssues.push({
      type: 'FROZEN_MISMATCH',
      user_id: user.id,
      email: user.email,
      frozen_balance: user.frozen_balance,
      total_pending: totalPendingPrice,
      difference: user.frozen_balance - totalPendingPrice,
      pending_activations: (pendingActs || []).length
    });
  }
  
  // Vérifier si frozen > balance (impossible normalement)
  if (user.frozen_balance > user.balance) {
    balanceIssues.push({
      type: 'FROZEN_SUPERIEUR_BALANCE',
      user_id: user.id,
      email: user.email,
      balance: user.balance,
      frozen_balance: user.frozen_balance,
      excess: user.frozen_balance - user.balance
    });
  }
}

console.log(`   Issues frozen_balance: ${balanceIssues.length}\n`);

// ============================================================================
// 4. ANALYSE DES TRANSACTIONS ORPHELINES
// ============================================================================
console.log('🔗 4. ANALYSE TRANSACTIONS ORPHELINES\n');

// Transactions purchase sans activation liée
const { data: orphanPurchases } = await supabase
  .from('transactions')
  .select('id, user_id, amount, status, created_at')
  .eq('type', 'purchase')
  .is('related_activation_id', null);

console.log(`   Transactions 'purchase' sans activation liée: ${orphanPurchases?.length || 0}\n`);

// Transactions rental sans rental lié
const { data: orphanRentals } = await supabase
  .from('transactions')
  .select('id, user_id, amount, status, created_at')
  .eq('type', 'rental')
  .is('related_rental_id', null);

console.log(`   Transactions 'rental' sans rental lié: ${orphanRentals?.length || 0}\n`);

// ============================================================================
// 5. VÉRIFICATION COHÉRENCE BALANCE AVEC TRANSACTIONS
// ============================================================================
console.log('📊 5. VÉRIFICATION COHÉRENCE BALANCE AVEC HISTORIQUE\n');

// Pour quelques utilisateurs actifs, vérifier que balance = somme transactions
const { data: activeUsers } = await supabase
  .from('users')
  .select('id, email, balance')
  .gt('balance', 0)
  .limit(10);

let coherenceIssues = [];

for (const user of activeUsers || []) {
  const { data: userTx } = await supabase
    .from('transactions')
    .select('amount, status')
    .eq('user_id', user.id)
    .eq('status', 'completed');
  
  const calculatedBalance = (userTx || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // On ne vérifie que si la différence est significative
  if (Math.abs(user.balance - calculatedBalance) > 1) {
    coherenceIssues.push({
      user_id: user.id,
      email: user.email,
      current_balance: user.balance,
      calculated_balance: calculatedBalance,
      difference: user.balance - calculatedBalance
    });
  }
}

console.log(`   Utilisateurs avec balance incohérente: ${coherenceIssues.length}\n`);

// ============================================================================
// RAPPORT FINAL
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📋 RAPPORT FINAL - AUDIT FINANCIER');
console.log('='.repeat(70) + '\n');

const totalIssues = activationIssues.length + rentIssues.length + balanceIssues.length + coherenceIssues.length;

console.log(`🔴 TOTAL PROBLÈMES DÉTECTÉS: ${totalIssues}\n`);

if (activationIssues.length > 0) {
  console.log('📱 PROBLÈMES ACTIVATION:');
  for (const issue of activationIssues.slice(0, 10)) {
    console.log(`   - ${issue.type}: activation=${issue.activation_id}, user=${issue.user_id}, price=${issue.price}`);
  }
  if (activationIssues.length > 10) console.log(`   ... et ${activationIssues.length - 10} autres\n`);
  else console.log('');
}

if (rentIssues.length > 0) {
  console.log('🏠 PROBLÈMES RENT:');
  for (const issue of rentIssues.slice(0, 10)) {
    console.log(`   - ${issue.type}: rental=${issue.rental_id}, price=${issue.rent_price || issue.price}`);
  }
  if (rentIssues.length > 10) console.log(`   ... et ${rentIssues.length - 10} autres\n`);
  else console.log('');
}

if (balanceIssues.length > 0) {
  console.log('💰 PROBLÈMES BALANCE/FROZEN:');
  for (const issue of balanceIssues) {
    if (issue.type === 'FROZEN_MISMATCH') {
      console.log(`   - ${issue.email}: frozen=${issue.frozen_balance}, pending_total=${issue.total_pending}, diff=${issue.difference.toFixed(2)}`);
    } else if (issue.type === 'FROZEN_SUPERIEUR_BALANCE') {
      console.log(`   - ${issue.email}: balance=${issue.balance}, frozen=${issue.frozen_balance} ⚠️ CRITIQUE`);
    }
  }
  console.log('');
}

if (coherenceIssues.length > 0) {
  console.log('📊 PROBLÈMES COHÉRENCE BALANCE:');
  for (const issue of coherenceIssues) {
    console.log(`   - ${issue.email}: DB=${issue.current_balance}, calc=${issue.calculated_balance.toFixed(2)}, diff=${issue.difference.toFixed(2)}`);
  }
  console.log('');
}

if (totalIssues === 0) {
  console.log('✅ AUCUN PROBLÈME DÉTECTÉ - Système financier cohérent!\n');
}

// ============================================================================
// 6. RECOMMANDATIONS
// ============================================================================
console.log('='.repeat(70));
console.log('💡 RECOMMANDATIONS');
console.log('='.repeat(70) + '\n');

if (balanceIssues.some(i => i.type === 'FROZEN_MISMATCH')) {
  console.log('🔧 1. FROZEN_BALANCE DÉSYNCHRONISÉ');
  console.log('   → Exécuter un script de correction pour réaligner frozen_balance');
  console.log('   → avec le total des activations pending\n');
}

if (activationIssues.some(i => i.type === 'ACTIVATION_SANS_TRANSACTION')) {
  console.log('🔧 2. ACTIVATIONS SANS TRANSACTION');
  console.log('   → Bug dans buy-sms-activate-number: transaction non créée');
  console.log('   → Ou transaction supprimée manuellement\n');
}

if (activationIssues.some(i => i.type === 'RECEIVED_MAIS_TX_PENDING')) {
  console.log('🔧 3. ACTIVATION REÇUE MAIS TRANSACTION PENDING');
  console.log('   → check-sms-activate-status n\'a pas complété la transaction');
  console.log('   → Balance possiblement débitée sans transaction completed\n');
}

console.log('✅ Audit terminé!\n');
