import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function check() {
  // Voir les transactions type deposit ou recharge
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .in('type', ['deposit', 'recharge'])
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Transactions deposit/recharge:');
  if (error) {
    console.error('Erreur:', error);
  } else if (!txs || txs.length === 0) {
    console.log('Aucune trouvée');
  } else {
    txs.forEach(tx => {
      console.log('- ID:', tx.id);
      console.log('  Type:', tx.type, '| Method:', tx.payment_method);
      console.log('  Status:', tx.status, '| Amount:', tx.amount);
      console.log('  External ID:', tx.external_id);
      console.log('  Created:', tx.created_at);
      console.log('');
    });
  }

  // Tester l'insertion
  console.log('\n--- Test insertion ---');
  const testInsert = await supabase
    .from('transactions')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      type: 'deposit',
      amount: 1000,
      currency: 'XOF',
      status: 'pending',
      payment_method: 'moneroo',
      description: 'Test Moneroo'
    })
    .select();
  
  if (testInsert.error) {
    console.log('Erreur insertion:', testInsert.error.message);
    console.log('Details:', testInsert.error);
  } else {
    console.log('Insertion réussie:', testInsert.data);
    // Supprimer le test
    await supabase.from('transactions').delete().eq('id', testInsert.data[0].id);
  }
}

check();
