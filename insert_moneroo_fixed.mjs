import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🚀 Inserting Moneroo with correct schema...\n');

// Check existing
const { data: existing, error: checkError } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'moneroo')
  .maybeSingle();

if (checkError) {
  console.error('❌ Check error:', checkError);
}

if (existing) {
  console.log('⚠️  Moneroo exists, updating...');
  
  const { error: updateError } = await supabase
    .from('payment_providers')
    .update({
      is_active: true,
      is_default: false,
      priority: 4,
      description: 'Paiements mobiles multi-pays (Orange Money, Wave, MTN, Moov, M-Pesa)',
      supported_methods: [
        'orange_money_sn', 'wave_sn', 'free_money_sn',
        'mtn_bj', 'moov_bj',
        'mtn_ci', 'moov_ci', 'orange_money_ci', 'wave_ci'
      ],
      config: {
        api_url: 'https://api.moneroo.io/v1',
        test_mode: true
      },
      logo_url: 'https://moneroo.io/logo.png',
      updated_at: new Date().toISOString()
    })
    .eq('provider_code', 'moneroo');
    
  if (updateError) {
    console.error('❌ Update failed:', updateError);
  } else {
    console.log('✅ Updated successfully!');
  }
} else {
  console.log('📝 Creating new entry...');
  
  const { data: inserted, error: insertError } = await supabase
    .from('payment_providers')
    .insert({
      provider_code: 'moneroo',
      provider_name: 'Moneroo',
      is_active: true,
      is_default: false,
      priority: 4,
      config: {
        api_url: 'https://api.moneroo.io/v1',
        test_mode: true
      },
      supported_methods: [
        'orange_money_sn', 'wave_sn', 'free_money_sn',
        'mtn_bj', 'moov_bj',
        'mtn_ci', 'moov_ci', 'orange_money_ci', 'wave_ci',
        'mpesa_ke',
        'mtn_cm', 'orange_money_cm'
      ],
      fees_config: {
        type: 'percentage',
        value: 0
      },
      logo_url: 'https://moneroo.io/logo.png',
      description: 'Paiements mobiles multi-pays (Orange Money, Wave, MTN, Moov, M-Pesa)'
    })
    .select()
    .single();
    
  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('Details:', insertError);
  } else {
    console.log('✅ Created successfully!');
    console.log(inserted);
  }
}

// Verify
const { data: allProviders } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_active, is_default, priority')
  .order('priority', { ascending: true });

console.log('\n📊 ALL PROVIDERS:');
allProviders?.forEach(p => {
  const status = p.is_active ? '✅' : '❌';
  const def = p.is_default ? '⭐' : '  ';
  console.log(`${status} ${def} ${p.provider_code.padEnd(15)} ${p.provider_name.padEnd(20)} Priority: ${p.priority}`);
});

console.log('\n✅ DONE! Refresh https://onesms-sn.com/topup to see Moneroo');
