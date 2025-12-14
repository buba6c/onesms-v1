-- ═══════════════════════════════════════════════════════════════
-- CONFIGURATION CRON JOBS SUPABASE (pg_cron + pg_net)
-- VERSION 2 - 2024-12-02
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Autoriser pg_cron à utiliser pg_net
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;

-- ═══════════════════════════════════════════════════════════════
-- SUPPRIMER LES ANCIENS CRON JOBS (si existants)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.unschedule('cleanup-expired-activations') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-activations'
);

SELECT cron.unschedule('cleanup-expired-rentals') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-rentals'
);

-- ═══════════════════════════════════════════════════════════════
-- CRON 1: Cleanup Expired Activations (toutes les 3 minutes)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cleanup-expired-activations',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cleanup-expired-activations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- CRON 2: Cleanup Expired Rentals (toutes les 5 minutes)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cleanup-expired-rentals',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cleanup-expired-rentals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- VÉRIFICATION: Lister tous les CRON jobs actifs
-- ═══════════════════════════════════════════════════════════════

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;

-- ═══════════════════════════════════════════════════════════════
-- FONCTION RPC pour consulter les cron jobs depuis l'app
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
  job_id bigint,
  job_name text,
  schedule text,
  is_active boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active
  FROM cron.job j
  ORDER BY j.jobname;
END;
$$;

-- Donner accès à cette fonction
GRANT EXECUTE ON FUNCTION get_cron_jobs TO anon, authenticated;

