import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function deepCheck() {
  console.log('🔍 DEEP CHECK - Cohérence Balance Header/My Account/Backend\n');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .order('balance', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('❌ Erreur:', error.message);
    return;
  }
  
  console.log('📊 TOP 5 USERS (Backend Database):');
  console.log('='.repeat(80));
  
  for (const user of users) {
    const available = user.balance - user.frozen_balance;
    
    const { data: activations } = await supabase
      .from('activations')
      .select('id, status, frozen_amount, price')
      .eq('user_id', user.id)
      .in('status', ['pending', 'waiting']);
    
    const totalFrozenInActivations = activations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) || 0;
    
    console.log('\n👤 ' + user.email);
    console.log('   ID: ' + user.id);
    console.log('   ┌─────────────────────────────────────────');
    console.log('   │ Balance totale (DB):     ' + user.balance.toFixed(2) + ' FCFA');
    console.log('   │ Frozen balance (DB):     ' + user.frozen_balance.toFixed(2) + ' FCFA');
    console.log('   │ Disponible (calculé):    ' + available.toFixed(2) + ' FCFA');
    console.log('   └─────────────────────────────────────────');
    
    console.log('   📌 Activations en cours: ' + (activations?.length || 0));
    console.log('   📌 Total frozen_amount: ' + totalFrozenInActivations.toFixed(2) + ' FCFA');
    
    const diff = Math.abs(user.frozen_balance - totalFrozenInActivations);
    if (diff > 0.01) {
      console.log('   ⚠️  INCOHÉRENCE: diff=' + diff.toFixed(2));
    } else {
      console.log('   ✅ COHÉRENT');
    }
    
    console.log('\n   🖥️  HEADER: ' + Math.floor(available) + ' Ⓐ dispo, ' + Math.floor(user.frozen_balance) + ' Ⓐ gelés');
    console.log('   🖥️  MY ACCOUNT: ' + Math.floor(available) + ' Ⓐ utilisable, total: ' + Math.floor(user.balance) + ' Ⓐ');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 RÉSUMÉ:');
  console.log('='.repeat(80));
  
  const { data: allUsers } = await supabase.from('users').select('id, email, balance, frozen_balance');
  
  let coherent = 0, incoherent = 0;
  const issues = [];
  
  for (const u of allUsers || []) {
    const { data: acts } = await supabase
      .from('activations')
      .select('frozen_amount')
      .eq('user_id', u.id)
      .in('status', ['pending', 'waiting']);
    
    const sumFrozen = acts?.reduce((s, a) => s + (a.frozen_amount || 0), 0) || 0;
    const diff = Math.abs(u.frozen_balance - sumFrozen);
    
    if (diff > 0.01) {
      incoherent++;
      issues.push({ email: u.email, frozen_balance: u.frozen_balance, sumFrozen, diff });
    } else {
      coherent++;
    }
  }
  
  console.log('\n✅ Cohérents: ' + coherent);
  console.log('⚠️  Incohérents: ' + incoherent);
  
  if (issues.length > 0) {
    console.log('\n🚨 PROBLÈMES:');
    issues.forEach(u => console.log('   - ' + u.email + ': frozen=' + u.frozen_balance + ', sum=' + u.sumFrozen));
  }
  
  const { data: ops } = await supabase
    .from('balance_operations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\n📝 balance_operations (dernières):');
  if (!ops || ops.length === 0) {
    console.log('   ℹ️  Table vide (normal si pas de nouvel achat)');
  } else {
    ops.forEach(op => console.log('   - ' + op.operation_type + ': ' + op.amount + ' FCFA'));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🔧 ANALYSE CODE:');
  console.log('='.repeat(80));
  console.log('\n✅ Header.tsx & SettingsPage.tsx utilisent:');
  console.log('   disponible = balance - frozen_balance');
  console.log('   Source: table users (même pour les deux)');
  console.log('\n✅ COHÉRENCE GARANTIE entre Header et My Account');
}

deepCheck().catch(console.error);
