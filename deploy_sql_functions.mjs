import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🚀 DÉPLOIEMENT DES FONCTIONS SQL MANQUANTES\n');
console.log('='.repeat(70));

async function executeSQLFile(filePath, description) {
  console.log(`\n📄 ${description}`);
  console.log(`   Fichier: ${filePath}`);
  
  try {
    const sqlContent = readFileSync(filePath, 'utf-8');
    
    // Séparer les commandes SQL (split sur les ; qui ne sont pas dans des fonctions)
    // Pour simplifier, on va exécuter le fichier en une seule requête
    console.log(`   Taille: ${(sqlContent.length / 1024).toFixed(1)} KB`);
    console.log(`   Exécution...`);
    
    // Utiliser rpc pour exécuter du SQL brut n'est pas possible
    // On doit utiliser l'API REST directement
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sqlContent })
    });

    if (response.ok) {
      console.log(`   ✅ Déployé avec succès!`);
      return true;
    } else {
      const error = await response.text();
      console.log(`   ❌ Erreur: ${error}`);
      return false;
    }
  } catch (err) {
    console.error(`   ❌ Erreur: ${err.message}`);
    return false;
  }
}

async function deployViaDashboard() {
  console.log('\n' + '='.repeat(70));
  console.log('\n⚠️ MÉTHODE ALTERNATIVE REQUISE\n');
  console.log('Les fonctions SQL ne peuvent pas être déployées via l\'API REST.');
  console.log('Tu dois les exécuter manuellement dans le Supabase Dashboard.\n');
  console.log('🔗 URL: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql\n');
  console.log('📋 INSTRUCTIONS:\n');
  console.log('1. Ouvre le SQL Editor dans Supabase Dashboard');
  console.log('2. Copie le contenu du fichier migrations/secure_frozen_balance_system.sql');
  console.log('3. Colle et exécute dans le SQL Editor');
  console.log('4. Répète pour migrations/20251203_create_atomic_timeout_processor.sql\n');
  console.log('Ou utilise cette commande pour copier dans le clipboard:\n');
  console.log('   pbcopy < migrations/secure_frozen_balance_system.sql\n');
  console.log('='.repeat(70));
}

async function main() {
  // Méthode alternative: générer un seul fichier SQL consolidé
  console.log('\n💡 Génération d\'un fichier SQL consolidé...\n');
  
  const migrations = [
    'migrations/secure_frozen_balance_system.sql',
    'supabase/migrations/20251203_create_atomic_timeout_processor.sql'
  ];

  let consolidatedSQL = '';
  consolidatedSQL += '-- ============================================================\n';
  consolidatedSQL += '-- DÉPLOIEMENT URGENT: Fonctions SQL Manquantes\n';
  consolidatedSQL += '-- Date: 2025-12-03\n';
  consolidatedSQL += '-- Fix pour: 33 activations fantômes (227 Ⓐ perdus)\n';
  consolidatedSQL += '-- ============================================================\n\n';

  for (const migration of migrations) {
    try {
      const content = readFileSync(migration, 'utf-8');
      consolidatedSQL += `\n-- ============================================================\n`;
      consolidatedSQL += `-- Fichier: ${migration}\n`;
      consolidatedSQL += `-- ============================================================\n\n`;
      consolidatedSQL += content;
      consolidatedSQL += '\n\n';
      console.log(`   ✅ Ajouté: ${migration}`);
    } catch (err) {
      console.log(`   ❌ Erreur lecture ${migration}: ${err.message}`);
    }
  }

  // Sauvegarder le fichier consolidé
  const { writeFileSync } = await import('fs');
  const outputFile = 'DEPLOY_SQL_FUNCTIONS_NOW.sql';
  writeFileSync(outputFile, consolidatedSQL);
  
  console.log(`\n✅ Fichier consolidé créé: ${outputFile}`);
  console.log(`   Taille: ${(consolidatedSQL.length / 1024).toFixed(1)} KB`);
  
  await deployViaDashboard();
  
  console.log('\n🎯 ÉTAPES SUIVANTES:\n');
  console.log('1. Copier le fichier SQL dans le clipboard:');
  console.log(`   pbcopy < ${outputFile}`);
  console.log('\n2. Ouvrir Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new');
  console.log('\n3. Coller (Cmd+V) et Exécuter (Cmd+Enter)');
  console.log('\n4. Vérifier le déploiement:');
  console.log('   node verify_sql_functions.mjs');
  console.log('\n5. Restaurer les 227 Ⓐ perdus:');
  console.log('   node restore_phantom_balances.mjs');
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
