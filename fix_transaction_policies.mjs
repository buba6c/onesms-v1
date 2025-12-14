import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non défini');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function fixPolicies() {
  console.log('🔧 Application des nouvelles policies pour transactions...\n');

  const policies = [
    {
      name: 'Block user transaction mutations',
      action: 'DROP',
      sql: `DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;`
    },
    {
      name: 'Users can create own transactions',
      action: 'CREATE',
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'transactions' 
            AND policyname = 'Users can create own transactions'
          ) THEN
            CREATE POLICY "Users can create own transactions"
            ON public.transactions
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
          END IF;
        END $$;
      `
    },
    {
      name: 'Users can update own pending transactions',
      action: 'CREATE',
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'transactions' 
            AND policyname = 'Users can update own pending transactions'
          ) THEN
            CREATE POLICY "Users can update own pending transactions"
            ON public.transactions
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id AND status = 'pending')
            WITH CHECK (auth.uid() = user_id AND status = 'pending');
          END IF;
        END $$;
      `
    },
    {
      name: 'Users cannot delete transactions',
      action: 'CREATE',
      sql: `
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'transactions' 
            AND policyname = 'Users cannot delete transactions'
          ) THEN
            CREATE POLICY "Users cannot delete transactions"
            ON public.transactions
            FOR DELETE
            TO authenticated
            USING (false);
          END IF;
        END $$;
      `
    }
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('query', { query_text: policy.sql });
      
      if (error) {
        console.error(`❌ Erreur pour ${policy.name}:`, error.message);
      } else {
        console.log(`✅ ${policy.action} - ${policy.name}`);
      }
    } catch (err) {
      console.error(`❌ Exception pour ${policy.name}:`, err.message);
    }
  }

  // Vérifier les policies finales
  console.log('\n📋 Vérification des policies actives...\n');
  
  const { data: allPolicies, error } = await supabase
    .from('pg_policies')
    .select('policyname, cmd, roles')
    .eq('tablename', 'transactions')
    .order('policyname');

  if (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } else if (allPolicies && allPolicies.length > 0) {
    console.log('Policies actives sur la table transactions:');
    allPolicies.forEach(p => {
      console.log(`  • ${p.policyname}`);
      console.log(`    - Commande: ${p.cmd}`);
      console.log(`    - Rôles: ${p.roles.join(', ')}`);
    });
    console.log(`\nTotal: ${allPolicies.length} policies`);
  } else {
    console.log('⚠️ Aucune policy trouvée (ou pg_policies non accessible)');
  }

  console.log('\n✅ Configuration terminée !');
}

fixPolicies().catch(console.error);
