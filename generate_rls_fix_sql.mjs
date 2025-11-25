import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔧 FIX RLS: Désactivation temporaire pour déblocage\n')
console.log('⚠️  IMPORTANT: Exécutez ce SQL directement dans Supabase Dashboard\n')
console.log('='.repeat(70))

const sqlScript = `
-- 1. DÉSACTIVER RLS temporairement (SOLUTION RAPIDE)
ALTER TABLE activations DISABLE ROW LEVEL SECURITY;

-- 2. Ajouter colonnes manquantes
ALTER TABLE activations ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE activations ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE;

-- 3. Activer Realtime pour synchronisation automatique
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS activations;

-- 4. Vérifier état
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'activations';

-- 5. TEST: Insertion manuelle
INSERT INTO activations (
  user_id,
  order_id,
  phone,
  service_code,
  country_code,
  operator,
  price,
  status,
  expires_at,
  provider
) VALUES (
  'ea4eb96d-5ab1-48ee-aec0-a0f2cb09c388',
  'test_' || extract(epoch from now()),
  '+6289518249636',
  'whatsapp',
  'indonesia',
  'any',
  15.5,
  'pending',
  now() + interval '20 minutes',
  'sms-activate'
) RETURNING id, phone, status;
`

console.log(sqlScript)
console.log('='.repeat(70))

console.log('\n📋 INSTRUCTIONS:\n')
console.log('1. Ouvrez Supabase Dashboard: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw')
console.log('2. Allez dans "SQL Editor"')
console.log('3. Créez une nouvelle query')
console.log('4. Copiez-collez le SQL ci-dessus')
console.log('5. Cliquez "RUN" pour exécuter')
console.log('\n✅ Cela désactivera RLS et permettra les insertions')
console.log('⚠️  À réactiver plus tard avec des policies correctes\n')

// Tester si RLS est actif
console.log('🔍 Test état actuel RLS...\n')

const testInsert = async () => {
  const { data, error } = await supabase
    .from('activations')
    .insert({
      user_id: 'ea4eb96d-5ab1-48ee-aec0-a0f2cb09c388',
      order_id: 'test_' + Date.now(),
      phone: '+6289518249636',
      service_code: 'whatsapp',
      country_code: 'indonesia',
      operator: 'any',
      price: 15.5,
      status: 'pending',
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      provider: 'sms-activate'
    })
    .select()
    .single()
  
  if (error) {
    console.log('❌ RLS BLOQUE TOUJOURS les insertions')
    console.log(`   Code: ${error.code}`)
    console.log(`   Message: ${error.message}`)
    console.log('\n👉 EXÉCUTEZ LE SQL CI-DESSUS dans Supabase Dashboard\n')
  } else {
    console.log('✅ RLS OK - Insertion réussie !')
    console.log(`   ID: ${data.id}`)
    console.log(`   Phone: ${data.phone}`)
    
    // Nettoyer
    await supabase
      .from('activations')
      .delete()
      .eq('id', data.id)
    
    console.log('   (test supprimé)')
  }
}

testInsert().catch(console.error)
