import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const { data } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_active, config')
  .eq('provider_code', 'moneroo')
  .single();

console.log('🔍 Configuration Moneroo:\n');
console.log('Provider:', data.provider_name);
console.log('Active:', data.is_active ? '✅' : '❌');
console.log('Config:', JSON.stringify(data.config, null, 2));

if (data.config?.test_mode === true) {
  console.log('\n✅ Mode SANDBOX activé - Paiements de test uniquement');
} else {
  console.log('\n⚠️ Mode PRODUCTION - Paiements réels');
}
