-- ═══════════════════════════════════════════════════════════════
-- CONFIGURATION CRON JOB - Vérification automatique des SMS
-- ═══════════════════════════════════════════════════════════════

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP calls
CREATE EXTENSION IF NOT EXISTS http;

-- Drop existing job if exists (ignore error if not exists)
DO $$
BEGIN
  PERFORM cron.unschedule('check-pending-sms-every-30s');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore error if job doesn't exist
END
$$;

-- Schedule the function to run every 30 seconds
-- This will check all pending SMS activations and update them automatically
SELECT cron.schedule(
  'check-pending-sms-every-30s',
  '*/1 * * * *',  -- Every 1 minute (Supabase free tier limit)
  $$
  SELECT
    net.http_post(
      url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- Verify the job is scheduled
SELECT * FROM cron.job WHERE jobname = 'check-pending-sms-every-30s';

-- View job run history
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-pending-sms-every-30s') ORDER BY start_time DESC LIMIT 10;
