import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY
);

// Get all providers
const { data: providers, error } = await supabase
  .from('payment_providers')
  .select('*')
  .order('priority', { ascending: true });

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log('📊 Current payment providers:');
  providers.forEach(p => {
    console.log(`\n${p.provider_code} (${p.provider_name})`);
    console.log(`  Active: ${p.is_active ? '✅' : '❌'}`);
    console.log(`  Enabled: ${p.is_enabled ? '✅' : '❌'}`);
    console.log(`  Priority: ${p.priority}`);
  });
  console.log(`\nTotal: ${providers.length} providers`);
}
