#!/bin/bash

echo "⏳ Test auto-refund en cours..."
echo "   Activation expire dans ~30 secondes"
echo "   Cron va la traiter dans max 2 minutes"
echo ""

for i in {1..6}; do
  echo "   ⏱️  Attente... $(( (6-i+1) * 30 ))s restantes"
  sleep 30
done

echo ""
echo "✅ 3 minutes écoulées! Vérification..."
echo ""

# Vérifier le résultat
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

(async()=>{
  console.log('🔍 RÉSULTAT DU TEST:\n');
  
  const {data:a} = await sb.from('activations').select('*').eq('id','8f6fc29b-feea-4593-ad64-7b7779d7d382').single();
  const {data:ops} = await sb.from('balance_operations').select('operation_type,amount,created_at').eq('activation_id','8f6fc29b-feea-4593-ad64-7b7779d7d382').order('created_at');
  const {data:u} = await sb.from('users').select('balance,frozen_balance').eq('id','e108c02a-2012-4043-bbc2-fb09bb11f824').single();
  
  console.log('📱 ACTIVATION:');
  console.log('   Status:', a?.status);
  console.log('   frozen_amount:', a?.frozen_amount + 'Ⓐ');
  console.log('   Updated:', new Date(a?.updated_at).toLocaleTimeString());
  
  console.log('\n💰 BALANCE OPERATIONS:');
  ops?.forEach(op => {
    const time = new Date(op.created_at).toLocaleTimeString();
    console.log('   [' + time + '] ' + op.operation_type.toUpperCase() + ' | ' + op.amount + 'Ⓐ');
  });
  
  console.log('\n👤 USER (buba6c@gmail.com):');
  console.log('   Balance:', u?.balance + 'Ⓐ');
  console.log('   Frozen:', u?.frozen_balance + 'Ⓐ');
  
  const hasFreeze = ops?.some(op => op.operation_type === 'freeze');
  const hasRefund = ops?.some(op => op.operation_type === 'refund');
  
  console.log('\n🎯 RÉSULTAT:');
  if (a?.status === 'timeout' && a?.frozen_amount === 0 && hasFreeze && hasRefund) {
    console.log('   ✅ SUCCÈS! Auto-refund fonctionne parfaitement');
    console.log('   ✅ Status: timeout');
    console.log('   ✅ frozen_amount: 0');
    console.log('   ✅ Balance ops: freeze + refund');
  } else if (a?.status === 'timeout' && a?.frozen_amount === 0 && hasFreeze && !hasRefund) {
    console.log('   ❌ ÉCHEC: Status timeout mais pas de refund');
  } else {
    console.log('   ⚠️  En cours... Cron pas encore passé?');
  }
})().catch(console.error);
"