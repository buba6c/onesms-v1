import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Vérification structure table transactions...\n');

// Récupérer une transaction existante pour voir tous les champs
const { data: sample, error } = await supabase
  .from('transactions')
  .select('*')
  .limit(1)
  .single();

if (error) {
  console.error('❌ Erreur:', error.message);
} else if (sample) {
  console.log('📋 Colonnes de la table transactions:\n');
  Object.entries(sample).forEach(([key, value]) => {
    const type = value === null ? 'NULL' : typeof value;
    const nullable = value === null ? '(nullable)' : '';
    console.log(`  • ${key}: ${type} ${nullable}`);
  });
  
  console.log('\n📊 Exemple de transaction:');
  console.log(JSON.stringify(sample, null, 2));
}
