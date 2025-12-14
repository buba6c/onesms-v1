import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lire la config Coolify
const coolifyEnv = fs.readFileSync('.env.coolify', 'utf8');
const lines = coolifyEnv.split('\n');
const config = {};

lines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    config[match[1]] = match[2];
  }
});

console.log('🔍 VÉRIFICATION SUPABASE COOLIFY\n');
console.log('📍 URL:', config.VITE_SUPABASE_URL);
console.log('🔑 Anon Key:', config.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...\n');

const supabase = createClient(
  config.VITE_SUPABASE_URL,
  config.VITE_SUPABASE_ANON_KEY
);

console.log('📊 Vérification des données...\n');

try {
  // Vérifier les tables principales
  const checks = [
    { table: 'users', name: 'Utilisateurs' },
    { table: 'services', name: 'Services' },
    { table: 'activations', name: 'Activations' },
    { table: 'rentals', name: 'Locations' },
    { table: 'transactions', name: 'Transactions' },
    { table: 'payment_providers', name: 'Fournisseurs paiement' }
  ];

  for (const check of checks) {
    const { count, error } = await supabase
      .from(check.table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${check.name} (${check.table}): Erreur - ${error.message}`);
    } else {
      console.log(`✅ ${check.name} (${check.table}): ${count || 0} lignes`);
    }
  }

  console.log('\n🎉 Migration réussie ! Supabase Coolify est opérationnel!');
  console.log('\n📝 Prochaines étapes:');
  console.log('1. cp .env .env.backup && cp .env.coolify .env');
  console.log('2. npm run dev (teste en local)');
  console.log('3. npm run build && netlify deploy --prod');
  
} catch (err) {
  console.error('\n❌ Erreur:', err.message);
  console.log('\n💡 Vérifie que:');
  console.log('- Supabase Coolify est démarré');
  console.log('- Les clés API sont correctes dans .env.coolify');
  console.log('- L\'URL est accessible');
}
