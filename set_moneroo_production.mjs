import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🚀 Passing Moneroo to PRODUCTION mode...\n');

const { data, error } = await supabase
  .from('payment_providers')
  .update({
    config: {
      api_url: 'https://api.moneroo.io/v1',
      test_mode: false
    }
  })
  .eq('provider_code', 'moneroo')
  .select()
  .single();

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Moneroo updated to PRODUCTION mode!');
  console.log('Config:', data.config);
  console.log('\n⚠️ IMPORTANT:');
  console.log('- Les paiements seront maintenant RÉELS');
  console.log('- Assurez-vous que les clés API de production sont configurées');
  console.log('- Vérifiez que le webhook est configuré en mode production');
}
