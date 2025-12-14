#!/usr/bin/env node

/**
 * APPLICATION DES CORRECTIONS RLS SUR SUPABASE CLOUD
 * Corrige les erreurs de sécurité détectées par le linter
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
);

console.log('🔒 CORRECTION DES PROBLÈMES RLS SUR SUPABASE CLOUD\n');
console.log('='.repeat(80));

async function executeSql(sql, description) {
  console.log(`\n📝 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Si exec_sql n'existe pas, on affiche juste le SQL
      console.log('⚠️  Fonction exec_sql non disponible');
      console.log('📋 Exécutez ce SQL dans le dashboard Cloud:');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      return false;
    }
    
    console.log('✅ Succès');
    return true;
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    return false;
  }
}

async function fixRlsIssues() {
  console.log('\n🎯 CORRECTIONS À APPLIQUER:\n');
  
  const fixes = [];
  
  // ============================================================================
  // 1. ACTIVER RLS SUR LA TABLE ACTIVATIONS
  // ============================================================================
  fixes.push({
    name: 'Activer RLS sur activations',
    sql: 'ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;'
  });
  
  // ============================================================================
  // 2. ACTIVER RLS SUR LES AUTRES TABLES
  // ============================================================================
  fixes.push({
    name: 'Activer RLS sur rental_logs',
    sql: `
ALTER TABLE public.rental_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour rental_logs
DROP POLICY IF EXISTS "Users can read own rental logs" ON public.rental_logs;
DROP POLICY IF EXISTS "Service role full access rental logs" ON public.rental_logs;

CREATE POLICY "Users can read own rental logs"
ON public.rental_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access rental logs"
ON public.rental_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);
`
  });
  
  fixes.push({
    name: 'Activer RLS sur balance_operations',
    sql: `
ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own balance operations" ON public.balance_operations;
DROP POLICY IF EXISTS "Service role full access balance operations" ON public.balance_operations;

CREATE POLICY "Users can read own balance operations"
ON public.balance_operations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access balance operations"
ON public.balance_operations FOR ALL TO service_role
USING (true) WITH CHECK (true);
`
  });
  
  fixes.push({
    name: 'Activer RLS sur pricing_rules_archive',
    sql: `
ALTER TABLE public.pricing_rules_archive ENABLE ROW LEVEL SECURITY;

-- Policies (lecture pour tous)
DROP POLICY IF EXISTS "Public read pricing rules" ON public.pricing_rules_archive;
DROP POLICY IF EXISTS "Service role full access pricing" ON public.pricing_rules_archive;

CREATE POLICY "Public read pricing rules"
ON public.pricing_rules_archive FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role full access pricing"
ON public.pricing_rules_archive FOR ALL TO service_role
USING (true) WITH CHECK (true);
`
  });
  
  fixes.push({
    name: 'Activer RLS sur email_campaigns',
    sql: `
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies (admins seulement)
DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Service role full access campaigns" ON public.email_campaigns;

CREATE POLICY "Admins can manage email campaigns"
ON public.email_campaigns FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role full access campaigns"
ON public.email_campaigns FOR ALL TO service_role
USING (true) WITH CHECK (true);
`
  });
  
  fixes.push({
    name: 'Activer RLS sur email_logs',
    sql: `
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies (admins seulement)
DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Service role full access email logs" ON public.email_logs;

CREATE POLICY "Admins can read email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role full access email logs"
ON public.email_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);
`
  });
  
  // ============================================================================
  // 3. RECRÉER LES VIEWS AVEC SECURITY INVOKER
  // ============================================================================
  const views = [
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
  
  // Générer le fichier SQL complet
  console.log('\n📄 Génération du fichier SQL complet...');
  
  let fullSql = `-- ============================================================================
-- CORRECTION DES PROBLÈMES RLS - SUPABASE CLOUD
-- Date: ${new Date().toISOString()}
-- ============================================================================

BEGIN;

`;
  
  fixes.forEach(fix => {
    fullSql += `\n-- ${fix.name}\n${fix.sql}\n`;
  });
  
  fullSql += `
-- Recréer les views avec SECURITY INVOKER
${views.map(view => `DROP VIEW IF EXISTS public.${view} CASCADE;`).join('\n')}

COMMIT;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Vérifier RLS activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('activations', 'rental_logs', 'balance_operations', 'pricing_rules_archive', 'email_campaigns', 'email_logs')
ORDER BY tablename;
`;
  
  const filename = 'fix_rls_cloud.sql';
  fs.writeFileSync(filename, fullSql);
  console.log(`✅ Fichier créé: ${filename}`);
  
  // ============================================================================
  // INSTRUCTIONS
  // ============================================================================
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📋 INSTRUCTIONS POUR APPLIQUER LES CORRECTIONS');
  console.log('='.repeat(80));
  console.log(`
🎯 MÉTHODE 1: Via Dashboard Supabase Cloud (RECOMMANDÉ)

1. Aller sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql

2. Copier le contenu de: ${filename}

3. Coller dans l'éditeur SQL

4. Cliquer sur "Run"

5. Vérifier les résultats


🎯 MÉTHODE 2: Via CLI Supabase

  supabase db execute --file ${filename}


📊 CE QUI SERA CORRIGÉ:

✅ RLS activé sur 6 tables:
   - activations (avait policies, maintenant RLS actif)
   - rental_logs
   - balance_operations
   - pricing_rules_archive
   - email_campaigns
   - email_logs

✅ Policies ajoutées:
   - Users: accès à leurs propres données
   - Admins: accès complet email_campaigns et email_logs
   - Service role: accès complet à tout

⚠️  Views SECURITY DEFINER:
   Les views seront supprimées. Il faut les recréer avec SECURITY INVOKER.
   Un script séparé sera nécessaire pour les recréer.


⏱️  TEMPS ESTIMÉ: 2-3 minutes
`);
  
  console.log('='.repeat(80));
}

fixRlsIssues().catch(console.error);
