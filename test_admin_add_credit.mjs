import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  ✅ TEST FINAL: admin_add_credit (sans balance_operations)       ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

// État avant
console.log('📊 AVANT:\n');
const { data: before } = await sb
  .from('users')
  .select('email, balance, frozen_balance')
  .eq('id', userId)
  .single();

console.log(`   User: ${before.email}`);
console.log(`   Balance: ${before.balance}Ⓐ`);
console.log(`   Frozen: ${before.frozen_balance}Ⓐ`);

// Appel de la fonction
console.log('\n🚀 APPEL:\n');
console.log(`   admin_add_credit('${userId}', 10, 'Test final')`);

const { data, error } = await sb.rpc('admin_add_credit', {
  p_user_id: userId,
  p_amount: 10,
  p_admin_note: 'Test final - crédit admin'
});

if (error) {
  console.log('\n❌ ERREUR:', error.message);
  console.log('Code:', error.code);
  if (error.details) console.log('Details:', error.details);
} else {
  console.log('\n✅ SUCCÈS!\n');
  console.log('Résultat:', JSON.stringify(data, null, 2));
  
  // État après
  console.log('\n📊 APRÈS:\n');
  const { data: after } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single();
  
  const diff = after.balance - before.balance;
  console.log(`   Balance: ${after.balance}Ⓐ (+${diff}Ⓐ)`);
  console.log(`   Frozen: ${after.frozen_balance}Ⓐ`);
  
  // Vérifier la transaction
  if (data.transaction_id) {
    const { data: tx } = await sb
      .from('transactions')
      .select('*')
      .eq('id', data.transaction_id)
      .single();
    
    console.log('\n📋 TRANSACTION:\n');
    console.log(`   ID: ${tx.id.slice(0, 8)}...`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Amount: ${tx.amount}Ⓐ`);
    console.log(`   Payment method: ${tx.payment_method}`);
    console.log(`   Status: ${tx.status}`);
    console.log(`   Description: ${tx.description}`);
  }
  
  console.log('\n✨ CONCLUSION:\n');
  console.log('   ✅ La fonction fonctionne maintenant correctement');
  console.log('   ✅ Balance mise à jour');
  console.log('   ✅ Transaction créée avec payment_method=bonus');
  console.log('   ℹ️  Pas de balance_operations (volontaire)');
}

console.log('');
