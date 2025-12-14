import pg from 'pg';
const { Client } = pg;

// URL de connexion directe à Supabase PostgreSQL
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const connectionString = process.env.DATABASE_URL || 
  `postgresql://postgres.htfqmamvmhdoixqcbbbw:${process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function applyPolicies() {
  const client = new Client({ connectionString });

  try {
    console.log('🔗 Connexion à la base de données...');
    await client.connect();
    console.log('✅ Connecté !\n');

    // 1. Supprimer la policy bloquante
    console.log('🗑️  Suppression de la policy bloquante...');
    await client.query(`DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;`);
    console.log('✅ Policy bloquante supprimée\n');

    // 2. Créer policy INSERT
    console.log('➕ Création policy INSERT...');
    await client.query(`
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
    `);
    console.log('✅ Policy INSERT créée\n');

    // 3. Créer policy UPDATE
    console.log('📝 Création policy UPDATE...');
    await client.query(`
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
    `);
    console.log('✅ Policy UPDATE créée\n');

    // 4. Créer policy DELETE (bloquer)
    console.log('🚫 Création policy DELETE (bloquer)...');
    await client.query(`
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
    `);
    console.log('✅ Policy DELETE créée\n');

    // Vérifier les policies
    console.log('📋 Vérification des policies actives...\n');
    const result = await client.query(`
      SELECT 
        policyname,
        cmd,
        roles::text[]
      FROM pg_policies 
      WHERE tablename = 'transactions'
      AND schemaname = 'public'
      ORDER BY policyname;
    `);

    console.log('Policies actives sur transactions:');
    result.rows.forEach(row => {
      console.log(`  • ${row.policyname}`);
      console.log(`    Commande: ${row.cmd}`);
      console.log(`    Rôles: ${row.roles.join(', ')}\n`);
    });

    console.log('✅ Migration terminée avec succès !');
    console.log('\n🔄 Rechargez la page pour tester Wave payment.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyPolicies();
