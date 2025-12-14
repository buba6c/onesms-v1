import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 Vérification du schéma payment_providers...\n');

// Tester avec juste un select *
const { data, error } = await supabase
  .from('payment_providers')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Erreur:', error);
  
  if (error.code === '42P01') {
    console.log('\n❌ TABLE payment_providers N\'EXISTE PAS EN PRODUCTION!');
    console.log('\n📋 SOLUTION:');
    console.log('Va sur Supabase SQL Editor et exécute:');
    console.log('https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new');
    console.log('\nSupprime les lignes du fichier:');
    console.log('supabase/migrations/20251208_payment_providers.sql');
  }
} else {
  console.log('✅ Table payment_providers existe');
  console.log('\n📋 Colonnes disponibles:');
  if (data && data[0]) {
    Object.keys(data[0]).forEach(col => console.log(`   - ${col}`));
  } else {
    console.log('   (table vide)');
  }
  console.log('\n📊 Données:', data);
}
