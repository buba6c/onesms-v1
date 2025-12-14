import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 TEST MONEYFUSION - Démarrage...\n');

// Récupérer un user ID pour tester
const { data: users } = await supabase
  .from('users')
  .select('id, email')
  .eq('role', 'admin')
  .limit(1);

if (!users || users.length === 0) {
  console.error('❌ Aucun utilisateur trouvé');
  process.exit(1);
}

const userId = users[0].id;
console.log('✅ Test avec utilisateur:', users[0].email);

// Tester la création d'un paiement MoneyFusion
console.log('\n💳 Test création paiement MoneyFusion...');
const { data, error } = await supabase.functions.invoke('init-moneyfusion-payment', {
  body: {
    userId: userId,
    amount: 1000,
    activations: 5,
    phone: '+221771234567'
  }
});

if (error) {
  console.error('\n❌ ERREUR:', error);
  
  // Lire le body de l'erreur
  try {
    const errorBody = await error.context?.json();
    console.error('📄 Détails:', JSON.stringify(errorBody, null, 2));
  } catch (e) {
    console.error('⚠️  Impossible de lire le body');
  }
  process.exit(1);
}

console.log('\n✅ SUCCÈS!');
console.log('📊 Réponse:', JSON.stringify(data, null, 2));
