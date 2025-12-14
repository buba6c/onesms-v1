#!/bin/bash
# ============================================
# DUMP & IMPORT - Supabase Cloud → Coolify
# ============================================

# === CONFIGURATION ===
# Supabase Cloud (source)
PROD_HOST="db.htfqmamvmhdoixqcbbbw.supabase.co"
PROD_PORT="5432"
PROD_DB="postgres"
PROD_USER="postgres"
PROD_PASSWORD="__REMPLACER__"  # <-- Mets ton password ici

# Coolify (destination) - via pg/query API
COOLIFY_URL="http://supabasekong-q84gs0csso48co84gw0s0o4g.46.202.171.108.sslip.io"
COOLIFY_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTcyODA2MCwiZXhwIjo0OTIxNDAxNjYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.Za3on3nc5rMZ9L4_5v5i8p-ul0a5OC7MExY5kMl_D0Y"

# === ÉTAPE 1: DUMP ===
echo "📦 Dump de Supabase Cloud..."

export PGPASSWORD="$PROD_PASSWORD"

# Dump schema + data (sans auth schema qui est géré par Supabase)
pg_dump \
  -h "$PROD_HOST" \
  -p "$PROD_PORT" \
  -U "$PROD_USER" \
  -d "$PROD_DB" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -F p \
  -f dump_production.sql

echo "✅ Dump créé: dump_production.sql"
echo "📊 Taille: $(ls -lh dump_production.sql | awk '{print $5}')"

# === INFO ===
echo ""
echo "⚠️  Pour importer sur Coolify, expose le port 5432 du service 'db'"
echo "   Puis exécute:"
echo ""
echo "   PGPASSWORD='XvW3iOhEEsnHDhQdJVkzjYjACggROG20' psql \\"
echo "     -h 46.202.171.108 -p 5432 -U postgres -d postgres \\"
echo "     -f dump_production.sql"
