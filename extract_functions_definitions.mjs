const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

const functionsToExtract = [
  'reconcile_frozen_balance',
  'fix_frozen_balance_discrepancy',
  'secure_freeze_balance',
  'secure_unfreeze_balance',
  'atomic_freeze',
  'atomic_refund',
  'atomic_refund_direct',
  'atomic_commit',
  'admin_add_credit',
  'transfer_service_stock',
  'process_sms_received',
  'process_expired_activations',
  'expire_rentals',
  'lock_user_wallet',
  'prevent_direct_frozen_clear_activation',
  'prevent_direct_frozen_clear_rental',
  'prevent_direct_frozen_amount_update',
  'ensure_user_balance_ledger',
  'check_frozen_discrepancies',
  'log_event',
  'get_cron_jobs',
  'get_setting',
  'update_setting'
];

async function extractFunctions() {
  console.log('🔍 EXTRACTION DES FONCTIONS - search_path fix\n');
  console.log('='.repeat(60));
  
  let sqlOutput = `-- ===================================================================
-- FONCTIONS MÉTIER - search_path fix
-- Date: ${new Date().toISOString().split('T')[0]}
-- Généré automatiquement
-- ===================================================================

`;

  for (const funcName of functionsToExtract) {
    console.log(`\n📦 Extraction: ${funcName}`);
    
    try {
      // Requête pour obtenir la définition complète de la fonction
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT pg_get_functiondef(oid) as definition
          FROM pg_proc
          WHERE proname = '${funcName}'
          AND pronamespace = 'public'::regnamespace;
        `
      });
      
      if (error) {
        console.log('   ❌ Erreur:', error.message);
        sqlOutput += `-- ❌ ERREUR: ${funcName} - ${error.message}\n\n`;
        continue;
      }
      
      if (!data || data.length === 0) {
        console.log('   ⚠️ Fonction non trouvée');
        sqlOutput += `-- ⚠️ FONCTION NON TROUVÉE: ${funcName}\n\n`;
        continue;
      }
      
      let definition = data[0].definition;
      
      // Vérifier si search_path est déjà défini
      if (definition.includes('SET search_path')) {
        console.log('   ✅ search_path déjà défini');
        sqlOutput += `-- ✅ ${funcName} - search_path déjà défini\n${definition}\n\n`;
      } else {
        // Ajouter SET search_path = '' avant AS $$
        const modifiedDef = definition.replace(/\s+AS\s+\$\$/i, "\n    SET search_path = ''\nAS $$");
        console.log('   🔧 search_path ajouté');
        sqlOutput += `-- 🔧 ${funcName} - search_path ajouté\n${modifiedDef}\n\n`;
      }
      
    } catch (err) {
      console.log('   ❌ Exception:', err.message);
      sqlOutput += `-- ❌ EXCEPTION: ${funcName} - ${err.message}\n\n`;
    }
  }
  
  // Sauvegarder dans un fichier
  fs.writeFileSync('fix_business_functions_search_path.sql', sqlOutput);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Extraction terminée');
  console.log('📄 Fichier créé: fix_business_functions_search_path.sql');
  console.log('\n🎯 Prochaines étapes:');
  console.log('   1. Vérifier le fichier généré');
  console.log('   2. Tester en staging si possible');
  console.log('   3. Exécuter dans Supabase SQL Editor');
}

extractFunctions();
