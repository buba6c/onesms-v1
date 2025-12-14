#!/usr/bin/env node

/**
 * 🔬 ANALYSE DEEP SUPABASE - CONNEXION DIRECTE PostgreSQL
 * ========================================================
 * Analyse ultra-détaillée avec accès direct à la base de données
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-1-eu-central-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.htfqmamvmhdoixqcbbbw',
  password: 'Workeverytime@4##',
  ssl: { rejectUnauthorized: false }
});

console.log('🔬 ANALYSE DEEP SUPABASE - ACCÈS DIRECT PostgreSQL');
console.log('='.repeat(70));
console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);
console.log('='.repeat(70));
console.log('');

// ============================================
// 1. STRUCTURE COMPLÈTE DE LA BASE
// ============================================
async function analyzeCompleteStructure() {
  console.log('🗄️  1. STRUCTURE COMPLÈTE DE LA BASE');
  console.log('-'.repeat(70));

  try {
    // Liste toutes les tables du schéma public
    const tablesQuery = `
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await client.query(tablesQuery);
    
    console.log(`📊 Total tables: ${result.rows.length}\n`);

    for (const row of result.rows) {
      // Compter les enregistrements
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM public."${row.table_name}"`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`✅ ${row.table_name}`);
        console.log(`   ├─ Colonnes: ${row.column_count}`);
        console.log(`   └─ Enregistrements: ${count.toLocaleString()}`);
      } catch (err) {
        console.log(`⚠️  ${row.table_name} - Erreur comptage: ${err.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 2. DÉTAILS DES COLONNES PAR TABLE
// ============================================
async function analyzeTableColumns() {
  console.log('📋 2. DÉTAILS DES COLONNES IMPORTANTES');
  console.log('-'.repeat(70));

  const importantTables = ['users', 'activations', 'rentals', 'services', 'pricing_rules'];

  for (const tableName of importantTables) {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const result = await client.query(query, [tableName]);
      
      if (result.rows.length > 0) {
        console.log(`\n📦 Table: ${tableName}`);
        result.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` (default: ${col.column_default.substring(0, 30)})` : '';
          console.log(`   ├─ ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
        });
      }

    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
    }
  }
  console.log('');
}

// ============================================
// 3. ANALYSE DÉTAILLÉE DES USERS
// ============================================
async function analyzeUsersDeep() {
  console.log('👥 3. ANALYSE DÉTAILLÉE DES UTILISATEURS');
  console.log('-'.repeat(70));

  try {
    // Users avec le plus de détails
    const query = `
      SELECT 
        id,
        email,
        full_name,
        role,
        credits,
        is_active,
        created_at,
        (SELECT COUNT(*) FROM activations WHERE user_id = users.id) as total_activations,
        (SELECT COUNT(*) FROM activations WHERE user_id = users.id AND status = 'completed') as completed_activations
      FROM users
      ORDER BY credits DESC, created_at DESC;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total utilisateurs: ${result.rows.length}\n`);

    // Statistiques globales
    let totalCredits = 0;
    let activeCount = 0;
    let adminCount = 0;

    result.rows.forEach(user => {
      totalCredits += parseFloat(user.credits || 0);
      if (user.is_active) activeCount++;
      if (user.role === 'admin') adminCount++;
    });

    console.log(`💰 Total crédits: ${totalCredits.toLocaleString('fr-FR')} XOF`);
    console.log(`✅ Utilisateurs actifs: ${activeCount}`);
    console.log(`👑 Admins: ${adminCount}`);

    // Top 10 users
    console.log(`\n🏆 Top 10 utilisateurs:\n`);
    result.rows.slice(0, 10).forEach((user, i) => {
      const status = user.is_active ? '✅' : '❌';
      const roleIcon = user.role === 'admin' ? '👑' : '👤';
      console.log(`${i + 1}. ${roleIcon} ${status} ${user.email}`);
      console.log(`   ├─ Nom: ${user.full_name || 'N/A'}`);
      console.log(`   ├─ Crédits: ${parseFloat(user.credits).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Activations: ${user.total_activations} (${user.completed_activations} complétées)`);
      console.log(`   └─ Inscrit: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`);
    });

    // Users sans activations
    const noActivityQuery = `
      SELECT COUNT(*) as count
      FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM activations WHERE user_id = u.id);
    `;
    const noActivityResult = await client.query(noActivityQuery);
    console.log(`\n⚠️  Utilisateurs sans activations: ${noActivityResult.rows[0].count}`);

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 4. ANALYSE DÉTAILLÉE DES ACTIVATIONS
// ============================================
async function analyzeActivationsDeep() {
  console.log('📱 4. ANALYSE DÉTAILLÉE DES ACTIVATIONS');
  console.log('-'.repeat(70));

  try {
    // Stats par statut
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(price_paid) as total_paid,
        AVG(price_paid) as avg_price
      FROM activations
      GROUP BY status
      ORDER BY count DESC;
    `;

    const statusResult = await client.query(statusQuery);
    
    console.log('📊 Répartition par statut:\n');
    statusResult.rows.forEach(row => {
      console.log(`${row.status}:`);
      console.log(`   ├─ Nombre: ${row.count}`);
      console.log(`   ├─ Total payé: ${parseFloat(row.total_paid || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   └─ Prix moyen: ${parseFloat(row.avg_price || 0).toLocaleString('fr-FR')} XOF`);
    });

    // Services les plus utilisés
    const servicesQuery = `
      SELECT 
        service,
        COUNT(*) as count,
        SUM(price_paid) as revenue
      FROM activations
      GROUP BY service
      ORDER BY count DESC
      LIMIT 10;
    `;

    const servicesResult = await client.query(servicesQuery);
    
    console.log('\n🔥 Top 10 services utilisés:\n');
    servicesResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.service}: ${row.count} activations (${parseFloat(row.revenue).toLocaleString('fr-FR')} XOF)`);
    });

    // Pays les plus utilisés
    const countriesQuery = `
      SELECT 
        country_code,
        COUNT(*) as count
      FROM activations
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 10;
    `;

    const countriesResult = await client.query(countriesQuery);
    
    console.log('\n🌍 Top 10 pays:\n');
    countriesResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.country_code}: ${row.count} activations`);
    });

    // Providers utilisés
    const providersQuery = `
      SELECT 
        provider,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as success_rate
      FROM activations
      GROUP BY provider
      ORDER BY count DESC;
    `;

    const providersResult = await client.query(providersQuery);
    
    console.log('\n🔌 Providers utilisés:\n');
    providersResult.rows.forEach(row => {
      console.log(`${row.provider}:`);
      console.log(`   ├─ Total: ${row.count}`);
      console.log(`   ├─ Complétées: ${row.completed}`);
      console.log(`   ├─ Annulées: ${row.cancelled}`);
      console.log(`   └─ Taux de succès: ${row.success_rate}%`);
    });

    // Activations récentes
    const recentQuery = `
      SELECT 
        id,
        user_id,
        service,
        country_code,
        status,
        price_paid,
        created_at,
        (SELECT email FROM users WHERE id = activations.user_id) as user_email
      FROM activations
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const recentResult = await client.query(recentQuery);
    
    console.log('\n📅 10 dernières activations:\n');
    recentResult.rows.forEach((act, i) => {
      const date = new Date(act.created_at).toLocaleString('fr-FR');
      console.log(`${i + 1}. ${act.service} (${act.country_code}) - ${act.status}`);
      console.log(`   ├─ Utilisateur: ${act.user_email}`);
      console.log(`   ├─ Prix: ${parseFloat(act.price_paid).toLocaleString('fr-FR')} XOF`);
      console.log(`   └─ Date: ${date}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 5. ANALYSE DES SERVICES
// ============================================
async function analyzeServicesDeep() {
  console.log('🎯 5. ANALYSE DÉTAILLÉE DES SERVICES');
  console.log('-'.repeat(70));

  try {
    // Services avec stats d'utilisation
    const query = `
      SELECT 
        s.name,
        s.display_name,
        s.category,
        s.is_active,
        s.popularity_score,
        (SELECT COUNT(*) FROM activations WHERE service = s.name) as usage_count
      FROM services s
      ORDER BY usage_count DESC, popularity_score DESC
      LIMIT 20;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Top 20 services:\n`);
    result.rows.forEach((service, i) => {
      const status = service.is_active ? '✅' : '❌';
      console.log(`${i + 1}. ${status} ${service.display_name}`);
      console.log(`   ├─ Nom technique: ${service.name}`);
      console.log(`   ├─ Catégorie: ${service.category || 'N/A'}`);
      console.log(`   ├─ Score popularité: ${service.popularity_score}`);
      console.log(`   └─ Utilisations: ${service.usage_count}`);
    });

    // Stats par catégorie
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
      FROM services
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC;
    `;

    const categoryResult = await client.query(categoryQuery);
    
    if (categoryResult.rows.length > 0) {
      console.log('\n📂 Répartition par catégorie:\n');
      categoryResult.rows.forEach(cat => {
        console.log(`${cat.category}: ${cat.count} services (${cat.active_count} actifs)`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 6. ANALYSE DES PAYS
// ============================================
async function analyzeCountriesDeep() {
  console.log('🌍 6. ANALYSE DÉTAILLÉE DES PAYS');
  console.log('-'.repeat(70));

  try {
    const query = `
      SELECT 
        c.code,
        c.name,
        c.is_active,
        c.available_numbers,
        (SELECT COUNT(*) FROM activations WHERE country_code = c.code) as usage_count
      FROM countries c
      ORDER BY usage_count DESC
      LIMIT 20;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Top 20 pays:\n`);
    result.rows.forEach((country, i) => {
      const status = country.is_active ? '✅' : '❌';
      console.log(`${i + 1}. ${status} ${country.name} (${country.code})`);
      console.log(`   ├─ Numéros disponibles: ${country.available_numbers || 0}`);
      console.log(`   └─ Utilisations: ${country.usage_count}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 7. ANALYSE RLS POLICIES
// ============================================
async function analyzeRLSPolicies() {
  console.log('🔐 7. POLITIQUES RLS (ROW LEVEL SECURITY)');
  console.log('-'.repeat(70));

  try {
    const query = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Aucune politique RLS trouvée !');
    } else {
      console.log(`📊 Total policies: ${result.rows.length}\n`);

      let currentTable = '';
      result.rows.forEach(policy => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename;
          console.log(`\n📦 Table: ${policy.tablename}`);
        }
        console.log(`   ├─ ${policy.policyname}`);
        console.log(`   │  ├─ Commande: ${policy.cmd}`);
        console.log(`   │  ├─ Rôles: ${policy.roles ? policy.roles.join(', ') : 'tous'}`);
        console.log(`   │  └─ Type: ${policy.permissive}`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 8. ANALYSE DES INDEX
// ============================================
async function analyzeIndexes() {
  console.log('⚡ 8. INDEX DE PERFORMANCE');
  console.log('-'.repeat(70));

  try {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total index: ${result.rows.length}\n`);

    let currentTable = '';
    result.rows.forEach(index => {
      if (index.tablename !== currentTable) {
        currentTable = index.tablename;
        console.log(`\n📦 ${index.tablename}:`);
      }
      console.log(`   ├─ ${index.indexname}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 9. ANALYSE DES TRIGGERS
// ============================================
async function analyzeTriggers() {
  console.log('⚙️  9. TRIGGERS ACTIFS');
  console.log('-'.repeat(70));

  try {
    const query = `
      SELECT 
        trigger_schema,
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `;

    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Aucun trigger trouvé');
    } else {
      console.log(`📊 Total triggers: ${result.rows.length}\n`);

      let currentTable = '';
      result.rows.forEach(trigger => {
        if (trigger.event_object_table !== currentTable) {
          currentTable = trigger.event_object_table;
          console.log(`\n📦 ${trigger.event_object_table}:`);
        }
        console.log(`   ├─ ${trigger.trigger_name}`);
        console.log(`   │  ├─ Événement: ${trigger.event_manipulation}`);
        console.log(`   │  └─ Timing: ${trigger.action_timing}`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 10. DIAGNOSTIC DE SANTÉ
// ============================================
async function healthCheck() {
  console.log('🏥 10. DIAGNOSTIC DE SANTÉ');
  console.log('-'.repeat(70));

  try {
    // Version PostgreSQL
    const versionResult = await client.query('SELECT version();');
    console.log(`📌 PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);

    // Taille de la base
    const sizeQuery = `
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    const sizeResult = await client.query(sizeQuery);
    console.log(`💾 Taille de la base: ${sizeResult.rows[0].size}`);

    // Tables les plus volumineuses
    const tableSizeQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 5;
    `;
    const tableSizeResult = await client.query(tableSizeQuery);
    
    console.log('\n📊 Top 5 tables volumineuses:\n');
    tableSizeResult.rows.forEach((table, i) => {
      console.log(`${i + 1}. ${table.tablename}: ${table.size}`);
    });

    // Connexions actives
    const connectionsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle
      FROM pg_stat_activity
      WHERE datname = current_database();
    `;
    const connectionsResult = await client.query(connectionsQuery);
    
    console.log('\n🔌 Connexions:');
    console.log(`   ├─ Total: ${connectionsResult.rows[0].total}`);
    console.log(`   ├─ Actives: ${connectionsResult.rows[0].active}`);
    console.log(`   └─ Idle: ${connectionsResult.rows[0].idle}`);

    // Problèmes potentiels
    console.log('\n⚠️  Vérifications de santé:');

    // Check 1: Tables sans PK
    const noPKQuery = `
      SELECT table_name
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'PRIMARY KEY'
        AND table_name = t.table_name
        AND table_schema = 'public'
      );
    `;
    const noPKResult = await client.query(noPKQuery);
    
    if (noPKResult.rows.length > 0) {
      console.log(`   ❌ Tables sans clé primaire: ${noPKResult.rows.length}`);
      noPKResult.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
    } else {
      console.log('   ✅ Toutes les tables ont une clé primaire');
    }

    // Check 2: RLS activé ?
    const rlsQuery = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND rowsecurity = false;
    `;
    const rlsResult = await client.query(rlsQuery);
    
    if (rlsResult.rows.length > 0) {
      console.log(`   ⚠️  Tables sans RLS: ${rlsResult.rows.length}`);
      rlsResult.rows.forEach(row => {
        console.log(`      - ${row.tablename}`);
      });
    } else {
      console.log('   ✅ RLS activé sur toutes les tables');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================
async function main() {
  try {
    console.log('🔌 Connexion à PostgreSQL...\n');
    await client.connect();
    console.log('✅ Connecté !\n');

    await analyzeCompleteStructure();
    await analyzeTableColumns();
    await analyzeUsersDeep();
    await analyzeActivationsDeep();
    await analyzeServicesDeep();
    await analyzeCountriesDeep();
    await analyzeRLSPolicies();
    await analyzeIndexes();
    await analyzeTriggers();
    await healthCheck();

    console.log('='.repeat(70));
    console.log('✅ ANALYSE DEEP TERMINÉE');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ ERREUR FATALE:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
    console.log('\n🔌 Déconnexion PostgreSQL');
  }
}

main();
