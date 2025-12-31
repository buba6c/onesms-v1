import { createClient } from '@supabase/supabase-js';

// Use the correct anon key from .env
const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

console.log('🔍 Testing payment providers API (same as frontend)...\n');

const { data, error } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('is_active', true)
  .order('priority', { ascending: true });

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Active providers returned by API:');
  data.forEach(p => {
    console.log(`  - ${p.provider_code} (${p.provider_name}) - Priority ${p.priority}`);
  });
  console.log(`\nTotal: ${data.length} providers`);
  
  const hasMoneroo = data.find(p => p.provider_code === 'moneroo');
  if (hasMoneroo) {
    console.log('\n✅ MONEROO IS VISIBLE via API!');
    console.log('Frontend should see it after cache expires (60s) or hard refresh.');
  } else {
    console.log('\n❌ MONEROO NOT RETURNED - Check RLS policies!');
  }
}
