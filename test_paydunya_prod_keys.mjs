import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔐 Connexion avec buba6c...\n');

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'buba6c@gmail.com',
  password: 'Listedesoi@242'
});

if (authError) {
  console.error('❌ Erreur connexion:', authError.message);
  console.log('Essayons de tester directement avec l\'Edge Function...\n');
}

console.log('🧪 TEST PAYDUNYA PRODUCTION VIA EDGE FUNCTION\n');

// Tester la création d'un paiement
const { data, error } = await supabase.functions.invoke('paydunya-create-payment', {
  body: {
    amount: 100, // 100 FCFA minimum pour test
    userId: authData?.user?.id || 'e108c02a-2012-4043-bbc2-fb09bb11f824',
    email: 'test@onesms.com',
    phone: '+221771234567',
    metadata: {
      test: true,
      env: 'production'
    }
  }
});

if (error) {
  console.error('❌ ERREUR:', error.message);
  
  try {
    const errorBody = await error.context?.json();
    console.error('\n📄 Détails:');
    console.error(JSON.stringify(errorBody, null, 2));
    
    if (errorBody?.error?.includes('invalid') || errorBody?.error?.includes('credentials')) {
      console.log('\n❌ Les clés PayDunya PRODUCTION sont INVALIDES');
      console.log('Vérifie-les dans Admin → Fournisseurs de Paiement');
    } else if (errorBody?.error?.includes('non configuré')) {
      console.log('\n⚠️  PayDunya n\'est pas configuré ou inactif');
    }
  } catch (e) {
    console.error('Impossible de lire les détails de l\'erreur');
  }
  process.exit(1);
}

if (!data.success) {
  console.error('❌ Échec:', data.error);
  process.exit(1);
}

console.log('✅ SUCCÈS! PayDunya PRODUCTION fonctionne!\n');
console.log('📊 Résultat:');
console.log(`   Transaction ID: ${data.transaction_id}`);
console.log(`   Token PayDunya: ${data.token}`);
console.log(`   URL de paiement: ${data.payment_url}`);
console.log('\n🎉 Les clés PayDunya PRODUCTION sont valides et fonctionnelles!');
console.log('\n💡 Tu peux maintenant tester un vrai paiement en ouvrant:');
console.log(`   ${data.payment_url}`);
