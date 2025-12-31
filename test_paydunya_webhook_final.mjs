import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMzMDY4NywiZXhwIjoyMDQ2OTA2Njg3fQ.GhFJVNhAs_tOs6hODGeVzMxXBYpHgll2r97XWWZCLUE'
)

async function testWebhook() {
  // 1. Get the pending PayDunya transaction
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', '9721ebd3-8110-4b9d-8e2a-5d527a96cdcc')
    .single()
  
  if (error) {
    console.error('❌ Transaction not found:', error)
    return
  }
  
  console.log('📄 Transaction found:')
  console.log('   ID:', tx.id)
  console.log('   Status:', tx.status)
  console.log('   User:', tx.user_id)
  console.log('   Amount:', tx.amount, 'XOF')
  console.log('   Activations:', tx.metadata?.activations)
  console.log('   Token:', tx.metadata?.paydunya_token)
  
  // 2. Get user current balance
  const { data: userBefore } = await supabase
    .from('users')
    .select('email, balance')
    .eq('id', tx.user_id)
    .single()
  
  console.log('\n👤 User before:')
  console.log('   Email:', userBefore?.email)
  console.log('   Balance:', userBefore?.balance)
  
  // 3. Call webhook
  console.log('\n🔄 Calling PayDunya webhook...')
  
  const webhookData = {
    invoice: {
      token: tx.metadata?.paydunya_token || tx.reference,
      status: 'completed'
    },
    data: {
      transaction_id: tx.id
    }
  }
  
  const response = await fetch(
    'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paydunya-webhook',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    }
  )
  
  const result = await response.text()
  console.log('📬 Response:', response.status)
  console.log('📄 Result:', result)
  
  // 4. Get user balance after
  const { data: userAfter } = await supabase
    .from('users')
    .select('email, balance')
    .eq('id', tx.user_id)
    .single()
  
  console.log('\n👤 User after:')
  console.log('   Email:', userAfter?.email)
  console.log('   Balance:', userAfter?.balance)
  
  // 5. Get updated transaction
  const { data: txAfter } = await supabase
    .from('transactions')
    .select('status, metadata')
    .eq('id', tx.id)
    .single()
  
  console.log('\n📄 Transaction after:')
  console.log('   Status:', txAfter?.status)
  
  if (userAfter?.balance > userBefore?.balance) {
    console.log('\n✅ SUCCESS! Balance credited!')
  } else {
    console.log('\n❌ Balance not updated')
  }
}

testWebhook()
