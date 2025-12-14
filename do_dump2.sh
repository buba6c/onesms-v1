#!/bin/bash
cd '/Users/mac/Desktop/ONE SMS V1'

export PGPASSWORD='Bouba@2307##'

echo "📦 Dump de Supabase Cloud via Pooler..."

pg_dump \
  -h aws-1-eu-central-2.pooler.supabase.com \
  -p 6543 \
  -U postgres.htfqmamvmhdoixqcbbbw \
  -d postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -F p \
  -f dump_production.sql

if [ -f dump_production.sql ]; then
  echo "✅ Dump terminé!"
  ls -lh dump_production.sql
  echo ""
  echo "📊 Aperçu:"
  head -50 dump_production.sql
else
  echo "❌ Échec du dump"
fi
