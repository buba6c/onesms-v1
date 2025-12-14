import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non défini');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Application de la migration Wave transactions policies...\n');

  const sql = readFileSync('./supabase/migrations/20251212_fix_wave_transactions_policy.sql', 'utf8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution de la migration:', error);
      
      // Fallback: appliquer manuellement les policies principales
      console.log('\n⚠️ Tentative de création manuelle des policies...\n');
      
      // Drop la policy qui bloque
      await supabase.rpc('exec_sql', {
        sql_query: `DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;`
      });
      console.log('✅ Policy bloquante supprimée');
      
      // Créer policy INSERT
      const { error: insertError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE POLICY IF NOT EXISTS "Users can create own transactions"
          ON public.transactions
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
        `
      });
      if (!insertError) console.log('✅ Policy INSERT créée');
      
      // Créer policy UPDATE
      const { error: updateError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE POLICY IF NOT EXISTS "Users can update own pending transactions"
          ON public.transactions
          FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id AND status = 'pending')
          WITH CHECK (auth.uid() = user_id AND status = 'pending');
        `
      });
      if (!updateError) console.log('✅ Policy UPDATE créée');
      
      // Créer policy DELETE (bloquer)
      const { error: deleteError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE POLICY IF NOT EXISTS "Users cannot delete transactions"
          ON public.transactions
          FOR DELETE
          TO authenticated
          USING (false);
        `
      });
      if (!deleteError) console.log('✅ Policy DELETE créée');
      
    } else {
      console.log('✅ Migration appliquée avec succès !');
    }

    // Vérifier les policies actuelles
    console.log('\n📋 Vérification des policies...\n');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'transactions');

    if (!policiesError && policies) {
      console.log('Policies actives sur transactions:');
      policies.forEach(p => console.log(`  - ${p.policyname} (${p.cmd})`));
    }

  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

applyMigration();
