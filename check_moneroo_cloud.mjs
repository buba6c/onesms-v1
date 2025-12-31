import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🔍 Checking Moneroo status on Supabase Cloud...\n');

// Check payment_providers
const { data: provider, error: providerError } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'moneroo')
  .single();

console.log('📊 DATABASE STATUS:');
if (providerError) {
  if (providerError.code === 'PGRST116') {
    console.log('❌ Moneroo NOT in payment_providers');
  } else {
    console.error('❌ Error:', providerError.message);
  }
} else {
  console.log('✅ Moneroo in payment_providers:', {
    name: provider.provider_name,
    enabled: provider.is_enabled ? '✅' : '❌',
    active: provider.is_active ? '✅' : '❌',
    priority: provider.priority
  });
}

// Check transactions
const { count } = await supabase
  .from('transactions')
  .select('*', { count: 'exact', head: true })
  .eq('payment_method', 'moneroo');

console.log('\n💳 TRANSACTIONS:');
console.log(`Total: ${count || 0} Moneroo transactions`);

// Check all providers
const { data: allProviders } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_active, is_enabled, priority')
  .order('priority', { ascending: true });

console.log('\n📊 ALL PROVIDERS:');
allProviders?.forEach(p => {
  const status = p.is_enabled && p.is_active ? '✅' : '❌';
  console.log(`${status} ${p.provider_code.padEnd(12)} ${p.provider_name.padEnd(20)} Priority: ${p.priority}`);
});
