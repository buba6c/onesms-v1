-- ═══════════════════════════════════════════════════════════════
-- FIX URGENT: Désactiver FORCE RLS sur rentals
-- ═══════════════════════════════════════════════════════════════

-- Vérifier l'état actuel
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'rentals';

-- Désactiver FORCE RLS (service_role bypasse RLS par défaut SAUF si FORCE est activé)
ALTER TABLE rentals NO FORCE ROW LEVEL SECURITY;

-- Vérifier après
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'rentals';
