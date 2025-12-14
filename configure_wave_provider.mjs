import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MANQUANT');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'OK' : 'MANQUANT');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function configureWaveProvider() {
  console.log('🌊 Configuration du provider Wave...\n');

  try {
    // 1. Vérifier si Wave existe
    const { data: existing, error: checkError } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('provider_code', 'wave')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      console.log('✅ Wave existe déjà');
      console.log(`   Statut actuel: ${existing.is_active ? '✅ Activé' : '❌ Désactivé'}`);
      console.log(`   Par défaut: ${existing.is_default ? 'Oui' : 'Non'}`);
      console.log(`   Lien de paiement: ${existing.config?.payment_link_template || 'Non configuré'}\n`);
    } else {
      console.log('⚠️ Wave n\'existe pas encore dans la base\n');
    }

    // 2. Menu d'actions
    console.log('📋 Actions disponibles:');
    console.log('1. Activer Wave');
    console.log('2. Désactiver Wave');
    console.log('3. Définir Wave comme provider par défaut');
    console.log('4. Modifier le lien de paiement');
    console.log('5. Afficher la configuration actuelle');
    console.log('6. Quitter\n');

    // Pour ce script, on va activer Wave automatiquement
    const action = '1'; // Vous pouvez modifier selon besoin

    switch (action) {
      case '1':
        // Activer Wave
        const { error: activateError } = await supabase
          .from('payment_providers')
          .update({ is_active: true })
          .eq('provider_code', 'wave');

        if (activateError) throw activateError;
        console.log('✅ Wave activé avec succès!\n');
        break;

      case '2':
        // Désactiver Wave
        const { error: deactivateError } = await supabase
          .from('payment_providers')
          .update({ is_active: false, is_default: false })
          .eq('provider_code', 'wave');

        if (deactivateError) throw deactivateError;
        console.log('✅ Wave désactivé\n');
        break;

      case '3':
        // Définir comme défaut
        await supabase
          .from('payment_providers')
          .update({ is_default: false })
          .neq('provider_code', 'wave');

        const { error: defaultError } = await supabase
          .from('payment_providers')
          .update({ is_default: true, is_active: true })
          .eq('provider_code', 'wave');

        if (defaultError) throw defaultError;
        console.log('✅ Wave défini comme provider par défaut!\n');
        break;

      case '4':
        // Modifier le lien
        const newLink = 'https://pay.wave.com/m/M_2wPEpxMumWXY/c/sn/?amount={amount}';
        const { error: updateError } = await supabase
          .from('payment_providers')
          .update({
            config: {
              payment_link_template: newLink,
              merchant_id: 'M_2wPEpxMumWXY',
              country_code: 'sn',
              currency: 'XOF'
            }
          })
          .eq('provider_code', 'wave');

        if (updateError) throw updateError;
        console.log('✅ Lien de paiement mis à jour!\n');
        break;
    }

    // 3. Afficher la configuration finale
    const { data: final } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('provider_code', 'wave')
      .single();

    if (final) {
      console.log('📊 Configuration Wave:');
      console.log('─'.repeat(60));
      console.log(`Provider: ${final.provider_name}`);
      console.log(`Code: ${final.provider_code}`);
      console.log(`Statut: ${final.is_active ? '✅ Actif' : '❌ Inactif'}`);
      console.log(`Par défaut: ${final.is_default ? 'Oui ⭐' : 'Non'}`);
      console.log(`Priorité: ${final.priority}`);
      console.log(`\n🔗 Configuration:`);
      console.log(`   Template: ${final.config?.payment_link_template}`);
      console.log(`   Merchant ID: ${final.config?.merchant_id}`);
      console.log(`   Pays: ${final.config?.country_code}`);
      console.log(`   Devise: ${final.config?.currency}`);
      console.log(`\n📝 Description: ${final.description}`);
      console.log('─'.repeat(60));
    }

    // 4. Afficher tous les providers actifs
    console.log('\n📋 Providers de paiement actifs:');
    const { data: allProviders } = await supabase
      .from('payment_providers')
      .select('provider_code, provider_name, is_active, is_default, priority')
      .order('priority', { ascending: true });

    if (allProviders) {
      allProviders.forEach(p => {
        const status = p.is_active ? '✅' : '❌';
        const isDefault = p.is_default ? ' ⭐ (par défaut)' : '';
        console.log(`${status} ${p.provider_name} (${p.provider_code})${isDefault} - Priorité: ${p.priority}`);
      });
    }

    console.log('\n✅ Configuration terminée!');
    console.log('\n💡 Note: Les utilisateurs peuvent maintenant sélectionner Wave dans la page TopUp');
    console.log('   Le montant sera automatiquement inséré dans le lien de paiement.');
    console.log('\n🔒 Gestion depuis l\'admin:');
    console.log('   Allez sur /admin/payment-providers pour gérer tous les providers');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

configureWaveProvider();
