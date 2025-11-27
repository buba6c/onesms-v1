-- Table pour logger toutes les synchronisations automatiques
-- Permet de monitorer la santé du système et détecter les problèmes

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type et statut
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'partial', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_seconds NUMERIC(10, 2),
  
  -- Stats API
  api_services_count INTEGER,
  api_countries_count INTEGER,
  api_total_stock BIGINT,
  
  -- Stats DB
  db_services_total INTEGER,
  db_services_active INTEGER,
  
  -- Modifications effectuées
  services_deactivated INTEGER DEFAULT 0,
  services_added INTEGER DEFAULT 0,
  services_reactivated INTEGER DEFAULT 0,
  stocks_updated INTEGER DEFAULT 0,
  
  -- Erreurs
  error_count INTEGER DEFAULT 0,
  error_details JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);

-- Vue pour statistiques agrégées
CREATE OR REPLACE VIEW sync_stats AS
SELECT 
  DATE_TRUNC('hour', started_at) as hour,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_syncs,
  AVG(duration_seconds) as avg_duration,
  SUM(services_added) as total_services_added,
  SUM(stocks_updated) as total_stocks_updated,
  MAX(api_total_stock) as max_stock_seen
FROM sync_logs
GROUP BY DATE_TRUNC('hour', started_at)
ORDER BY hour DESC;

-- Fonction pour nettoyer vieux logs (> 30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_logs 
  WHERE started_at < NOW() - INTERVAL '30 days'
  RETURNING id INTO deleted_count;
  
  RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE sync_logs IS 'Logs de toutes les synchronisations automatiques avec SMS-Activate API';
COMMENT ON COLUMN sync_logs.sync_type IS 'Type: full (complète), partial (partielle), manual (déclenchée manuellement)';
COMMENT ON COLUMN sync_logs.status IS 'Résultat: success (OK), partial (OK avec erreurs), error (échec)';
COMMENT ON COLUMN sync_logs.duration_seconds IS 'Durée de la synchronisation en secondes';
