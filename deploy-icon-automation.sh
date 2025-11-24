#!/bin/bash

# ============================================================================
# Script de déploiement de l'automatisation d'icônes
# ============================================================================

echo "🚀 Déploiement du système d'automatisation d'icônes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# ÉTAPE 1: Déployer l'Edge Function
# ============================================================================

echo "📦 Étape 1/3: Déploiement de l'Edge Function..."
echo ""

npx supabase functions deploy generate-service-icon --project-ref htfqmamvmhdoixqcbbbw

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function déployée avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors du déploiement de l'Edge Function${NC}"
    exit 1
fi

echo ""

# ============================================================================
# ÉTAPE 2: Configurer les secrets
# ============================================================================

echo "🔐 Étape 2/3: Configuration des secrets AWS..."
echo ""

# Lire les variables depuis .env.icons
if [ -f ".env.icons" ]; then
    source .env.icons
    
    echo "📝 Configuration des secrets dans Supabase..."
    
    npx supabase secrets set \
        AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        S3_BUCKET="$S3_BUCKET" \
        AWS_REGION="$AWS_REGION" \
        --project-ref htfqmamvmhdoixqcbbbw
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Secrets AWS configurés${NC}"
    else
        echo -e "${YELLOW}⚠️  Secrets AWS non configurés (l'Edge Function utilisera des data URLs)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Fichier .env.icons non trouvé, secrets AWS non configurés${NC}"
fi

echo ""

# ============================================================================
# ÉTAPE 3: Appliquer la migration SQL
# ============================================================================

echo "🗄️  Étape 3/3: Application de la migration SQL..."
echo ""

echo -e "${YELLOW}⚠️  Important: Vous devez exécuter manuellement cette commande SQL dans Supabase:${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat << 'EOF'
-- 1. Allez sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor
-- 2. Ouvrez SQL Editor
-- 3. Collez ce SQL:

ALTER DATABASE postgres SET app.supabase_url = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE';

-- Activer l'extension pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer la fonction de trigger
CREATE OR REPLACE FUNCTION trigger_icon_generation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.icon_url IS NULL THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate-service-icon',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'record', jsonb_build_object(
            'id', NEW.id::text,
            'code', NEW.code,
            'name', NEW.name,
            'display_name', NEW.display_name
          )
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_generate_service_icon ON services;
CREATE TRIGGER auto_generate_service_icon
  AFTER INSERT ON services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_icon_generation();

EOF
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# TESTS
# ============================================================================

echo ""
echo "🧪 Tests disponibles:"
echo ""
echo "1. Test manuel de l'Edge Function:"
echo "   curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/generate-service-icon' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"service_code\": \"test\"}'"
echo ""
echo "2. Test d'insertion d'un service:"
echo "   -- Le trigger devrait générer l'icône automatiquement"
echo "   INSERT INTO services (code, name, display_name) VALUES ('test-auto', 'Test Auto', 'Test Automatique');"
echo ""

# ============================================================================
# RÉSUMÉ
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Déploiement terminé!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. ✅ Edge Function déployée"
echo "2. ⚠️  Exécuter le SQL ci-dessus dans Supabase Dashboard"
echo "3. 🧪 Tester en insérant un nouveau service"
echo ""
echo "🎯 Désormais, chaque nouveau service aura automatiquement une icône!"
echo ""
