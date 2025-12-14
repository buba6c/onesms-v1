#!/bin/bash
export PGPASSWORD='Bouba@2307##'

echo "📦 Dump de Supabase Cloud..."

pg_dump \
  -h db.htfqmamvmhdoixqcbbbw.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -F p \
  -f dump_production.sql

echo "✅ Dump terminé!"
ls -lh dump_production.sql
