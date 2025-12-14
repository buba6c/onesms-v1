-- ═══════════════════════════════════════════════════════════════
-- CONFIGURATION CRON JOBS SUPABASE (pg_cron + pg_net)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Autoriser pg_cron à utiliser pg_net
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres;

-- ═══════════════════════════════════════════════════════════════
-- CRON 1: Cleanup Expired Rentals (toutes les 5 minutes)
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
-- CRON 2: Cleanup Expired Activations (toutes les 5 minutes)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cleanup-expired-activations',
  '*/5 * * * *',
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
-- CRON 3: Check Pending SMS (toutes les 2 minutes)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cron-check-pending-sms',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- CRON 4: Wallet Health Check (toutes les 15 minutes)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cron-wallet-health',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-wallet-health',
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
-- UTILITAIRES: Commandes de gestion
-- ═══════════════════════════════════════════════════════════════

-- Pour désactiver un job:
-- SELECT cron.unschedule('cleanup-expired-rentals');

-- Pour voir l'historique des exécutions:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Pour supprimer tous les jobs:
-- SELECT cron.unschedule(jobid) FROM cron.job;
