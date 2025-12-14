#!/bin/bash
cd '/Users/mac/Desktop/ONE SMS V1'

# Mot de passe avec caractères spéciaux encodés
# Bouba@2307## -> @ = %40, # = %23
export PGPASSWORD='Bouba@2307##'

echo "📦 Dump de Supabase Cloud..."

# Essai 1: Connexion directe (port 5432)
echo "Essai connexion directe..."
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
  -f dump_production.sql 2>&1

if [ -f dump_production.sql ] && [ -s dump_production.sql ]; then
  echo "✅ Dump terminé!"
  ls -lh dump_production.sql
else
  echo "❌ Connexion directe échouée, essai pooler session mode..."
  
  # Essai 2: Pooler session mode (port 5432)
  pg_dump \
    -h aws-1-eu-central-2.pooler.supabase.com \
    -p 5432 \
    -U postgres.htfqmamvmhdoixqcbbbw \
    -d postgres \
    --schema=public \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    -F p \
    -f dump_production.sql 2>&1
    
  if [ -f dump_production.sql ] && [ -s dump_production.sql ]; then
    echo "✅ Dump terminé!"
    ls -lh dump_production.sql
  else
    echo "❌ Tous les essais ont échoué"
  fi
fi
