#!/bin/bash

# ============================================================================
# Script de configuration pour le générateur d'icônes
# ============================================================================

echo "🎨 Configuration du générateur d'icônes"
echo "========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si .env existe déjà
if [ -f ".env.icons" ]; then
    echo -e "${YELLOW}⚠️  Le fichier .env.icons existe déjà${NC}"
    read -p "Voulez-vous le recréer? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Configuration annulée"
        exit 0
    fi
fi

echo "📝 Création du fichier .env.icons..."
echo ""

# Questions interactives
echo "🔐 Configuration AWS S3"
echo "----------------------"
read -p "AWS Region (défaut: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "S3 Bucket Name: " S3_BUCKET

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ Les informations AWS sont obligatoires${NC}"
    exit 1
fi

S3_BASE_URL="https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com"

echo ""
echo "🗄️  Configuration Supabase"
echo "-------------------------"
echo "URL Supabase (détecté): https://htfqmamvmhdoixqcbbbw.supabase.co"
read -p "Service Role Key: " SUPABASE_SERVICE_ROLE_KEY

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ La clé Service Role Supabase est obligatoire${NC}"
    exit 1
fi

echo ""
echo "🎨 Configuration Brandfetch (optionnel)"
echo "---------------------------------------"
echo "Pour obtenir une clé API: https://brandfetch.com"
read -p "Brandfetch API Key (laisser vide pour ignorer): " BRANDFETCH_API_KEY

# Créer le fichier .env.icons
cat > .env.icons << EOF
# ============================================================================
# Configuration pour import-icons.js
# ============================================================================

# AWS S3 Configuration
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
S3_BUCKET=$S3_BUCKET
S3_BASE_URL=$S3_BASE_URL

# Supabase Configuration
SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Brandfetch API (optionnel)
BRANDFETCH_API_KEY=$BRANDFETCH_API_KEY
EOF

echo ""
echo -e "${GREEN}✅ Fichier .env.icons créé avec succès!${NC}"
echo ""

# Vérifier si les dépendances sont installées
echo "📦 Vérification des dépendances..."
if [ ! -d "node_modules/simple-icons" ]; then
    echo -e "${YELLOW}⚠️  Dépendances manquantes${NC}"
    read -p "Installer maintenant? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo "Installation en cours..."
        npm install simple-icons string-similarity node-fetch sharp svgo @thiagoelg/node-potrace p-limit @aws-sdk/client-s3 @supabase/supabase-js
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Dépendances installées${NC}"
        else
            echo -e "${RED}❌ Erreur lors de l'installation${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✅ Dépendances déjà installées${NC}"
fi

echo ""

# Appliquer la migration Supabase
echo "🗄️  Application de la migration Supabase..."
read -p "Appliquer la migration 029_add_icon_url_to_services.sql? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo "Application de la migration..."
    
    # Vérifier si supabase CLI est installé
    if command -v supabase &> /dev/null; then
        npx supabase db push --db-url "postgresql://postgres.htfqmamvmhdoixqcbbbw:$SUPABASE_SERVICE_ROLE_KEY@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Migration appliquée${NC}"
        else
            echo -e "${YELLOW}⚠️  Erreur lors de l'application de la migration${NC}"
            echo "Vous pouvez l'appliquer manuellement dans le SQL Editor de Supabase"
        fi
    else
        echo -e "${YELLOW}⚠️  Supabase CLI non trouvé${NC}"
        echo "Veuillez appliquer manuellement la migration supabase/migrations/029_add_icon_url_to_services.sql"
        echo "dans le SQL Editor de Supabase: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql"
    fi
fi

echo ""
echo "========================================="
echo -e "${GREEN}✨ Configuration terminée!${NC}"
echo "========================================="
echo ""
echo "📚 Prochaines étapes:"
echo ""
echo "1. Vérifier votre configuration:"
echo -e "   ${YELLOW}cat .env.icons${NC}"
echo ""
echo "2. Tester avec quelques services:"
echo -e "   ${YELLOW}# Modifier import-icons.js ligne 550: ajouter .limit(10)${NC}"
echo -e "   ${YELLOW}node import-icons.js${NC}"
echo ""
echo "3. Lancer l'import complet:"
echo -e "   ${YELLOW}node import-icons.js${NC}"
echo ""
echo "4. Consulter les résultats:"
echo -e "   ${YELLOW}cat import-results.json${NC}"
echo ""
echo "📖 Documentation complète: README-ICONS.md"
echo ""
