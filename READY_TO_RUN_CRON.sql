-- =================================================================
-- ⚠️ INSTRUCTION IMPORTANTE
-- Remplacez 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE' ci-dessous
-- par votre vraie clé 'service_role' (Project Settings > API)
-- =================================================================

select
  cron.schedule(
    'cleanup-pending-activations-12h',
    '0 */12 * * *', -- Toutes les 12 heures
    $$
    select
      net.http_post(
          -- URL de votre projet (j'ai mis celle trouvée dans vos scripts)
          url:='https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cleanup-pending-activations',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );
