import { createClient } from '@supabase/supabase-js';

// Supabase Cloud configuration
const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Activating Moneroo on Supabase Cloud...\n');

// Check if Moneroo already exists
const { data: existing, error: checkError } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'moneroo')
  .single();

if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
  console.error('❌ Error checking existing:', checkError.message);
  process.exit(1);
}

if (existing) {
  console.log('⚠️  Moneroo already exists, updating...');
  
  const { error: updateError } = await supabase
    .from('payment_providers')
    .update({
      is_enabled: true,
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('provider_code', 'moneroo');
    
  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    process.exit(1);
  } else {
    console.log('✅ Moneroo updated and activated!');
  }
} else {
  console.log('📝 Creating new Moneroo entry...');
  
  const { data: inserted, error: insertError } = await supabase
    .from('payment_providers')
    .insert({
      provider_code: 'moneroo',
      provider_name: 'Moneroo',
      provider_type: 'mobile_money',
      is_enabled: true,
      is_active: true,
      is_default: false,
      priority: 3,
      logo_url: 'https://moneroo.io/logo.png',
      description: 'Paiements mobiles multi-pays (Orange Money, Wave, MTN, Moov, M-Pesa)',
      config: {
        api_url: 'https://api.moneroo.io/v1',
        test_mode: true,
        supported_methods: [
          'orange_money_sn', 'wave_sn', 'free_money_sn',
          'mtn_bj', 'moov_bj',
          'mtn_ci', 'moov_ci', 'orange_money_ci', 'wave_ci',
          'mpesa_ke',
          'mtn_cm', 'orange_money_cm'
        ]
      },
      supported_methods: [
        'orange_money_sn', 'wave_sn', 'free_money_sn',
        'mtn_bj', 'moov_bj',
        'mtn_ci', 'moov_ci', 'orange_money_ci', 'wave_ci',
        'mpesa_ke',
        'mtn_cm', 'orange_money_cm'
      ],
      supported_currencies: ['XOF', 'XAF', 'NGN', 'GHS', 'KES'],
      supported_countries: ['SN', 'CI', 'BJ', 'TG', 'BF', 'ML', 'NE', 'CM', 'KE', 'GH', 'NG'],
      min_amount: 100,
      max_amount: 5000000,
      processing_time: '1-5 minutes',
      fees_type: 'percentage',
      fees_percentage: 0
    })
    .select()
    .single();
    
  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.error('Details:', insertError);
    process.exit(1);
  } else {
    console.log('✅ Moneroo created successfully!');
  }
}

// Verify final status
const { data: final, error: finalError } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_enabled, is_active, priority')
  .eq('provider_code', 'moneroo')
  .single();

if (finalError) {
  console.error('❌ Verification failed:', finalError.message);
} else {
  console.log('\n✅ MONEROO STATUS:');
  console.log(final);
}

// Get all providers
const { data: allProviders } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_active, is_enabled, priority')
  .order('priority', { ascending: true });

console.log('\n📊 ALL PAYMENT PROVIDERS:');
allProviders?.forEach(p => {
  const status = p.is_enabled && p.is_active ? '✅' : '❌';
  console.log(`${status} ${p.provider_code} (${p.provider_name}) - Priority: ${p.priority}`);
});

console.log('\n📋 NEXT STEPS:');
console.log('1. ✅ Database configured on Supabase Cloud');
console.log('2. ✅ Frontend updated (TopUpPage.tsx)');
console.log('3. ⏳ Configure webhook in Moneroo dashboard:');
console.log('   URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook');
console.log('4. ⏳ Test payment flow in sandbox mode');
console.log('5. ⏳ Deploy frontend: npm run build && netlify deploy --prod');
