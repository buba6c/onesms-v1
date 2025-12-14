-- Vérifier l'état des cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;

-- Vérifier les dernières exécutions
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobname = 'cron-check-pending-sms'
ORDER BY start_time DESC
LIMIT 10;
