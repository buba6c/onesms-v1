const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

async function testPaydunyaFlow() {
  console.log('=== TEST PAYDUNYA COMPLET ===\n');
  
  // 1. Get any user for testing
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email, balance')
    .limit(3);
  
  if (usersErr || !users || users.length === 0) {
    console.log('No users found!', usersErr);
    return;
  }
  
  console.log('Users found:', users.length);
  users.forEach(u => console.log('-', u.email, 'balance:', u.balance));
  
  const user = users[0];
  const balanceBefore = user.balance || 0;
  console.log('\n👤 Using:', user.email, 'Balance before:', balanceBefore);
  
  // 2. Create PayDunya payment
  console.log('\n🔄 Creating PayDunya payment for 5 activations (2500 XOF)...');
  
  try {
    const response = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-create-payment', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
      },
      body: JSON.stringify({
        userId: user.id,
        activations: 5,
        amount: 2500,
        email: user.email
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (!result.transactionId) {
      console.log('❌ No transaction created');
      return;
    }
    
    // 3. Get the created transaction
    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', result.transactionId)
      .single();
    
    console.log('\n📄 Transaction created:');
    console.log('  ID:', tx.id);
    console.log('  Status:', tx.status);
    console.log('  Provider:', tx.provider);
    console.log('  Amount:', tx.amount, 'XOF');
    console.log('  Activations:', tx.metadata?.activations);
    console.log('  PayDunya Token:', tx.metadata?.paydunya_token);
    
    // 4. Simulate webhook call (as if PayDunya confirmed payment)
    console.log('\n🔄 Simulating PayDunya webhook (payment completed)...');
    
    const webhookPayload = {
      invoice: {
        token: tx.metadata?.paydunya_token || tx.reference,
        status: 'completed'
      },
      custom_data: {
        transaction_id: tx.id
      }
    };
    
    const webhookResponse = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    
    const webhookResult = await webhookResponse.text();
    console.log('Webhook status:', webhookResponse.status);
    console.log('Webhook result:', webhookResult);
    
    // 5. Check user balance after
    const { data: userAfter } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();
    
    const balanceAfter = userAfter?.balance || 0;
    console.log('\n👤 User balance after:', balanceAfter);
    
    // 6. Check transaction status after
    const { data: txAfter } = await supabase
      .from('transactions')
      .select('status, metadata')
      .eq('id', tx.id)
      .single();
    
    console.log('📄 Transaction status after:', txAfter?.status);
    
    // 7. Verdict
    if (balanceAfter > balanceBefore) {
      console.log('\n✅ SUCCESS! Balance credited: +' + (balanceAfter - balanceBefore) + ' activations');
    } else {
      console.log('\n❌ FAILED: Balance not updated');
      console.log('   Expected:', balanceBefore + 5);
      console.log('   Got:', balanceAfter);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testPaydunyaFlow();
