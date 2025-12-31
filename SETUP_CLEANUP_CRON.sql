-- Enable the pg_cron extension if not enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the cleanup job to run every 12 hours
-- REPLACE 'YOUR_SERVICE_ROLE_KEY' with your actual service_role key from API settings
select
  cron.schedule(
    'cleanup-pending-activations-12h',
    '0 */12 * * *', -- At minute 0 past every 12th hour
    $$
    select
      net.http_post(
          url:='https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cleanup-pending-activations',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- To check if it exists:
-- select * from cron.job;

-- To unschedule:
-- select cron.unschedule('cleanup-pending-activations-12h');
