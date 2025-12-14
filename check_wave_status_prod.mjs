import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔍 Vérification du provider Wave en production...\n');

// 1. Vérifier payment_providers
const { data: provider, error: provError } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('code', 'wave')
  .maybeSingle();

if (provError) {
  console.error('❌ Erreur:', provError.message);
} else if (!provider) {
  console.log('❌ Provider Wave N\'EXISTE PAS dans payment_providers');
} else {
  console.log('✅ Provider Wave existe:');
  console.log('   - ID:', provider.id);
  console.log('   - Code:', provider.code);
  console.log('   - Name:', provider.name);
  console.log('   - Active:', provider.is_active ? '✅ OUI' : '❌ NON');
  console.log('   - Config:', JSON.stringify(provider.config, null, 2));
}

// 2. Vérifier wave_payment_proofs table
console.log('\n📋 Vérification de la table wave_payment_proofs...');
const { data: proofs, error: proofsError } = await supabase
  .from('wave_payment_proofs')
  .select('*')
  .limit(1);

if (proofsError) {
  console.error('❌ Erreur:', proofsError.message);
  if (proofsError.code === '42P01') {
    console.log('⚠️  TABLE wave_payment_proofs N\'EXISTE PAS!');
  }
} else {
  console.log('✅ Table wave_payment_proofs existe');
}

// 3. Vérifier les policies RLS
console.log('\n🔒 Vérification des RLS policies...');
const { data: policies, error: polError } = await supabase.rpc('exec_sql', {
  sql_query: `
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'wave_payment_proofs'
    ORDER BY policyname
  `
}).catch(() => null);

if (policies) {
  console.log('✅ Policies:', policies.length);
  policies.forEach(p => console.log(`   - ${p.policyname} (${p.cmd})`));
} else {
  console.log('⚠️  Impossible de vérifier les policies (exec_sql non disponible)');
}

console.log('\n📊 RÉSUMÉ:');
if (!provider) {
  console.log('❌ PROBLÈME: Provider Wave non configuré dans payment_providers');
  console.log('   Solution: Exécuter insert_wave_provider.mjs');
} else if (!provider.is_active) {
  console.log('❌ PROBLÈME: Provider Wave existe mais est DÉSACTIVÉ');
  console.log('   Solution: UPDATE payment_providers SET is_active=true WHERE code=\'wave\'');
} else {
  console.log('✅ Provider Wave configuré et actif');
}
