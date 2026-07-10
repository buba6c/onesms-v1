-- Fonction RPC publique avec SECURITY DEFINER pour obtenir les vraies statistiques historiques
-- par pays pour un service donné, en contournant les restrictions RLS côté client.
-- Rend le classement et le calcul du taux brut 100% automatique et dynamique.

CREATE OR REPLACE FUNCTION public.get_global_service_country_stats(p_service_code text)
RETURNS TABLE (
  country_code text,
  completed_count bigint,
  total_count bigint,
  raw_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    LOWER(TRIM(country_code)) as country_code,
    COUNT(*) FILTER (WHERE status IN ('completed', 'received', 'SUCCESSFUL')) as completed_count,
    COUNT(*) as total_count,
    ROUND((COUNT(*) FILTER (WHERE status IN ('completed', 'received', 'SUCCESSFUL'))::numeric / NULLIF(COUNT(*), 0)) * 100, 1) as raw_rate
  FROM public.activations
  WHERE LOWER(TRIM(service_code)) IN (
    CASE 
      WHEN LOWER(TRIM(p_service_code)) IN ('go', 'google', 'youtube', 'gmail') THEN 'go'
      WHEN LOWER(TRIM(p_service_code)) IN ('wa', 'whatsapp') THEN 'wa'
      WHEN LOWER(TRIM(p_service_code)) IN ('tg', 'telegram') THEN 'tg'
      ELSE LOWER(TRIM(p_service_code))
    END,
    LOWER(TRIM(p_service_code)),
    CASE WHEN LOWER(TRIM(p_service_code)) IN ('go', 'google', 'youtube', 'gmail') THEN 'google' ELSE LOWER(TRIM(p_service_code)) END,
    CASE WHEN LOWER(TRIM(p_service_code)) IN ('go', 'google', 'youtube', 'gmail') THEN 'youtube' ELSE LOWER(TRIM(p_service_code)) END,
    CASE WHEN LOWER(TRIM(p_service_code)) IN ('go', 'google', 'youtube', 'gmail') THEN 'gmail' ELSE LOWER(TRIM(p_service_code)) END
  )
  GROUP BY LOWER(TRIM(country_code));
$$;

GRANT EXECUTE ON FUNCTION public.get_global_service_country_stats(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_global_service_country_stats(text) IS 'Statistiques globales en temps réel par pays pour un service (Bypass RLS pour tri dynamique automatique).';
