#!/usr/bin/env node

/**
 * 🔬 ANALYSE SQL ULTRA-PROFONDE
 * ==============================
 * Analyse complète de la structure SQL, triggers, fonctions, RLS
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

console.log('🔬 ANALYSE SQL ULTRA-PROFONDE');
console.log('='.repeat(80));
console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
console.log('='.repeat(80));
console.log('');

// ============================================
// 1. STRUCTURE COMPLÈTE DES TABLES
// ============================================
async function analyzeTableStructure() {
  console.log('📊 1. STRUCTURE COMPLÈTE DES TABLES');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        tc.constraint_type,
        tc.constraint_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON c.column_name = ccu.column_name 
        AND c.table_name = ccu.table_name
      LEFT JOIN information_schema.table_constraints tc
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_name = tc.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position;
    `;

    const result = await client.query(query);
    
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n📦 TABLE: ${row.table_name}`);
      }
      
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default.substring(0, 40)}` : '';
      const constraint = row.constraint_type ? ` [${row.constraint_type}]` : '';
      
      console.log(`   ├─ ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}${constraint}`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 2. FOREIGN KEYS (Relations)
// ============================================
async function analyzeForeignKeys() {
  console.log('🔗 2. RELATIONS (FOREIGN KEYS)');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Aucune foreign key trouvée');
    } else {
      console.log(`📊 Total: ${result.rows.length} relations\n`);
      
      let currentTable = '';
      result.rows.forEach(row => {
        if (row.table_name !== currentTable) {
          currentTable = row.table_name;
          console.log(`\n📦 ${row.table_name}:`);
        }
        
        console.log(`   ├─ ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
        console.log(`   │  UPDATE: ${row.update_rule}, DELETE: ${row.delete_rule}`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 3. TRIGGERS DÉTAILLÉS
// ============================================
async function analyzeTriggers() {
  console.log('⚙️  3. TRIGGERS DÉTAILLÉS');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        trigger_schema,
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing,
        action_orientation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total: ${result.rows.length} triggers\n`);

    let currentTable = '';
    result.rows.forEach(trigger => {
      if (trigger.event_object_table !== currentTable) {
        currentTable = trigger.event_object_table;
        console.log(`\n📦 ${trigger.event_object_table}:`);
      }
      
      console.log(`\n   ⚡ ${trigger.trigger_name}`);
      console.log(`      ├─ Timing: ${trigger.action_timing} ${trigger.event_manipulation}`);
      console.log(`      ├─ Type: ${trigger.action_orientation}`);
      console.log(`      └─ Action: ${trigger.action_statement.substring(0, 80)}...`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 4. STORED FUNCTIONS
// ============================================
async function analyzeStoredFunctions() {
  console.log('🔧 4. FONCTIONS STOCKÉES (STORED FUNCTIONS)');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type,
        l.lanname as language,
        CASE 
          WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
          WHEN p.provolatile = 's' THEN 'STABLE'
          WHEN p.provolatile = 'v' THEN 'VOLATILE'
        END as volatility,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total: ${result.rows.length} fonctions\n`);

    result.rows.forEach((func, i) => {
      console.log(`\n${i + 1}. 🔧 ${func.function_name}`);
      console.log(`   ├─ Arguments: ${func.arguments || 'none'}`);
      console.log(`   ├─ Retour: ${func.return_type}`);
      console.log(`   ├─ Langage: ${func.language}`);
      console.log(`   ├─ Volatilité: ${func.volatility}`);
      console.log(`   └─ Définition:`);
      
      // Afficher la définition avec indentation
      const lines = func.definition.split('\n');
      lines.slice(0, 20).forEach(line => {
        console.log(`      ${line}`);
      });
      
      if (lines.length > 20) {
        console.log(`      ... (${lines.length - 20} lignes supplémentaires)`);
      }
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 5. POLITIQUES RLS DÉTAILLÉES
// ============================================
async function analyzeRLSPolicies() {
  console.log('🔐 5. POLITIQUES RLS DÉTAILLÉES');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles::text,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total: ${result.rows.length} policies\n`);

    let currentTable = '';
    result.rows.forEach(policy => {
      if (policy.tablename !== currentTable) {
        currentTable = policy.tablename;
        console.log(`\n📦 TABLE: ${policy.tablename}`);
        
        // Vérifier si RLS est activé
        const rlsQuery = `
          SELECT relrowsecurity 
          FROM pg_class 
          WHERE relname = '${policy.tablename}';
        `;
        // Note: cette query sera exécutée plus tard
      }
      
      console.log(`\n   🔐 ${policy.policyname}`);
      console.log(`      ├─ Commande: ${policy.cmd}`);
      console.log(`      ├─ Rôles: ${policy.roles || 'all'}`);
      console.log(`      ├─ Type: ${policy.permissive}`);
      
      if (policy.qual) {
        console.log(`      ├─ Condition (USING):`);
        console.log(`      │  ${policy.qual}`);
      }
      
      if (policy.with_check) {
        console.log(`      └─ Vérification (WITH CHECK):`);
        console.log(`         ${policy.with_check}`);
      } else {
        console.log(`      └─ Pas de WITH CHECK`);
      }
    });

    // Vérifier les tables sans policies
    const noPolicyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN (
          SELECT DISTINCT tablename 
          FROM pg_policies 
          WHERE schemaname = 'public'
        )
      ORDER BY table_name;
    `;

    const noPolicyResult = await client.query(noPolicyQuery);
    
    if (noPolicyResult.rows.length > 0) {
      console.log(`\n⚠️  TABLES SANS POLICIES RLS (${noPolicyResult.rows.length}):`);
      noPolicyResult.rows.forEach(row => {
        console.log(`   ❌ ${row.table_name}`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 6. INDEX DÉTAILLÉS
// ============================================
async function analyzeIndexesDetailed() {
  console.log('⚡ 6. INDEX DÉTAILLÉS');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexname::regclass) DESC;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total: ${result.rows.length} index\n`);

    // Top 10 plus gros index
    console.log('🔝 Top 10 plus gros index:\n');
    result.rows.slice(0, 10).forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.indexname} (${idx.size})`);
      console.log(`   ├─ Table: ${idx.tablename}`);
      console.log(`   └─ Définition: ${idx.indexdef.substring(0, 80)}...`);
    });

    // Par table
    console.log('\n\n📋 Index par table:\n');
    let currentTable = '';
    result.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        currentTable = idx.tablename;
        console.log(`\n📦 ${idx.tablename}:`);
      }
      
      console.log(`   ├─ ${idx.indexname} (${idx.size})`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 7. ANALYSE DES FROZEN AMOUNTS
// ============================================
async function analyzeFrozenAmountsLogic() {
  console.log('🧊 7. ANALYSE FROZEN AMOUNTS LOGIC');
  console.log('-'.repeat(80));

  try {
    // Vérifier la fonction de protection
    const funcQuery = `
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname LIKE '%frozen%'
      ORDER BY proname;
    `;

    const funcResult = await client.query(funcQuery);
    
    if (funcResult.rows.length > 0) {
      console.log('🔧 Fonctions liées au frozen:\n');
      funcResult.rows.forEach((func, i) => {
        console.log(`\n${i + 1}. Fonction:`);
        console.log(func.definition);
        console.log('');
      });
    }

    // Vérifier les triggers protect_frozen_amount
    const triggerQuery = `
      SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        pg_get_triggerdef(t.oid) as definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgname LIKE '%frozen%'
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY c.relname;
    `;

    const triggerResult = await client.query(triggerQuery);
    
    if (triggerResult.rows.length > 0) {
      console.log('⚡ Triggers protect_frozen_amount:\n');
      triggerResult.rows.forEach(trigger => {
        console.log(`\n📦 ${trigger.table_name}:`);
        console.log(`   Trigger: ${trigger.trigger_name}`);
        console.log(`   Définition: ${trigger.definition}`);
      });
    }

    // Analyser les frozen amounts actuels
    console.log('\n\n📊 État actuel des frozen amounts:\n');
    
    // Users
    const usersQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN frozen_balance > 0 THEN 1 END) as with_frozen,
        SUM(frozen_balance) as total_frozen,
        MAX(frozen_balance) as max_frozen
      FROM users;
    `;
    const usersResult = await client.query(usersQuery);
    
    console.log('👥 Users:');
    console.log(`   ├─ Avec frozen: ${usersResult.rows[0].with_frozen}/${usersResult.rows[0].total}`);
    console.log(`   ├─ Total frozen: ${parseFloat(usersResult.rows[0].total_frozen || 0).toLocaleString('fr-FR')} XOF`);
    console.log(`   └─ Max frozen: ${parseFloat(usersResult.rows[0].max_frozen || 0).toLocaleString('fr-FR')} XOF`);

    // Activations
    const activationsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(frozen_amount) as total_frozen
      FROM activations
      WHERE frozen_amount > 0
      GROUP BY status
      ORDER BY total_frozen DESC;
    `;
    const activationsResult = await client.query(activationsQuery);
    
    console.log('\n📱 Activations avec frozen:');
    activationsResult.rows.forEach(row => {
      console.log(`   ├─ ${row.status}: ${row.count} (${parseFloat(row.total_frozen).toLocaleString('fr-FR')} XOF)`);
    });

    // Rentals
    const rentalsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(frozen_amount) as total_frozen
      FROM rentals
      WHERE frozen_amount > 0
      GROUP BY status
      ORDER BY total_frozen DESC;
    `;
    const rentalsResult = await client.query(rentalsQuery);
    
    console.log('\n🏠 Rentals avec frozen:');
    rentalsResult.rows.forEach(row => {
      console.log(`   ├─ ${row.status}: ${row.count} (${parseFloat(row.total_frozen).toLocaleString('fr-FR')} XOF)`);
    });

    // Incohérences
    console.log('\n\n⚠️  INCOHÉRENCES FROZEN:\n');
    
    const incoherenceQuery = `
      SELECT 
        u.id,
        u.email,
        u.balance,
        u.frozen_balance,
        COALESCE(SUM(a.frozen_amount), 0) as activations_frozen,
        COALESCE(SUM(r.frozen_amount), 0) as rentals_frozen
      FROM users u
      LEFT JOIN activations a ON a.user_id = u.id AND a.frozen_amount > 0
      LEFT JOIN rentals r ON r.user_id = u.id AND r.frozen_amount > 0
      GROUP BY u.id, u.email, u.balance, u.frozen_balance
      HAVING u.frozen_balance != COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)
      ORDER BY u.frozen_balance DESC;
    `;
    const incoherenceResult = await client.query(incoherenceQuery);
    
    if (incoherenceResult.rows.length > 0) {
      console.log(`❌ ${incoherenceResult.rows.length} utilisateurs avec incohérence:\n`);
      incoherenceResult.rows.forEach(user => {
        const expected = parseFloat(user.activations_frozen) + parseFloat(user.rentals_frozen);
        console.log(`${user.email}:`);
        console.log(`   ├─ Frozen user: ${parseFloat(user.frozen_balance).toLocaleString('fr-FR')} XOF`);
        console.log(`   ├─ Frozen activations: ${parseFloat(user.activations_frozen).toLocaleString('fr-FR')} XOF`);
        console.log(`   ├─ Frozen rentals: ${parseFloat(user.rentals_frozen).toLocaleString('fr-FR')} XOF`);
        console.log(`   ├─ Total attendu: ${expected.toLocaleString('fr-FR')} XOF`);
        console.log(`   └─ Différence: ${(parseFloat(user.frozen_balance) - expected).toLocaleString('fr-FR')} XOF`);
      });
    } else {
      console.log('✅ Pas d\'incohérence frozen détectée');
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 8. ANALYSE BALANCE OPERATIONS
// ============================================
async function analyzeBalanceOperations() {
  console.log('💼 8. ANALYSE BALANCE OPERATIONS');
  console.log('-'.repeat(80));

  try {
    // Structure de la table
    const structQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'balance_operations'
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const structResult = await client.query(structQuery);
    
    console.log('📋 Structure de balance_operations:\n');
    structResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 30)}` : '';
      console.log(`   ├─ ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
    });

    // Stats globales
    const statsQuery = `
      SELECT 
        operation_type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as avg_amount,
        MIN(created_at) as first_op,
        MAX(created_at) as last_op
      FROM balance_operations
      GROUP BY operation_type
      ORDER BY count DESC;
    `;

    const statsResult = await client.query(statsQuery);
    
    console.log('\n\n📊 Stats par type d\'opération:\n');
    statsResult.rows.forEach(row => {
      console.log(`${row.operation_type}:`);
      console.log(`   ├─ Nombre: ${row.count}`);
      console.log(`   ├─ Total: ${parseFloat(row.total || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Moyenne: ${parseFloat(row.avg_amount || 0).toLocaleString('fr-FR')} XOF`);
      console.log(`   ├─ Première: ${new Date(row.first_op).toLocaleString('fr-FR')}`);
      console.log(`   └─ Dernière: ${new Date(row.last_op).toLocaleString('fr-FR')}`);
    });

    // Opérations avec problèmes
    console.log('\n\n⚠️  OPÉRATIONS PROBLÉMATIQUES:\n');
    
    const problemsQuery = `
      SELECT 
        bo.*,
        u.email
      FROM balance_operations bo
      JOIN users u ON u.id = bo.user_id
      WHERE balance_after != balance_before + amount
      ORDER BY bo.created_at DESC
      LIMIT 10;
    `;

    const problemsResult = await client.query(problemsQuery);
    
    if (problemsResult.rows.length > 0) {
      console.log(`❌ ${problemsResult.rows.length} opérations avec calcul incorrect:\n`);
      problemsResult.rows.forEach((op, i) => {
        const expected = parseFloat(op.balance_before) + parseFloat(op.amount);
        const actual = parseFloat(op.balance_after);
        
        console.log(`${i + 1}. ${op.operation_type} - ${op.email}`);
        console.log(`   ├─ Balance avant: ${parseFloat(op.balance_before).toLocaleString('fr-FR')}`);
        console.log(`   ├─ Montant: ${parseFloat(op.amount).toLocaleString('fr-FR')}`);
        console.log(`   ├─ Balance après (attendue): ${expected.toLocaleString('fr-FR')}`);
        console.log(`   ├─ Balance après (réelle): ${actual.toLocaleString('fr-FR')}`);
        console.log(`   └─ Différence: ${(actual - expected).toLocaleString('fr-FR')}`);
      });
    } else {
      console.log('✅ Tous les calculs sont corrects');
    }

    // Top users par activité
    const topUsersQuery = `
      SELECT 
        u.email,
        COUNT(*) as op_count,
        SUM(bo.amount) as total_change
      FROM balance_operations bo
      JOIN users u ON u.id = bo.user_id
      GROUP BY u.id, u.email
      ORDER BY op_count DESC
      LIMIT 5;
    `;

    const topUsersResult = await client.query(topUsersQuery);
    
    console.log('\n\n🏆 Top 5 users par opérations:\n');
    topUsersResult.rows.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}: ${user.op_count} opérations (${parseFloat(user.total_change).toLocaleString('fr-FR')} XOF)`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 9. ANALYSE DES VUES (VIEWS)
// ============================================
async function analyzeViews() {
  console.log('👁️  9. VUES (VIEWS)');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('ℹ️  Aucune vue trouvée');
    } else {
      console.log(`📊 Total: ${result.rows.length} vues\n`);
      
      result.rows.forEach((view, i) => {
        console.log(`\n${i + 1}. 👁️  ${view.table_name}`);
        console.log(`   Définition:`);
        console.log(`   ${view.view_definition.substring(0, 200)}...`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 10. SEQUENCES
// ============================================
async function analyzeSequences() {
  console.log('🔢 10. SEQUENCES');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name;
    `;

    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('ℹ️  Aucune séquence trouvée (utilisation de UUID)');
    } else {
      console.log(`📊 Total: ${result.rows.length} séquences\n`);
      
      result.rows.forEach((seq, i) => {
        console.log(`${i + 1}. ${seq.sequence_name}`);
        console.log(`   ├─ Type: ${seq.data_type}`);
        console.log(`   ├─ Valeur initiale: ${seq.start_value}`);
        console.log(`   ├─ Min: ${seq.minimum_value}, Max: ${seq.maximum_value}`);
        console.log(`   ├─ Incrément: ${seq.increment}`);
        console.log(`   └─ Cycle: ${seq.cycle_option}`);
      });
    }

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 11. ANALYSE DES EXTENSIONS
// ============================================
async function analyzeExtensions() {
  console.log('🧩 11. EXTENSIONS POSTGRESQL');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT 
        extname as name,
        extversion as version,
        extrelocatable as relocatable
      FROM pg_extension
      ORDER BY extname;
    `;

    const result = await client.query(query);
    
    console.log(`📊 Total: ${result.rows.length} extensions\n`);
    
    result.rows.forEach((ext, i) => {
      console.log(`${i + 1}. ${ext.name} (v${ext.version})`);
    });

  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  console.log('');
}

// ============================================
// 12. STATISTIQUES DES TABLES
// ============================================
async function analyzeTableStatistics() {
  console.log('📈 12. STATISTIQUES DES TABLES');
  console.log('-'.repeat(80));

  try {
    const query = `
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;
    `;

    const result = await client.query(query);
    
    console.log('📊 Activité des tables:\n');
    
    result.rows.forEach((stat, i) => {
      const totalOps = parseInt(stat.inserts) + parseInt(stat.updates) + parseInt(stat.deletes);
      
      if (totalOps > 0) {
        console.log(`\n${i + 1}. 📦 ${stat.tablename}`);
        console.log(`   ├─ Insertions: ${parseInt(stat.inserts).toLocaleString()}`);
        console.log(`   ├─ Mises à jour: ${parseInt(stat.updates).toLocaleString()}`);
        console.log(`   ├─ Suppressions: ${parseInt(stat.deletes).toLocaleString()}`);
        console.log(`   ├─ Lignes vivantes: ${parseInt(stat.live_rows).toLocaleString()}`);
        console.log(`   ├─ Lignes mortes: ${parseInt(stat.dead_rows).toLocaleString()}`);
        
        if (stat.last_vacuum) {
          console.log(`   ├─ Dernier vacuum: ${new Date(stat.last_vacuum).toLocaleString('fr-FR')}`);
        }
        if (stat.last_analyze) {
          console.log(`   └─ Dernier analyze: ${new Date(stat.last_analyze).toLocaleString('fr-FR')}`);
        }
      }
    });

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
    console.log('🔌 Connexion...\n');
    await client.connect();
    console.log('✅ Connecté !\n');

    await analyzeTableStructure();
    await analyzeForeignKeys();
    await analyzeTriggers();
    await analyzeStoredFunctions();
    await analyzeRLSPolicies();
    await analyzeIndexesDetailed();
    await analyzeFrozenAmountsLogic();
    await analyzeBalanceOperations();
    await analyzeViews();
    await analyzeSequences();
    await analyzeExtensions();
    await analyzeTableStatistics();

    console.log('='.repeat(80));
    console.log('✅ ANALYSE SQL COMPLÈTE TERMINÉE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

main();
