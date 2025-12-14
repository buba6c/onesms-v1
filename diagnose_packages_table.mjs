import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
// Pour le service role, on doit le récupérer depuis l'env ou le fichier
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

console.log('🔍 DIAGNOSTIC COMPLET DE LA TABLE activation_packages\n')
console.log('=' .repeat(60))

// Test 1: Avec Service Role (contourne RLS)
console.log('\n📌 TEST 1: Accès avec SERVICE ROLE (contourne RLS)')
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const { data: dataServiceRole, error: errorServiceRole } = await supabaseAdmin
  .from('activation_packages')
  .select('*')
  .limit(5)

if (errorServiceRole) {
  console.log('❌ Erreur SERVICE ROLE:', errorServiceRole)
  console.log('   → Code:', errorServiceRole.code)
  console.log('   → Message:', errorServiceRole.message)
  console.log('   → Details:', errorServiceRole.details)
  console.log('   → Hint:', errorServiceRole.hint)
} else {
  console.log('✅ Service Role OK - Nombre de packages:', dataServiceRole?.length)
  if (dataServiceRole?.length > 0) {
    console.log('   Premier package:', dataServiceRole[0])
  }
}

// Test 2: Avec Anon Key (respecte RLS)
console.log('\n📌 TEST 2: Accès avec ANON KEY (respecte RLS)')
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

const { data: dataAnon, error: errorAnon } = await supabaseAnon
  .from('activation_packages')
  .select('*')
  .limit(5)

if (errorAnon) {
  console.log('❌ Erreur ANON:', errorAnon)
  console.log('   → Code:', errorAnon.code)
  console.log('   → Message:', errorAnon.message)
  console.log('   → Details:', errorAnon.details)
  console.log('   → Hint:', errorAnon.hint)
} else {
  console.log('✅ Anon Key OK - Nombre de packages:', dataAnon?.length)
}

// Test 3: Vérifier si la table existe via information_schema
console.log('\n📌 TEST 3: Vérification de l\'existence de la table')
const { data: tableInfo, error: tableError } = await supabaseAdmin
  .rpc('execute_sql', { 
    sql_query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activation_packages'`
  })

if (tableError) {
  // Essayer autrement
  const { data: tables, error: tablesError } = await supabaseAdmin
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public')
  
  if (tablesError) {
    console.log('⚠️  Impossible de vérifier l\'existence de la table via pg_tables')
  }
}

// Test 4: Vérifier les politiques RLS
console.log('\n📌 TEST 4: Vérification des politiques RLS')
const { data: policies, error: policiesError } = await supabaseAdmin
  .rpc('get_policies', { table_name: 'activation_packages' })

if (policiesError) {
  console.log('⚠️  Impossible de récupérer les politiques (fonction peut ne pas exister)')
}

// Test 5: Insertion test
console.log('\n📌 TEST 5: Test d\'insertion (rollback)')
const testPackage = {
  name: 'TEST_PACKAGE_TO_DELETE',
  display_name: 'Test Package',
  credits: 100,
  price: 500,
  currency: 'XOF',
  bonus_percentage: 0,
  is_active: false,
  is_popular: false,
  description: 'Test package for diagnostic',
  sort_order: 999
}

const { error: insertError } = await supabaseAdmin
  .from('activation_packages')
  .insert(testPackage)

if (insertError) {
  console.log('❌ Erreur INSERT:', insertError)
  console.log('   → Cela indique probablement que la table n\'existe pas ou a une structure différente')
} else {
  console.log('✅ INSERT OK - Suppression du test...')
  await supabaseAdmin
    .from('activation_packages')
    .delete()
    .eq('name', 'TEST_PACKAGE_TO_DELETE')
  console.log('✅ Test package supprimé')
}

// Test 6: Vérifier la structure de la table
console.log('\n📌 TEST 6: Structure de la table')
const { data: columns, error: columnsError } = await supabaseAdmin
  .from('activation_packages')
  .select('*')
  .limit(0)

if (columnsError) {
  console.log('❌ Impossible de déterminer la structure')
} else {
  console.log('✅ Colonnes disponibles (basé sur la réponse):')
  // Les colonnes sont déterminées par la première ligne
  if (dataServiceRole && dataServiceRole.length > 0) {
    console.log('   ', Object.keys(dataServiceRole[0]).join(', '))
  }
}

// Résumé
console.log('\n' + '='.repeat(60))
console.log('📊 RÉSUMÉ DU DIAGNOSTIC')
console.log('='.repeat(60))

if (!errorServiceRole && dataServiceRole?.length > 0) {
  console.log('✅ La table activation_packages EXISTE et contient des données')
  console.log('   → Nombre de packages:', dataServiceRole.length)
  
  if (errorAnon) {
    console.log('❌ PROBLÈME RLS: La table n\'est pas accessible en mode anonyme')
    console.log('\n📝 SOLUTION: Ajouter une politique RLS pour permettre la lecture publique')
    console.log('\nExécutez ce SQL dans Supabase Dashboard:')
    console.log(`
-- Activer RLS si pas déjà fait
ALTER TABLE activation_packages ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique pour les packages actifs
DROP POLICY IF EXISTS "Allow public read of active packages" ON activation_packages;
CREATE POLICY "Allow public read of active packages" ON activation_packages
  FOR SELECT USING (is_active = true);

-- Politique CRUD pour les admins
DROP POLICY IF EXISTS "Allow admins full access" ON activation_packages;
CREATE POLICY "Allow admins full access" ON activation_packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
`)
  } else {
    console.log('✅ RLS OK: La table est accessible en mode anonyme')
  }
} else if (errorServiceRole) {
  console.log('❌ La table activation_packages N\'EXISTE PAS ou a un problème majeur')
  console.log('\n📝 SOLUTION: Créer la table avec ce SQL:')
  console.log(`
CREATE TABLE IF NOT EXISTS activation_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  price INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF',
  bonus_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE activation_packages ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique
CREATE POLICY "Allow public read of active packages" ON activation_packages
  FOR SELECT USING (is_active = true);

-- Politique CRUD pour les admins
CREATE POLICY "Allow admins full access" ON activation_packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Données par défaut
INSERT INTO activation_packages (name, display_name, credits, price, bonus_percentage, description, sort_order, is_popular) VALUES
  ('starter', 'Starter', 500, 500, 0, '500 FCFA de crédits', 1, false),
  ('basic', 'Basic', 1000, 1000, 5, '1 000 FCFA + 5% bonus', 2, false),
  ('standard', 'Standard', 2500, 2500, 10, '2 500 FCFA + 10% bonus', 3, true),
  ('premium', 'Premium', 5000, 5000, 15, '5 000 FCFA + 15% bonus', 4, false),
  ('pro', 'Pro', 10000, 10000, 20, '10 000 FCFA + 20% bonus', 5, false);
`)
}

console.log('\n✅ Diagnostic terminé')
