import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

// Use Supabase Cloud for checking (since local .env doesn't have service key)
const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking Moneroo integration status...\n');

// Check payment_providers table
const { data: provider } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'moneroo')
  .single();

console.log('📊 DATABASE STATUS:');
if (provider) {
  console.log('✅ Moneroo in payment_providers:', {
    name: provider.provider_name,
    enabled: provider.is_enabled ? '✅' : '❌',
    active: provider.is_active ? '✅' : '❌',
    priority: provider.priority
  });
} else {
  console.log('❌ Moneroo NOT in payment_providers');
}

// Check for Moneroo transactions
const { data: txs, count } = await supabase
  .from('transactions')
  .select('*', { count: 'exact', head: true })
  .eq('payment_method', 'moneroo');

console.log('\n💳 TRANSACTIONS:');
console.log(`Total: ${count || 0} Moneroo transactions`);

console.log('\n🔐 ENVIRONMENT:');
console.log('MONEROO_SECRET_KEY:', process.env.MONEROO_SECRET_KEY ? '✅ SET' : '❌ NOT SET');
console.log('VITE_MONEROO_PUBLIC_KEY:', process.env.VITE_MONEROO_PUBLIC_KEY ? '✅ SET' : '❌ NOT SET');
