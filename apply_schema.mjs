#!/usr/bin/env node
/**
 * 🚀 MIGRATION INTELLIGENTE: Appliquer le dump SQL sur Coolify
 * Exécute le dump_production.sql par morceaux via l'API pg/query
 */

import fs from 'fs';

const COOLIFY_URL = 'http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io';
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y';

async function execSQL(query) {
  const res = await fetch(`${COOLIFY_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text);
  }
  return text;
}

async function main() {
  console.log('🚀 APPLICATION DU SCHÉMA SUR COOLIFY');
  console.log('='.repeat(60));
  
  // Lire le dump
  const dumpPath = '/Users/mac/Desktop/ONE SMS V1/dump_production.sql';
  const sql = fs.readFileSync(dumpPath, 'utf-8');
  
  console.log(`📄 Fichier: ${dumpPath}`);
  console.log(`📊 Taille: ${(sql.length / 1024).toFixed(1)} KB`);
  console.log(`📊 Lignes: ${sql.split('\n').length}`);
  
  // Nettoyer le SQL
  let cleanSql = sql
    // Supprimer les commentaires de pg_dump
    .replace(/^--.*$/gm, '')
    // Supprimer les lignes vides multiples
    .replace(/\n{3,}/g, '\n\n')
    // Supprimer les SET qui peuvent poser problème
    .replace(/^SET .+;$/gm, '')
    // Supprimer les SELECT pg_catalog
    .replace(/^SELECT pg_catalog.+;$/gm, '')
    // Supprimer les ALTER ... OWNER TO
    .replace(/^ALTER .+ OWNER TO .+;$/gm, '')
    // Supprimer les COMMENT ON
    .replace(/^COMMENT ON .+;$/gm, '')
    // Supprimer les GRANT/REVOKE
    .replace(/^GRANT .+;$/gm, '')
    .replace(/^REVOKE .+;$/gm, '');
  
  // Diviser en statements
  const statements = cleanSql
    .split(/;[\s\n]+(?=CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE)/i)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  
  console.log(`📋 ${statements.length} statements à exécuter\n`);
  
  let success = 0;
  let errors = 0;
  const errorMessages = [];
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Identifier le type de statement
    const type = stmt.match(/^(CREATE|ALTER|DROP|INSERT)/i)?.[1] || 'OTHER';
    const name = stmt.match(/(?:TABLE|FUNCTION|INDEX|VIEW|TRIGGER)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?["']?(\w+)/i)?.[1] || '';
    
    process.stdout.write(`\r   [${i+1}/${statements.length}] ${type} ${name}`.padEnd(60));
    
    try {
      await execSQL(stmt + ';');
      success++;
    } catch (e) {
      errors++;
      const msg = e.message.slice(0, 100);
      if (!errorMessages.includes(msg)) {
        errorMessages.push(msg);
      }
    }
  }
  
  console.log(`\n\n✅ Succès: ${success}`);
  console.log(`❌ Erreurs: ${errors}`);
  
  if (errorMessages.length > 0 && errorMessages.length < 10) {
    console.log('\n📋 Types d\'erreurs:');
    errorMessages.forEach(e => console.log(`   - ${e}`));
  }
  
  // Vérification
  console.log('\n📊 VÉRIFICATION DES TABLES...');
  const result = await execSQL(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const tables = JSON.parse(result);
  console.log(`\n${tables.length} tables créées:`);
  tables.forEach(t => console.log(`   ✅ ${t.table_name}`));
}

main().catch(console.error);
