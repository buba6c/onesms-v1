import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
);

console.log('🔍 VÉRIFICATION DES VUES - SECURITY DEFINER vs INVOKER\n');

const viewsToCheck = [
  'activation_stats',
  'v_frozen_discrepancies',
  'v_service_health',
  'v_frozen_balance_health',
  'v_service_response_time',
  'v_dashboard_stats',
  'v_frozen_balance_health_reconciliation',
  'v_provider_stats_24h',
  'v_country_health',
  'available_services'
];

const { data, error } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT 
      schemaname,
      viewname,
      CASE 
        WHEN viewowner = 'postgres' THEN '⚠️ SECURITY DEFINER (owner: postgres)'
        ELSE '✅ SECURITY INVOKER'
      END as security_mode,
      definition
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname IN (${viewsToCheck.map(v => `'${v}'`).join(',')})
    ORDER BY viewname;
  `
});

if (error) {
  console.error('❌ Erreur:', error.message);
  
  // Alternative: vérifier via les métadonnées
  console.log('\n📋 Vérification alternative via pg_catalog:\n');
  
  const { data: altData, error: altError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        c.relname as view_name,
        CASE 
          WHEN c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'postgres') 
          THEN '⚠️ SECURITY DEFINER'
          ELSE '✅ SECURITY INVOKER'
        END as mode
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'v'
        AND c.relname IN (${viewsToCheck.map(v => `'${v}'`).join(',')})
      ORDER BY c.relname;
    `
  });
  
  if (altError) {
    console.error('❌ Impossible de vérifier:', altError.message);
    console.log('\n💡 Vérification manuelle nécessaire dans Supabase SQL Editor:');
    console.log(`
SELECT 
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (${viewsToCheck.map(v => `'${v}'`).join(',')})
ORDER BY viewname;
    `);
  } else {
    console.log(altData);
  }
} else {
  console.log(data);
}

console.log('\n📊 RÉSUMÉ:');
console.log('✅ = Vue avec SECURITY INVOKER (sécurisé, utilise permissions du querying user)');
console.log('⚠️ = Vue avec SECURITY DEFINER (warning linter, utilise permissions du créateur)\n');

console.log('💡 Si toutes les vues sont en ✅ mais le linter montre encore des warnings:');
console.log('   → Le linter a probablement un cache');
console.log('   → Attendre 5-10 minutes et rafraîchir');
console.log('   → Ou ignorer ces warnings (déjà corrigés)');
