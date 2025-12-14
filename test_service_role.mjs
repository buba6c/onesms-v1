import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

async function test() {
  console.log('🔍 Test avec SUPABASE_SERVICE_ROLE_KEY_LOCAL...');
  console.log('URL:', process.env.VITE_SUPABASE_URL);
  console.log('Key présente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL);

  // 1. Read test
  console.log('\n📖 Test lecture...');
  const { data: txs, error: readErr } = await supabase
    .from('transactions')
    .select('*')
    .limit(5);
  
  if (readErr) {
    console.log('❌ Lecture:', readErr.message);
  } else {
    console.log('✅ Lecture OK. Transactions:', txs.length);
    if (txs.length > 0) {
      console.log('   Dernière:', txs[0]);
    }
  }

  // 2. Insert test
  console.log('\n✏️ Test insertion...');
  const testRef = 'TEST_SERVICE_ROLE_' + Date.now();
  const { data: inserted, error: insertErr } = await supabase
    .from('transactions')
    .insert({
      user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824',
      type: 'deposit',
      amount: 1,
      balance_before: 36,
      balance_after: 37,
      status: 'test',
      reference: testRef,
      description: 'Test service_role bypass RLS',
      metadata: { test: true }
    })
    .select()
    .single();

  if (insertErr) {
    console.log('❌ Insertion échouée:', insertErr.code, insertErr.message);
    console.log('   Details:', insertErr);
  } else {
    console.log('✅ Insertion réussie! ID:', inserted.id);
    
    // Cleanup
    await supabase.from('transactions').delete().eq('id', inserted.id);
    console.log('   (Transaction test supprimée)');
  }
}

test().catch(e => console.error('Error:', e.message));
