console.log('🔍 ANALYSE DEEP: MoneyFusion (✅ Fonctionne) vs PayDunya (❌ Ne crédite pas)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n📊 DIFFÉRENCES CRITIQUES IDENTIFIÉES:');

console.log('\n1️⃣ VÉRIFICATION STATUT EXTERNE:');
console.log('   ✅ MONEYFUSION:');
console.log('      • Appelle fetchPaymentStatus() avant de créditer');
console.log('      • Vérifie statut === "paid" sur API externe');
console.log('      • Ne crédite QUE si confirmé par source de vérité');
console.log('      • Code: const paid = remoteStatus === "paid"');
console.log('');
console.log('   ❌ PAYDUNYA:');
console.log('      • Ne vérifie PAS le statut via API externe');
console.log('      • Se fie uniquement au webhook reçu');
console.log('      • Pas d\'appel confirm API PayDunya');
console.log('      • PROBLÈME: Crédite sans double vérification');

console.log('\n2️⃣ GESTION IDEMPOTENCE:');
console.log('   ✅ MONEYFUSION:');
console.log('      • Vérifie alreadyCredited() via balance_operations');
console.log('      • Check: relation related_transaction_id');
console.log('      • Évite double crédit même si webhook rejoué');
console.log('');
console.log('   ⚠️  PAYDUNYA:');
console.log('      • Check status === "completed" uniquement');
console.log('      • Pas de vérification balance_operations');
console.log('      • Risque: double crédit si status pas updaté');

console.log('\n3️⃣ FONCTION RPC CRÉDIT:');
console.log('   ✅ MONEYFUSION:');
console.log('      • Utilise: secure_moneyfusion_credit_v2');
console.log('      • Parameters: p_transaction_id, p_token, p_reference');
console.log('      • SECURITY DEFINER: Bypass RLS');
console.log('      • Idempotent: Vérifie balance_operations');
console.log('');
console.log('   ❌ PAYDUNYA:');
console.log('      • Utilise: secure_moneyfusion_credit_v2 (MÊME)');
console.log('      • MAIS: Pas adapté pour PayDunya!');
console.log('      • Fonction conçue pour MoneyFusion');
console.log('      • SOLUTION: Créer secure_paydunya_credit ou adapter');

console.log('\n4️⃣ EXTRACTION METADATA:');
console.log('   ✅ MONEYFUSION:');
console.log('      • tx.metadata?.activations (set lors init)');
console.log('      • Vérifie: if (creditsToAdd === 0) → error log');
console.log('      • Source: package sélectionné lors création');
console.log('');
console.log('   ⚠️  PAYDUNYA:');
console.log('      • tx.metadata?.activations (set lors init)');
console.log('      • Check identique MAIS...');
console.log('      • Vérifie que metadata correctement rempli');

console.log('\n5️⃣ UPDATE TRANSACTION:');
console.log('   ✅ MONEYFUSION:');
console.log('      • Update avec balance_before, balance_after');
console.log('      • Metadata: moneyfusion_status, completed_at');
console.log('      • Status: completed AVANT appel RPC');
console.log('');
console.log('   ⚠️  PAYDUNYA:');
console.log('      • Update metadata uniquement');
console.log('      • Pas de balance_before/after');
console.log('      • Status: completed via RPC?');

console.log('\n6️⃣ GESTION ERREURS:');
console.log('   ✅ MONEYFUSION:');
console.log('      • Si RPC échoue → status: "pending_credit_error"');
console.log('      • Metadata: error + error_detail');
console.log('      • Permet diagnostic et retry manuel');
console.log('');
console.log('   ⚠️  PAYDUNYA:');
console.log('      • Si RPC échoue → status: "pending_credit_error"');
console.log('      • MAIS peut-être pas d\'erreur visible');
console.log('      • Vérifier que throw Error remonte');

console.log('\n🎯 PROBLÈME PRINCIPAL IDENTIFIÉ:');
console.log('   🚨 PAYDUNYA NE VÉRIFIE PAS LE STATUT VIA API!');
console.log('');
console.log('   MoneyFusion fait:');
console.log('   1. Reçoit webhook');
console.log('   2. Appelle fetchPaymentStatus(token)');
console.log('   3. Vérifie remoteStatus === "paid"');
console.log('   4. SEULEMENT ALORS crédite');
console.log('');
console.log('   PayDunya fait:');
console.log('   1. Reçoit webhook');
console.log('   2. ❌ PAS de vérification externe');
console.log('   3. Crédite directement');
console.log('   4. RÉSULTAT: Peut créditer sans paiement confirmé');

