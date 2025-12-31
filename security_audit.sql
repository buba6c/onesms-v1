-- ============================================================================
-- AUDIT DE SÉCURITÉ COMPLET
-- ============================================================================

-- 1. Vérifier que RLS est actif sur toutes les tables sensibles
SELECT 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ACTIF'
    ELSE '❌ RLS DÉSACTIVÉ'
  END as status
FROM pg_tables 
WHERE schemaname='public' 
  AND tablename IN ('users','transactions','activations','balance_operations','referrals')
ORDER BY tablename;

-- 2. Lister toutes les policies service_role (doivent exister)
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('users','transactions','activations','balance_operations','referrals')
  AND roles::text LIKE '%service_role%'
ORDER BY tablename, policyname;

-- 3. Vérifier les policies potentiellement dangereuses (trop permissives)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual::text = 'true' AND roles::text LIKE '%authenticated%' THEN '⚠️ PERMISSIVE'
    ELSE '✅ OK'
  END as security_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users','transactions','activations','balance_operations','referrals')
ORDER BY 
  CASE WHEN qual::text = 'true' AND roles::text LIKE '%authenticated%' THEN 0 ELSE 1 END,
  tablename;

-- 4. Vérifier les fonctions sensibles
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('secure_freeze_balance', 'secure_unfreeze_balance', 'admin_add_credits')
ORDER BY p.proname;

-- 5. Compter les policies par table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ Bien protégé'
    WHEN COUNT(*) >= 1 THEN '⚠️ Protection basique'
    ELSE '❌ Aucune policy'
  END as protection_level
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users','transactions','activations','balance_operations','referrals')
GROUP BY tablename
ORDER BY policy_count DESC;
