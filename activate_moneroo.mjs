import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

// Use Supabase Cloud
const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Activating Moneroo integration...\n');

// Check if Moneroo already exists
const { data: existing } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('provider_code', 'moneroo')
  .single();

if (existing) {
  console.log('⚠️  Moneroo already exists in payment_providers');
  console.log('Current status:', {
    is_enabled: existing.is_enabled,
    is_active: existing.is_active,
    priority: existing.priority
  });
  
  // Update to activate
  const { error: updateError } = await supabase
    .from('payment_providers')
    .update({
      is_enabled: true,
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('provider_code', 'moneroo');
    
  if (updateError) {
    console.error('❌ Failed to update:', updateError.message);
  } else {
    console.log('✅ Moneroo activated successfully!');
  }
} else {
  console.log('📝 Moneroo not found, creating entry...');
  
  // Insert new Moneroo provider
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
    console.error('❌ Failed to insert:', insertError.message);
    process.exit(1);
  } else {
    console.log('✅ Moneroo created successfully!');
    console.log(inserted);
  }
}

// Verify final status
const { data: final } = await supabase
  .from('payment_providers')
  .select('provider_code, provider_name, is_enabled, is_active, priority')
  .eq('provider_code', 'moneroo')
  .single();

console.log('\n✅ FINAL STATUS:');
console.log(final);

console.log('\n📋 NEXT STEPS:');
console.log('1. ✅ Database configured');
console.log('2. ⏳ Update TopUpPage.tsx to add Moneroo case');
console.log('3. ⏳ Configure webhook in Moneroo dashboard:');
console.log('   URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook');
console.log('4. ⏳ Test payment flow');
