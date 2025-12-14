#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variables manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sql = `
-- Policy pour que les admins voient toutes les preuves
DROP POLICY IF EXISTS "Admins can view all wave proofs" ON wave_payment_proofs;
CREATE POLICY "Admins can view all wave proofs"
ON wave_payment_proofs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy pour que les admins mettent à jour les preuves
DROP POLICY IF EXISTS "Admins can update wave proofs" ON wave_payment_proofs;
CREATE POLICY "Admins can update wave proofs"
ON wave_payment_proofs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
`;

console.log('🔄 Application des policies admin Wave...\n');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

if (error) {
  console.error('❌ Erreur:', error.message);
  console.log('\n📋 Copie ce SQL dans Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new\n');
  console.log(sql);
  process.exit(1);
}

console.log('✅ Policies admin appliquées avec succès!\n');

// Vérifier les policies
const { data: policies, error: polError } = await supabase.rpc('exec_sql', {
  sql_query: `
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE tablename = 'wave_payment_proofs'
    ORDER BY policyname
  `
});

if (!polError && policies) {
  console.log('📋 Policies actuelles:');
  console.table(policies);
}

console.log('\n✅ Déploiement Wave terminé!');
console.log('🔗 Test admin: https://onesms-sn.com/admin/wave-payments');
