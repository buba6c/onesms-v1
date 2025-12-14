#!/usr/bin/env node
/**
 * 🔍 DEEP ANALYSE STRUCTURE COOLIFY
 * Analyse des contraintes, RLS, fonctions, triggers
 */

import pg from 'pg';

const { Pool } = pg;

const COOLIFY_DB = 'postgresql://postgres:E7UoY5167bMG3xlw7b0pDKfxIdkm1NE1@46.202.171.108:5432/postgres';

const pool = new Pool({
  connectionString: COOLIFY_DB,
  ssl: false
});

async function main() {
  console.log('🔍 DEEP ANALYSE STRUCTURE COOLIFY');
  console.log('='.repeat(70));
  console.log(`📅 ${new Date().toISOString()}\n`);

  const client = await pool.connect();

  try {
    // ===== 1. TABLES =====
    console.log('1️⃣ TABLES PUBLIQUES');
    console.log('-'.repeat(50));
    
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach(t => {
      console.log(`   📋 ${t.table_name} (${t.columns} colonnes)`);
    });
    console.log(`\n   Total: ${tablesResult.rows.length} tables\n`);

    // ===== 2. CONTRAINTES FOREIGN KEY =====
    console.log('2️⃣ CONTRAINTES FOREIGN KEY');
    console.log('-'.repeat(50));
    
    const fkResult = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);
    
    if (fkResult.rows.length === 0) {
      console.log('   ⚠️ Aucune contrainte FK trouvée\n');
    } else {
      fkResult.rows.forEach(fk => {
        console.log(`   🔗 ${fk.table_name}.${fk.column_name} → ${fk.foreign_table}.${fk.foreign_column}`);
      });
      console.log(`\n   Total: ${fkResult.rows.length} FK\n`);
    }

    // ===== 3. CONTRAINTES CHECK =====
    console.log('3️⃣ CONTRAINTES CHECK');
    console.log('-'.repeat(50));
    
    const checkResult = await client.query(`
      SELECT tc.table_name, tc.constraint_name, cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
      AND tc.table_schema = 'public'
      AND tc.constraint_name NOT LIKE '%_not_null'
      ORDER BY tc.table_name
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('   ⚠️ Aucune contrainte CHECK trouvée\n');
    } else {
      checkResult.rows.forEach(c => {
        console.log(`   ✓ ${c.table_name}: ${c.constraint_name}`);
        console.log(`     ${c.check_clause.substring(0, 80)}...`);
      });
      console.log(`\n   Total: ${checkResult.rows.length} CHECK\n`);
    }

    // ===== 4. RLS POLICIES =====
    console.log('4️⃣ RLS POLICIES');
    console.log('-'.repeat(50));
    
    const rlsResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    
    if (rlsResult.rows.length === 0) {
      console.log('   ⚠️ Aucune politique RLS trouvée\n');
    } else {
      let currentTable = '';
      rlsResult.rows.forEach(p => {
        if (p.tablename !== currentTable) {
          currentTable = p.tablename;
          console.log(`\n   📋 ${p.tablename}:`);
        }
        console.log(`      - ${p.policyname} (${p.cmd}) [${p.roles}]`);
      });
      console.log(`\n   Total: ${rlsResult.rows.length} policies\n`);
    }

    // ===== 5. RLS ENABLED =====
    console.log('5️⃣ TABLES AVEC RLS ACTIVÉ');
    console.log('-'.repeat(50));
    
    const rlsEnabledResult = await client.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
      ORDER BY relname
    `);
    
    const rlsEnabled = rlsEnabledResult.rows.filter(r => r.relrowsecurity);
    const rlsDisabled = rlsEnabledResult.rows.filter(r => !r.relrowsecurity);
    
    console.log('   ✅ RLS activé:');
    rlsEnabled.forEach(t => console.log(`      - ${t.relname}`));
    
    console.log('\n   ❌ RLS désactivé:');
    rlsDisabled.forEach(t => console.log(`      - ${t.relname}`));
    console.log();

    // ===== 6. FONCTIONS =====
    console.log('6️⃣ FONCTIONS PERSONNALISÉES');
    console.log('-'.repeat(50));
    
    const functionsResult = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `);
    
    if (functionsResult.rows.length === 0) {
      console.log('   ⚠️ Aucune fonction personnalisée trouvée\n');
    } else {
      functionsResult.rows.forEach(f => {
        console.log(`   ⚡ ${f.routine_name} (${f.routine_type})`);
      });
      console.log(`\n   Total: ${functionsResult.rows.length} fonctions\n`);
    }

    // ===== 7. TRIGGERS =====
    console.log('7️⃣ TRIGGERS');
    console.log('-'.repeat(50));
    
    const triggersResult = await client.query(`
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    
    if (triggersResult.rows.length === 0) {
      console.log('   ⚠️ Aucun trigger trouvé\n');
    } else {
      triggersResult.rows.forEach(t => {
        console.log(`   ⚡ ${t.event_object_table}: ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`);
      });
      console.log(`\n   Total: ${triggersResult.rows.length} triggers\n`);
    }

    // ===== 8. INDEXES =====
    console.log('8️⃣ INDEXES');
    console.log('-'.repeat(50));
    
    const indexesResult = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    const indexesByTable = {};
    indexesResult.rows.forEach(i => {
      if (!indexesByTable[i.tablename]) indexesByTable[i.tablename] = [];
      indexesByTable[i.tablename].push(i.indexname);
    });
    
    Object.entries(indexesByTable).forEach(([table, indexes]) => {
      console.log(`   📋 ${table}: ${indexes.length} indexes`);
    });
    console.log(`\n   Total: ${indexesResult.rows.length} indexes\n`);

    // ===== 9. EXTENSIONS =====
    console.log('9️⃣ EXTENSIONS');
    console.log('-'.repeat(50));
    
    const extResult = await client.query(`
      SELECT extname, extversion
      FROM pg_extension
      ORDER BY extname
    `);
    
    extResult.rows.forEach(e => {
      console.log(`   📦 ${e.extname} v${e.extversion}`);
    });
    console.log();

    // ===== RÉSUMÉ =====
    console.log('='.repeat(70));
    console.log('📊 RÉSUMÉ STRUCTURE COOLIFY');
    console.log('='.repeat(70));
    console.log(`   Tables: ${tablesResult.rows.length}`);
    console.log(`   Foreign Keys: ${fkResult.rows.length}`);
    console.log(`   Check Constraints: ${checkResult.rows.length}`);
    console.log(`   RLS Policies: ${rlsResult.rows.length}`);
    console.log(`   Fonctions: ${functionsResult.rows.length}`);
    console.log(`   Triggers: ${triggersResult.rows.length}`);
    console.log(`   Indexes: ${indexesResult.rows.length}`);
    console.log(`   Extensions: ${extResult.rows.length}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
