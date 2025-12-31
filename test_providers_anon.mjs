import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🔍 Testing as service_role (bypasses RLS)...\n');

const { data, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('is_active', true)
  .order('priority', { ascending: true });

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Active providers:');
  data.forEach(p => {
    console.log(`  - ${p.provider_code.padEnd(15)} ${p.provider_name.padEnd(20)} Priority ${p.priority}`);
  });
  
  const hasMoneroo = data.find(p => p.provider_code === 'moneroo');
  console.log(hasMoneroo ? '\n✅ Moneroo IS in results' : '\n❌ Moneroo NOT in results');
}
