-- ============================================================================
-- VÉRIFICATION DES VUES - SECURITY DEFINER vs INVOKER
-- Date: 16 décembre 2025
-- ============================================================================

-- 1️⃣ Vérifier le mode de sécurité des 10 vues
SELECT 
  viewname,
  viewowner,
  CASE 
    WHEN definition LIKE '%security_invoker = true%' 
      OR definition LIKE '%WITH (security_invoker%'
    THEN '✅ SECURITY INVOKER'
    ELSE '⚠️ SECURITY DEFINER'
  END as security_mode
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
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
  )
ORDER BY viewname;

-- 2️⃣ Si les vues sont toujours en SECURITY DEFINER, les reconvertir
-- (Décommenter la section ci-dessous si nécessaire)

/*
-- Reconvertir toutes les vues en SECURITY INVOKER

-- 1. activation_stats
DROP VIEW IF EXISTS public.activation_stats CASCADE;
CREATE OR REPLACE VIEW public.activation_stats
WITH (security_invoker = true)
AS
SELECT 
    COUNT(*) as total_activations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
FROM public.activations;

-- 2. v_frozen_discrepancies
DROP VIEW IF EXISTS public.v_frozen_discrepancies CASCADE;
CREATE OR REPLACE VIEW public.v_frozen_discrepancies
WITH (security_invoker = true)
AS
SELECT 
    u.id as user_id,
    u.email,
    u.frozen_balance as user_frozen,
    COALESCE(SUM(a.frozen_amount), 0) as activations_frozen,
    COALESCE(SUM(r.frozen_amount), 0) as rentals_frozen,
    u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) as discrepancy
FROM public.users u
LEFT JOIN public.activations a ON a.user_id = u.id AND a.status IN ('pending', 'active')
LEFT JOIN public.rental_logs r ON r.user_id = u.id AND r.status = 'active'
GROUP BY u.id, u.email, u.frozen_balance
HAVING ABS(u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0))) > 0.01;

-- 3. v_service_health
DROP VIEW IF EXISTS public.v_service_health CASCADE;
CREATE OR REPLACE VIEW public.v_service_health
WITH (security_invoker = true)
AS
SELECT 
    s.id,
    s.name,
    s.country_code,
    s.provider,
    COUNT(a.id) as total_activations,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE a.status = 'failed') as failed,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'completed')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as success_rate
FROM public.services s
LEFT JOIN public.activations a ON a.service_id = s.id 
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.id, s.name, s.country_code, s.provider;

-- 4. v_frozen_balance_health
DROP VIEW IF EXISTS public.v_frozen_balance_health CASCADE;
CREATE OR REPLACE VIEW public.v_frozen_balance_health
WITH (security_invoker = true)
AS
SELECT 
    u.id,
    u.email,
    u.frozen_balance,
    COALESCE(SUM(a.frozen_amount), 0) as total_frozen_activations,
    COALESCE(SUM(r.frozen_amount), 0) as total_frozen_rentals,
    u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) as difference
FROM public.users u
LEFT JOIN public.activations a ON a.user_id = u.id AND a.status IN ('pending', 'active')
LEFT JOIN public.rental_logs r ON r.user_id = u.id AND r.status = 'active'
GROUP BY u.id;

-- 5. v_service_response_time
DROP VIEW IF EXISTS public.v_service_response_time CASCADE;
CREATE OR REPLACE VIEW public.v_service_response_time
WITH (security_invoker = true)
AS
SELECT 
    s.id,
    s.name,
    s.provider,
    AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))) as avg_response_seconds,
    MIN(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))) as min_response_seconds,
    MAX(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))) as max_response_seconds
FROM public.services s
JOIN public.activations a ON a.service_id = s.id
WHERE a.status = 'completed'
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.id, s.name, s.provider;

-- 6. v_dashboard_stats
DROP VIEW IF EXISTS public.v_dashboard_stats CASCADE;
CREATE OR REPLACE VIEW public.v_dashboard_stats
WITH (security_invoker = true)
AS
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.activations WHERE created_at > NOW() - INTERVAL '24 hours') as activations_24h,
    (SELECT COUNT(*) FROM public.rental_logs WHERE status = 'active') as active_rentals,
    (SELECT SUM(balance) FROM public.users) as total_balance,
    (SELECT SUM(frozen_balance) FROM public.users) as total_frozen;

-- 7. v_frozen_balance_health_reconciliation
DROP VIEW IF EXISTS public.v_frozen_balance_health_reconciliation CASCADE;
CREATE OR REPLACE VIEW public.v_frozen_balance_health_reconciliation
WITH (security_invoker = true)
AS
SELECT 
    u.id,
    u.email,
    u.frozen_balance as user_frozen_balance,
    COALESCE(act_frozen.total, 0) as activations_frozen,
    COALESCE(rent_frozen.total, 0) as rentals_frozen,
    COALESCE(act_frozen.total, 0) + COALESCE(rent_frozen.total, 0) as calculated_frozen,
    u.frozen_balance - (COALESCE(act_frozen.total, 0) + COALESCE(rent_frozen.total, 0)) as discrepancy
FROM public.users u
LEFT JOIN (
    SELECT user_id, SUM(frozen_amount) as total
    FROM public.activations
    WHERE status IN ('pending', 'active')
    GROUP BY user_id
) act_frozen ON act_frozen.user_id = u.id
LEFT JOIN (
    SELECT user_id, SUM(frozen_amount) as total
    FROM public.rental_logs
    WHERE status = 'active'
    GROUP BY user_id
) rent_frozen ON rent_frozen.user_id = u.id
WHERE ABS(u.frozen_balance - (COALESCE(act_frozen.total, 0) + COALESCE(rent_frozen.total, 0))) > 0.01;

-- 8. v_provider_stats_24h
DROP VIEW IF EXISTS public.v_provider_stats_24h CASCADE;
CREATE OR REPLACE VIEW public.v_provider_stats_24h
WITH (security_invoker = true)
AS
SELECT 
    s.provider,
    COUNT(a.id) as total_activations,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE a.status = 'failed') as failed,
    COUNT(*) FILTER (WHERE a.status = 'pending') as pending,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'completed')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as success_rate
FROM public.services s
LEFT JOIN public.activations a ON a.service_id = s.id 
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.provider;

-- 9. v_country_health
DROP VIEW IF EXISTS public.v_country_health CASCADE;
CREATE OR REPLACE VIEW public.v_country_health
WITH (security_invoker = true)
AS
SELECT 
    c.code,
    c.name,
    COUNT(DISTINCT s.id) as total_services,
    COUNT(a.id) as total_activations_24h,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'completed')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as success_rate_24h
FROM public.countries c
LEFT JOIN public.services s ON s.country_code = c.code AND s.is_available = true
LEFT JOIN public.activations a ON a.service_id = s.id 
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.code, c.name;

-- 10. available_services
DROP VIEW IF EXISTS public.available_services CASCADE;
CREATE OR REPLACE VIEW public.available_services
WITH (security_invoker = true)
AS
SELECT 
    s.*,
    c.name as country_name,
    c.flag as country_flag,
    pr.retail_price,
    pr.cost_price,
    pr.min_rent_duration,
    pr.rent_price_per_day
FROM public.services s
JOIN public.countries c ON c.code = s.country_code
LEFT JOIN public.pricing_rules_archive pr ON pr.service_id = s.id
WHERE s.is_available = true
ORDER BY s.popularity_score DESC NULLS LAST;

-- Revérifier
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%security_invoker = true%' 
    THEN '✅ SECURITY INVOKER'
    ELSE '⚠️ SECURITY DEFINER'
  END as security_mode
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
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
  )
ORDER BY viewname;

SELECT '✅ Toutes les vues converties en SECURITY INVOKER' AS status;
*/
