#!/bin/bash

# ONE SMS - Configuration Rapide
# Ce script vous aide à configurer rapidement l'application

echo "🚀 Configuration ONE SMS"
echo "========================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Étape 1: Configuration Supabase${NC}"
echo ""
echo "1. Créez un compte sur https://supabase.com"
echo "2. Créez un nouveau projet"
echo "3. Dans Settings > API, copiez:"
echo "   - Project URL"
echo "   - Project API Key (anon public)"
echo ""
read -p "Appuyez sur Entrée quand c'est fait..."

echo ""
echo -e "${YELLOW}📋 Étape 2: Déploiement du schéma de base de données${NC}"
echo ""
echo "1. Dans votre projet Supabase, allez dans SQL Editor"
echo "2. Créez une nouvelle query"
echo "3. Copiez tout le contenu de: supabase/schema.sql"
echo "4. Exécutez la query"
echo ""
read -p "Appuyez sur Entrée quand c'est fait..."

echo ""
echo -e "${YELLOW}📋 Étape 3: Configuration des clés API${NC}"
echo ""

# Vérifier si .env existe
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Fichier .env créé${NC}"
fi

echo "Maintenant, ouvrez le fichier .env et configurez:"
echo ""
echo -e "${BLUE}VITE_SUPABASE_URL=${NC}votre_url_supabase"
echo -e "${BLUE}VITE_SUPABASE_ANON_KEY=${NC}votre_cle_anon_supabase"
echo ""
echo "Optionnel (pour la production complète):"
echo -e "${BLUE}VITE_5SIM_API_KEY=${NC}votre_cle_5sim"
echo -e "${BLUE}VITE_PAYTECH_API_KEY=${NC}votre_cle_paytech"
echo -e "${BLUE}VITE_PAYTECH_API_SECRET=${NC}votre_secret_paytech"
echo ""

# Ouvrir .env avec l'éditeur par défaut
if command -v code &> /dev/null; then
    echo "Ouverture de .env dans VS Code..."
    code .env
elif command -v nano &> /dev/null; then
    echo "Ouverture de .env dans nano..."
    nano .env
else
    echo -e "${YELLOW}⚠️  Ouvrez manuellement le fichier .env pour le configurer${NC}"
fi

echo ""
read -p "Appuyez sur Entrée une fois .env configuré..."

echo ""
echo -e "${YELLOW}📋 Étape 4: Configuration OAuth (Optionnel)${NC}"
echo ""
echo "Pour activer Google/Apple Sign-In:"
echo "1. Dans Supabase, allez dans Authentication > Providers"
echo "2. Activez Google Provider:"
echo "   - Client ID depuis Google Cloud Console"
echo "   - Client Secret depuis Google Cloud Console"
echo "3. Activez Apple Provider (si nécessaire)"
echo ""
read -p "Appuyez sur Entrée pour continuer..."

echo ""
echo -e "${YELLOW}📋 Étape 5: Rebuild et redémarrage${NC}"
echo ""

# Rebuild
echo "Construction de l'application..."
npm run build

# Restart PM2
echo "Redémarrage de l'application avec PM2..."
pm2 delete onesms-frontend 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo "L'application est accessible sur: http://localhost:3000"
echo ""
echo "Commandes utiles:"
echo "  pm2 status              - Voir l'état de l'application"
echo "  pm2 logs onesms-frontend - Voir les logs"
echo "  pm2 restart onesms-frontend - Redémarrer"
echo "  pm2 stop onesms-frontend - Arrêter"
echo ""
echo -e "${BLUE}📚 Documentation complète: README.md et DEPLOYMENT_GUIDE.md${NC}"
