#!/bin/bash

# Script de configuration des Cron Jobs via pg_cron
# Date: 8 décembre 2025

echo "⏰ CONFIGURATION DES CRON JOBS"
echo "=============================="
echo ""

SERVER="root@46.202.171.108"
PASSWORD="Bouba@2307##"
DB_CONTAINER="supabase-db-h888cc0ck4w4o0kgw4kg84ks"

SERVICE_ROLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg"

# Créer le script SQL pour les cron jobs
cat > /tmp/setup_cron_jobs.sql << 'SQL'
-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Donner les permissions
GRANT USAGE ON SCHEMA cron TO postgres;

-- 1. CRON: cron-atomic-reliable (toutes les 5 minutes)
SELECT cron.schedule(
  'cron-atomic-reliable',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/cron-atomic-reliable',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 2. CRON: cron-check-pending-sms (toutes les 5 minutes)
SELECT cron.schedule(
  'cron-check-pending-sms',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/cron-check-pending-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. CRON: cron-wallet-health (toutes les 15 minutes)
SELECT cron.schedule(
  'cron-wallet-health',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/cron-wallet-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Vérifier les cron jobs créés
SELECT * FROM cron.job;
SQL

echo "📝 Script SQL créé"
echo ""
echo "🚀 Application des cron jobs sur le serveur..."

# Transférer et exécuter le script SQL
sshpass -p "$PASSWORD" scp /tmp/setup_cron_jobs.sql $SERVER:/tmp/

sshpass -p "$PASSWORD" ssh $SERVER << ENDSSH
  echo "📥 Exécution du script SQL..."
  docker exec -i $DB_CONTAINER psql -U postgres -d postgres < /tmp/setup_cron_jobs.sql
  
  echo ""
  echo "✅ Cron jobs configurés!"
  echo ""
  echo "📋 Vérification des cron jobs:"
  docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c "SELECT jobid, schedule, command FROM cron.job;"
  
  # Nettoyer
  rm /tmp/setup_cron_jobs.sql
ENDSSH

# Nettoyer local
rm /tmp/setup_cron_jobs.sql

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📊 Les cron jobs sont maintenant actifs:"
echo "   • cron-atomic-reliable: Toutes les 5 minutes"
echo "   • cron-check-pending-sms: Toutes les 5 minutes"
echo "   • cron-wallet-health: Toutes les 15 minutes"
echo ""
echo "🔍 Pour vérifier les logs:"
echo "   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;"
