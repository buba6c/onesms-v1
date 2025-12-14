import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrjxxrflsguipovuulwd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yanhocmZsc2d1aXBvdnV1bHdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjU2MTc2OCwiZXhwIjoyMDYyMTM3NzY4fQ.8HbF-eRe3GBcPVgbw_WcdxUQy2Tnvg9SzDC4gU7vE4Q';
const supabase = createClient(supabaseUrl, serviceKey);

async function debug() {
  console.log('🔍 DEBUG: Analyse des activations récentes\n');
  
  // 1. Get recent activations
  const { data: activations, error } = await supabase
    .from('activations')
    .select('id, order_id, service_code, status, price, frozen_amount, user_id, created_at, cancelled_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('📋 ACTIVATIONS RÉCENTES:');
  console.log('─'.repeat(80));
  activations.forEach(a => {
    console.log(`${a.status.padEnd(10)} | ${a.service_code.padEnd(5)} | price:${a.price} | frozen_amount:${a.frozen_amount || 0} | ${a.id.slice(0,8)} | ${a.created_at}`);
  });
  
  // 2. Get user balance
  if (activations.length > 0) {
    const userId = activations[0].user_id;
    const { data: user } = await supabase
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single();
      
    console.log('\n👤 UTILISATEUR:');
    console.log(`   Balance: ${user?.balance}`);
    console.log(`   Frozen: ${user?.frozen_balance}`);
    
    // 3. Check pending activations for this user
    const { data: pending } = await supabase
      .from('activations')
      .select('id, service_code, price, frozen_amount, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'waiting']);
      
    console.log('\n📍 ACTIVATIONS EN COURS (pending/waiting):');
    if (pending?.length === 0) {
      console.log('   Aucune');
    } else {
      let totalFrozenExpected = 0;
      pending?.forEach(p => {
        const fa = p.frozen_amount || 0;
        totalFrozenExpected += fa;
        console.log(`   ${p.service_code}: price=${p.price}, frozen_amount=${fa} (${p.id.slice(0,8)})`);
      });
      console.log(`\n   ➡️ Total frozen_amount attendu: ${totalFrozenExpected}`);
      console.log(`   ➡️ Frozen_balance actuel: ${user?.frozen_balance}`);
      
      if (Math.abs(totalFrozenExpected - (user?.frozen_balance || 0)) > 0.01) {
        console.log('   ❌ INCOHÉRENCE DÉTECTÉE!');
      } else {
        console.log('   ✅ Cohérent');
      }
    }
    
    // 4. Check cancelled activations in last hour
    const oneHourAgo = new Date(Date.now() - 60*60*1000).toISOString();
    const { data: cancelled } = await supabase
      .from('activations')
      .select('id, service_code, price, frozen_amount, status, cancelled_at')
      .eq('user_id', userId)
      .eq('status', 'cancelled')
      .gte('cancelled_at', oneHourAgo);
      
    console.log('\n❌ ANNULATIONS RÉCENTES (dernière heure):');
    if (cancelled?.length === 0) {
      console.log('   Aucune');
    } else {
      cancelled?.forEach(c => {
        console.log(`   ${c.service_code}: price=${c.price}, frozen_amount=${c.frozen_amount} | ${c.cancelled_at}`);
      });
    }
  }
  
  // 5. Check balance_operations if exists
  console.log('\n📊 BALANCE OPERATIONS (si table existe):');
  const { data: ops, error: opsError } = await supabase
    .from('balance_operations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (opsError) {
    console.log('   Table non disponible ou erreur:', opsError.message);
  } else if (ops?.length === 0) {
    console.log('   Aucune opération enregistrée');
  } else {
    ops.forEach(op => {
      console.log(`   ${op.operation_type}: amount=${op.amount}, balance:${op.balance_before}→${op.balance_after}, frozen:${op.frozen_before}→${op.frozen_after}`);
    });
  }
}

debug().catch(console.error);
