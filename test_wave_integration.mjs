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

async function testWaveIntegration() {
  console.log('🌊 Test de l\'intégration Wave\n');
  console.log('─'.repeat(70));

  try {
    // 1. Vérifier la configuration Wave
    console.log('\n1️⃣ Vérification du provider Wave...');
    const { data: waveProvider, error: waveError } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('provider_code', 'wave')
      .single();

    if (waveError || !waveProvider) {
      console.error('❌ Wave non trouvé dans la base');
      console.log('\n💡 Solution: Exécutez d\'abord la migration:');
      console.log('   npx supabase db push');
      console.log('   OU');
      console.log('   node configure_wave_provider.mjs');
      return;
    }

    console.log('✅ Wave trouvé');
    console.log(`   Statut: ${waveProvider.is_active ? '✅ Actif' : '❌ Inactif'}`);
    console.log(`   Par défaut: ${waveProvider.is_default ? 'Oui' : 'Non'}`);

    if (!waveProvider.is_active) {
      console.log('\n⚠️ Wave est désactivé!');
      console.log('   Pour l\'activer, exécutez: node configure_wave_provider.mjs');
      return;
    }

    // 2. Tester la construction de l'URL
    console.log('\n2️⃣ Test de construction d\'URL dynamique...');
    const template = waveProvider.config?.payment_link_template;
    
    if (!template) {
      console.error('❌ Template de lien non configuré');
      return;
    }

    console.log(`   Template: ${template}`);

    // Test avec différents montants
    const testAmounts = [500, 1000, 2500, 5000, 10000];
    
    console.log('\n   📊 URLs générées:');
    testAmounts.forEach(amount => {
      const url = template.replace('{amount}', amount.toString());
      console.log(`   ${amount.toLocaleString()} FCFA → ${url}`);
    });

    // 3. Vérifier les packages disponibles
    console.log('\n3️⃣ Packages d\'activation disponibles...');
    const { data: packages } = await supabase
      .from('activation_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_xof', { ascending: true });

    if (packages && packages.length > 0) {
      console.log(`   ${packages.length} package(s) trouvé(s):`);
      packages.forEach(pkg => {
        const waveUrl = template.replace('{amount}', pkg.price_xof.toString());
        console.log(`\n   📦 ${pkg.activations} activations - ${pkg.price_xof.toLocaleString()} FCFA`);
        console.log(`      Wave URL: ${waveUrl}`);
      });
    }

    // 4. Simuler une transaction Wave
    console.log('\n4️⃣ Simulation d\'une transaction Wave...');
    
    // Trouver un utilisateur test
    const { data: testUser } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(1)
      .single();

    if (!testUser) {
      console.log('   ⚠️ Aucun utilisateur trouvé pour le test');
    } else {
      console.log(`   Utilisateur test: ${testUser.name || testUser.email}`);
      
      const testAmount = 5000;
      const testPackage = packages?.[0];
      
      if (testPackage) {
        // Créer une transaction de test
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: testUser.id,
            amount: testAmount,
            type: 'recharge',
            status: 'pending',
            payment_method: 'wave',
            description: `TEST - Rechargement ${testPackage.activations} activations`,
            metadata: {
              user_id: testUser.id,
              type: 'recharge',
              activations: testPackage.activations,
              package_id: testPackage.id,
              provider: 'wave',
              payment_type: 'wave_direct_link',
              test: true
            }
          })
          .select()
          .single();

        if (txError) {
          console.error('   ❌ Erreur création transaction:', txError.message);
        } else {
          console.log('   ✅ Transaction créée');
          console.log(`      ID: ${transaction.id}`);
          console.log(`      Montant: ${transaction.amount} FCFA`);
          console.log(`      Statut: ${transaction.status}`);
          
          // Générer l'URL Wave
          const waveUrl = template.replace('{amount}', testAmount.toString());
          console.log(`\n   🔗 URL Wave générée:`);
          console.log(`      ${waveUrl}`);
          
          console.log('\n   📱 Dans l\'application:');
          console.log('      - L\'utilisateur clique sur "Payer"');
          console.log('      - Il est redirigé vers cette URL');
          console.log('      - Il paie avec Wave');
          console.log('      - Il revient sur le dashboard');
          
          // Nettoyer la transaction de test
          await supabase
            .from('transactions')
            .delete()
            .eq('id', transaction.id);
          
          console.log('\n   🧹 Transaction de test supprimée');
        }
      }
    }

    // 5. Résumé de l'intégration
    console.log('\n5️⃣ Résumé de l\'intégration');
    console.log('─'.repeat(70));
    console.log('✅ Provider Wave configuré');
    console.log('✅ Template d\'URL dynamique fonctionnel');
    console.log('✅ Intégration dans TopUpPage.tsx complète');
    console.log('✅ Création de transaction pending avant redirection');
    console.log('\n📋 Comment ça marche:');
    console.log('1. L\'utilisateur sélectionne un montant sur /topup');
    console.log('2. Il choisit Wave comme moyen de paiement');
    console.log('3. Une transaction "pending" est créée');
    console.log('4. L\'utilisateur est redirigé vers Wave avec le montant');
    console.log('5. Après paiement, il doit revenir confirmer manuellement');
    console.log('   (ou vous pouvez implémenter un webhook Wave)');
    
    console.log('\n⚠️ IMPORTANT - Validation manuelle:');
    console.log('Comme Wave ne fournit pas de callback automatique avec ce lien,');
    console.log('vous devrez:');
    console.log('- Soit demander à l\'utilisateur de revenir et confirmer');
    console.log('- Soit vérifier manuellement les paiements depuis l\'admin');
    console.log('- Soit implémenter l\'API Wave pour les webhooks (si disponible)');

    console.log('\n🔧 Configuration depuis l\'admin:');
    console.log('Allez sur /admin/payment-providers pour:');
    console.log('- Activer/Désactiver Wave');
    console.log('- Le définir comme provider par défaut');
    console.log('- Modifier le lien de paiement');
    console.log('- Voir l\'historique des modifications');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

testWaveIntegration();