console.log('\n✅ SOLUTIONS RECOMMANDÉES:');

console.log('\n💡 SOLUTION #1: AJOUTER VÉRIFICATION API PAYDUNYA');
console.log('   📝 Code à ajouter dans paydunya-webhook:');

const verificationCode = `// Vérifier le statut via API PayDunya
async function fetchPaydunyaStatus(token) {
  const response = await fetch(
    \`https://app.paydunya.com/api/v1/checkout-invoice/confirm/\${token}\`,
    {
      method: 'GET',
      headers: {
        'PAYDUNYA-MASTER-KEY': 'NRimGfVs-w3HH-U396-4KyR-AXNV5vmF0uEW',
        'PAYDUNYA-PRIVATE-KEY': 'live_private_MptaDaAADwpfmUi5rIhi2tP5wFc',
        'PAYDUNYA-TOKEN': 'igh8jsikXdOst2oY85NT',
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(\`PayDunya API error \${response.status}\`);
  }
  
  return await response.json();
}

// Dans le case 'completed':
const statusData = await fetchPaydunyaStatus(token);
const paid = statusData.response_code === '00' && statusData.invoice?.status === 'completed';

if (!paid) {
  console.warn('⚠️ Payment not confirmed by PayDunya API');
  return; // Ne pas créditer
}`;

console.log(verificationCode);

console.log('\n💡 SOLUTION #2: FONCTION alreadyCredited()');
console.log('   📝 Ajouter dans paydunya-webhook (copier de moneyfusion):');

const alreadyCreditedCode = `async function alreadyCredited(supabase, txId) {
  const { data, error } = await supabase
    .from('balance_operations')
    .select('id')
    .eq('related_transaction_id', txId)
    .eq('operation_type', 'credit_admin')
    .limit(1);

  if (error) {
    console.error('⚠️ balance_operations check failed:', error.message);
    return false;
  }

  return !!(data && data.length > 0);
}

// Utilisation avant crédit:
const credited = await alreadyCredited(supabase, transaction.id);
if (transaction.status === 'completed' || credited) {
  console.log('Already processed');
  return;
}`;

console.log(alreadyCreditedCode);

console.log('\n💡 SOLUTION #3: CRÉER FONCTION RPC DÉDIÉE');
console.log('   📝 Créer: secure_paydunya_credit_v2.sql');
console.log('   • Basée sur secure_moneyfusion_credit_v2');
console.log('   • Adaptée pour PayDunya (metadata différent)');
console.log('   • Même logique idempotente');

console.log('\n💡 SOLUTION #4: UPDATE COMPLET TRANSACTION');
console.log('   📝 Avant appel RPC:');

const updateCode = `// Get current balance
const { data: userProfile } = await supabase
  .from('users')
  .select('balance')
  .eq('id', transaction.user_id)
  .single();

const currentBalance = userProfile?.balance || 0;
const creditsToAdd = transaction.metadata?.activations || 0;
const newBalance = currentBalance + creditsToAdd;

// Update transaction avec balance tracking
await supabase
  .from('transactions')
  .update({
    status: 'completed',
    balance_before: currentBalance,
    balance_after: newBalance,
    metadata: {
      ...transaction.metadata,
      paydunya_status: 'completed',
      completed_at: new Date().toISOString()
    }
  })
  .eq('id', transaction.id);`;

console.log(updateCode);

console.log('\n🚀 PLAN D\'ACTION IMMÉDIAT:');
console.log('   1. ✅ Ajouter fetchPaydunyaStatus() dans webhook');
console.log('   2. ✅ Ajouter alreadyCredited() dans webhook');
console.log('   3. ✅ Vérifier statut API avant crédit');
console.log('   4. ✅ Améliorer update transaction');
console.log('   5. ✅ Tester avec nouveau paiement');
console.log('   6. ✅ Vérifier crédit accordé');

console.log('\n🔧 MODIFICATION PRIORITAIRE:');
console.log('   📄 Fichier: supabase/functions/paydunya-webhook/index.ts');
console.log('   🎯 Ligne: ~100-150 (case completed)');
console.log('   💡 Ajouter: Vérification API AVANT crédit');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
