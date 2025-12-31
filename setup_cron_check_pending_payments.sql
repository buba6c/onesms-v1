-- Configuration du CRON job pour vérifier les paiements pending
-- Exécuter dans le SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql

-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer le job existant s'il existe
SELECT cron.unschedule('check-pending-payments') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-pending-payments'
);

-- Créer le cron job qui s'exécute toutes les 5 minutes
SELECT cron.schedule(
  'check-pending-payments',  -- nom du job
  '*/5 * * * *',            -- toutes les 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/check-pending-payments',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Vérifier que le job est bien créé
SELECT * FROM cron.job WHERE jobname = 'check-pending-payments';
