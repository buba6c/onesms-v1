-- Vérifier l'état de la synchronisation

-- 1. Nombre de services dans la DB
SELECT 'Total services in DB' as metric, COUNT(*) as count FROM services;

-- 2. Services avec total_available > 0
SELECT 'Services with numbers available' as metric, COUNT(*) as count 
FROM services 
WHERE total_available > 0;

-- 3. Services récemment mis à jour (dernières 24h)
SELECT 'Services updated in last 24h' as metric, COUNT(*) as count 
FROM services 
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- 4. Top 10 services par disponibilité
SELECT code, name, total_available, updated_at 
FROM services 
WHERE active = true 
ORDER BY total_available DESC 
LIMIT 10;

-- 5. Dernières synchronisations
SELECT sync_type, status, services_synced, countries_synced, started_at 
FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 5;
