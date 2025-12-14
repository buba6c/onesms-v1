import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertWaveProvider() {
  console.log('🌊 Insertion du provider Wave...\n');

  try {
    // Insérer Wave
    const { data, error } = await supabase
      .from('payment_providers')
      .upsert({
        provider_code: 'wave',
        provider_name: 'Wave',
        is_active: false,
        is_default: false,
        priority: 4,
        config: {
          payment_link_template: 'https://pay.wave.com/m/M_2wPEpxMumWXY/c/sn/?amount={amount}',
          merchant_id: 'M_2wPEpxMumWXY',
          country_code: 'sn',
          currency: 'XOF'
        },
        supported_methods: ['wave'],
        description: 'Paiement direct via lien Wave - Redirection instantanée',
        logo_url: 'https://www.wave.com/en/wp-content/themes/wave/img/logo.svg'
      }, {
        onConflict: 'provider_code'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur:', error.message);
      process.exit(1);
    }

    console.log('✅ Wave inséré avec succès!');
    console.log('\n📋 Configuration:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n💡 Prochaine étape:');
    console.log('   node configure_wave_provider.mjs  # Pour activer Wave');
    console.log('   OU');
    console.log('   Allez sur /admin/payment-providers et activez Wave manuellement');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

insertWaveProvider();
