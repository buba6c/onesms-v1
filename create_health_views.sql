-- Vue pour monitoring santé des services en temps réel
-- Analyse success rate sur 24h dernières heures

CREATE OR REPLACE VIEW v_service_health AS
SELECT 
  service_code,
  COUNT(*) as total_activations_24h,
  SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as successful_activations,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_activations,
  SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout_activations,
  ROUND(
    SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / 
    NULLIF(COUNT(*), 0),
    1
  ) as success_rate_pct,
  CASE 
    WHEN COUNT(*) < 3 THEN 'INSUFFICIENT_DATA'
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 15 THEN 'CRITICAL'
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 35 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as health_status,
  MAX(created_at) as last_activation_at,
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60
  ) as minutes_since_last_use
FROM activations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service_code
ORDER BY total_activations_24h DESC;

-- Vue pour monitoring pays
CREATE OR REPLACE VIEW v_country_health AS
SELECT 
  country_code,
  COUNT(*) as total_activations_24h,
  SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as successful_activations,
  ROUND(
    SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / 
    NULLIF(COUNT(*), 0),
    1
  ) as success_rate_pct,
  CASE 
    WHEN COUNT(*) < 3 THEN 'INSUFFICIENT_DATA'
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 20 THEN 'CRITICAL'
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 40 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as health_status
FROM activations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY country_code
ORDER BY total_activations_24h DESC;

-- Vue pour temps moyen de réception SMS par service
CREATE OR REPLACE VIEW v_service_response_time AS
SELECT 
  service_code,
  COUNT(*) as successful_count,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (sms_received_at - created_at)) / 60)::NUMERIC,
    1
  ) as avg_wait_minutes,
  ROUND(
    MIN(EXTRACT(EPOCH FROM (sms_received_at - created_at)) / 60)::NUMERIC,
    1
  ) as min_wait_minutes,
  ROUND(
    MAX(EXTRACT(EPOCH FROM (sms_received_at - created_at)) / 60)::NUMERIC,
    1
  ) as max_wait_minutes
FROM activations
WHERE 
  status = 'received' 
  AND sms_received_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY service_code
HAVING COUNT(*) >= 3
ORDER BY avg_wait_minutes ASC;

-- Vue globale dashboard
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
  COUNT(*) as total_activations_24h,
  SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as successful_24h,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_24h,
  SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout_24h,
  ROUND(
    SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / 
    NULLIF(COUNT(*), 0),
    1
  ) as global_success_rate_pct,
  CASE 
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 30 THEN 'CRITICAL'
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 50 THEN 'WARNING'
    WHEN SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END)::NUMERIC * 100.0 / COUNT(*) < 70 THEN 'GOOD'
    ELSE 'EXCELLENT'
  END as global_health_status
FROM activations
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Commentaires
COMMENT ON VIEW v_service_health IS 'Santé des services SMS sur 24h - success rate, total activations, status breakdown';
COMMENT ON VIEW v_country_health IS 'Santé des pays sur 24h - success rate par country_code';
COMMENT ON VIEW v_service_response_time IS 'Temps moyen de réception SMS par service sur 7 jours';
COMMENT ON VIEW v_dashboard_stats IS 'Statistiques globales dashboard sur 24h';
