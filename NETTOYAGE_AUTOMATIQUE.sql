-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE NETTOYAGE AUTOMATIQUE DE LA BASE DE DONNÉES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 26 novembre 2025
-- Objectif: Nettoyer les données obsolètes automatiquement
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. NETTOYER LES SERVICES INACTIFS > 30 JOURS SANS USAGE
-- ───────────────────────────────────────────────────────────────────────────────

-- Vérification avant suppression
SELECT 
  'Services inactifs à supprimer' as info,
  COUNT(*) as nombre
FROM services 
WHERE active = false 
  AND updated_at < NOW() - INTERVAL '30 days'
  AND id NOT IN (
    SELECT DISTINCT service_id 
    FROM orders 
    WHERE service_id IS NOT NULL
  );

-- Suppression
DELETE FROM services 
WHERE active = false 
  AND updated_at < NOW() - INTERVAL '30 days'
  AND id NOT IN (
    SELECT DISTINCT service_id 
    FROM orders 
    WHERE service_id IS NOT NULL
  );

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. NETTOYER LES LOGS DE SYNC > 90 JOURS
-- ───────────────────────────────────────────────────────────────────────────────

-- Vérification
SELECT 
  'Sync logs à supprimer' as info,
  COUNT(*) as nombre
FROM sync_logs 
WHERE started_at < NOW() - INTERVAL '90 days';

-- Suppression
DELETE FROM sync_logs 
WHERE started_at < NOW() - INTERVAL '90 days';

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. NETTOYER LES SESSIONS EXPIRÉES (si table existe)
-- ───────────────────────────────────────────────────────────────────────────────

-- Décommenter si la table sessions existe
-- DELETE FROM sessions WHERE expires_at < NOW();

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. NETTOYER LES ORDERS ANNULÉS > 180 JOURS
-- ───────────────────────────────────────────────────────────────────────────────

-- Vérification
SELECT 
  'Orders annulés à archiver' as info,
  COUNT(*) as nombre
FROM orders 
WHERE status IN ('cancelled', 'failed', 'expired')
  AND updated_at < NOW() - INTERVAL '180 days';

-- Option: Archiver au lieu de supprimer
-- CREATE TABLE IF NOT EXISTS orders_archive AS SELECT * FROM orders WHERE 1=0;
-- INSERT INTO orders_archive SELECT * FROM orders WHERE status IN ('cancelled', 'failed', 'expired') AND updated_at < NOW() - INTERVAL '180 days';

-- Suppression (décommenter si vous voulez supprimer définitivement)
-- DELETE FROM orders WHERE status IN ('cancelled', 'failed', 'expired') AND updated_at < NOW() - INTERVAL '180 days';

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. OPTIMISER LES TABLES
-- ───────────────────────────────────────────────────────────────────────────────

VACUUM ANALYZE services;
VACUUM ANALYZE orders;
VACUUM ANALYZE transactions;
VACUUM ANALYZE sync_logs;

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. STATISTIQUES FINALES
-- ───────────────────────────────────────────────────────────────────────────────

SELECT 
  'Services actifs' as metric,
  COUNT(*) as value
FROM services
WHERE active = true

UNION ALL

SELECT 
  'Services inactifs restants' as metric,
  COUNT(*) as value
FROM services
WHERE active = false

UNION ALL

SELECT 
  'Sync logs (derniers 90j)' as metric,
  COUNT(*) as value
FROM sync_logs
WHERE started_at > NOW() - INTERVAL '90 days'

UNION ALL

SELECT 
  'Orders actifs' as metric,
  COUNT(*) as value
FROM orders
WHERE status IN ('pending', 'active', 'completed')

UNION ALL

SELECT 
  'Orders archivables' as metric,
  COUNT(*) as value
FROM orders
WHERE status IN ('cancelled', 'failed', 'expired')
  AND updated_at < NOW() - INTERVAL '180 days';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TÂCHE AUTOMATIQUE (À créer dans Supabase)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Dans Supabase Dashboard → Database → Functions → Create Function:

/*
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Nettoyer services inactifs > 30j
  DELETE FROM services 
  WHERE active = false 
    AND updated_at < NOW() - INTERVAL '30 days'
    AND id NOT IN (
      SELECT DISTINCT service_id FROM orders WHERE service_id IS NOT NULL
    );

  -- Nettoyer sync logs > 90j
  DELETE FROM sync_logs 
  WHERE started_at < NOW() - INTERVAL '90 days';

  -- Optimiser
  VACUUM ANALYZE services;
  VACUUM ANALYZE sync_logs;
END;
$$ LANGUAGE plpgsql;
*/

-- Créer un cron job (pg_cron extension requise):
/*
SELECT cron.schedule(
  'cleanup-old-data',
  '0 2 * * 0',  -- Chaque dimanche à 2h du matin
  'SELECT cleanup_old_data();'
);
*/

-- ═══════════════════════════════════════════════════════════════════════════════
