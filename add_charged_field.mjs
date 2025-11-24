#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addChargedField() {
  console.log('🔧 Ajout du champ "charged" à la table activations...\n');
  
  // Note: Cette requête ne fonctionnera que si vous avez les droits admin
  // Sinon il faut exécuter directement dans le SQL Editor de Supabase
  
  const sql = `
    -- Ajouter le champ charged
    ALTER TABLE activations 
    ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE;

    -- Index
    CREATE INDEX IF NOT EXISTS idx_activations_charged ON activations(charged);

    -- Mettre à jour les activations existantes
    UPDATE activations 
    SET charged = TRUE 
    WHERE status = 'received' AND charged IS NOT NULL;
  `;

  console.log('📝 SQL à exécuter:');
  console.log(sql);
  console.log('\n⚠️  Veuillez exécuter ce SQL dans le SQL Editor de Supabase:');
  console.log('   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new\n');
}

addChargedField();
