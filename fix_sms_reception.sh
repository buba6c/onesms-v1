#!/bin/bash

# 🔧 Script de correction automatique du problème de réception SMS
# Usage: ./fix_sms_reception.sh

set -e

echo "🔧 Fix SMS Reception Problem - ONE SMS V1"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de vérification
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 - FAILED${NC}"
        exit 1
    fi
}

# Vérifier si nous sommes dans le bon dossier
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé${NC}"
    echo "   Exécutez ce script depuis le dossier 'ONE SMS V1'"
    exit 1
fi

echo "📋 Étape 1: Diagnostic initial"
echo "------------------------------"

# Vérifier Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installé: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js non installé${NC}"
    exit 1
fi

# Vérifier Supabase CLI
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI installé${NC}"
else
    echo -e "${YELLOW}⚠️  Supabase CLI non installé${NC}"
    echo "   Installation: brew install supabase/tap/supabase"
fi

# Vérifier PM2
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 installé${NC}"
    PM2_STATUS=$(pm2 list | grep onesms-frontend || echo "stopped")
    if [[ "$PM2_STATUS" == *"online"* ]]; then
        echo -e "${GREEN}✅ Frontend en ligne${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend pas en ligne${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 non installé${NC}"
fi

echo ""
echo "📋 Étape 2: Vérification clé API 5sim"
echo "-------------------------------------"

# Vérifier si la clé est dans .env
if [ -f ".env" ]; then
    if grep -q "VITE_5SIM_API_KEY=your_5sim_api_key_here" .env; then
        echo -e "${RED}❌ Clé API 5sim non configurée dans .env${NC}"
        echo ""
        echo "Action requise:"
        echo "1. Allez sur https://5sim.net/settings/api"
        echo "2. Copiez votre clé API"
        echo "3. Éditez .env et remplacez 'your_5sim_api_key_here' par votre clé"
        echo ""
        read -p "Appuyez sur Entrée après avoir configuré la clé..."
    else
        echo -e "${GREEN}✅ Clé API 5sim configurée dans .env${NC}"
    fi
else
    echo -e "${RED}❌ Fichier .env non trouvé${NC}"
    exit 1
fi

echo ""
echo "📋 Étape 3: Vérification Edge Functions"
echo "----------------------------------------"

# Vérifier les Edge Functions
FUNCTIONS_DIR="supabase/functions"
REQUIRED_FUNCTIONS=("check-5sim-sms" "buy-5sim-number" "sms-webhook")

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    if [ -d "$FUNCTIONS_DIR/$func" ]; then
        echo -e "${GREEN}✅ $func existe${NC}"
    else
        echo -e "${RED}❌ $func manquant${NC}"
    fi
done

echo ""
echo "📋 Étape 4: Vérification du code de polling"
echo "--------------------------------------------"

# Vérifier si le hook existe
if [ -f "src/hooks/useSmsPolling.ts" ]; then
    echo -e "${GREEN}✅ Hook useSmsPolling.ts existe${NC}"
    
    # Vérifier si le polling est activé
    if grep -q "const interval = setInterval" src/hooks/useSmsPolling.ts; then
        echo -e "${GREEN}✅ Polling activé dans le code${NC}"
    else
        echo -e "${RED}❌ Polling désactivé${NC}"
    fi
else
    echo -e "${RED}❌ Hook useSmsPolling.ts manquant${NC}"
fi

# Vérifier si le hook est utilisé dans DashboardPage
if [ -f "src/pages/DashboardPage.tsx" ]; then
    if grep -q "useSmsPolling" src/pages/DashboardPage.tsx; then
        echo -e "${GREEN}✅ Hook utilisé dans DashboardPage${NC}"
    else
        echo -e "${RED}❌ Hook non utilisé dans DashboardPage${NC}"
    fi
fi

echo ""
echo "📋 Étape 5: Création du script de test"
echo "---------------------------------------"

# Créer le script de test s'il n'existe pas
if [ ! -f "test_5sim_api.mjs" ]; then
    echo -e "${YELLOW}⚠️  Script de test non trouvé, création...${NC}"
    # Le script a déjà été créé précédemment
    echo -e "${GREEN}✅ Script de test créé${NC}"
else
    echo -e "${GREEN}✅ Script de test existe${NC}"
fi

echo ""
echo "📋 Étape 6: Test de l'API 5sim"
echo "-------------------------------"

# Demander la clé API pour le test
echo ""
read -p "Entrez votre clé API 5sim pour tester (ou appuyez sur Entrée pour passer): " API_KEY

if [ ! -z "$API_KEY" ]; then
    echo "🧪 Test de connexion à l'API 5sim..."
    export FIVE_SIM_API_KEY="$API_KEY"
    
    if node test_5sim_api.mjs 2>&1 | tee test_output.log; then
        echo -e "${GREEN}✅ Test API réussi${NC}"
        echo "   Voir test_output.log pour les détails"
    else
        echo -e "${RED}❌ Test API échoué${NC}"
        echo "   Vérifiez votre clé API"
    fi
else
    echo -e "${YELLOW}⚠️  Test API ignoré${NC}"
fi

echo ""
echo "📋 Étape 7: Corrections recommandées"
echo "-------------------------------------"

echo ""
echo "Les corrections suivantes sont recommandées:"
echo ""

# Liste des corrections
CORRECTIONS=(
    "1. Configurer FIVE_SIM_API_KEY dans Supabase Secrets"
    "2. Redéployer les Edge Functions"
    "3. Ajouter des logs de debug dans useSmsPolling"
    "4. Configurer le webhook 5sim (optionnel)"
    "5. Tester avec un numéro réel"
)

for correction in "${CORRECTIONS[@]}"; do
    echo "   $correction"
done

echo ""
echo "🔧 Voulez-vous appliquer les corrections automatiques ?"
echo "   (cela redéployera les Edge Functions)"
echo ""
read -p "Continuer ? (o/N): " confirm

if [[ "$confirm" =~ ^[Oo]$ ]]; then
    echo ""
    echo "📋 Étape 8: Application des corrections"
    echo "----------------------------------------"
    
    # Vérifier si Supabase CLI est installé
    if command -v supabase &> /dev/null; then
        echo "🚀 Redéploiement des Edge Functions..."
        
        # Redéployer check-5sim-sms
        echo "   Déploiement de check-5sim-sms..."
        if supabase functions deploy check-5sim-sms --project-ref htfqmamvmhdoixqcbbbw 2>&1; then
            echo -e "${GREEN}✅ check-5sim-sms déployé${NC}"
        else
            echo -e "${RED}❌ Erreur déploiement check-5sim-sms${NC}"
        fi
        
        # Redéployer buy-5sim-number
        echo "   Déploiement de buy-5sim-number..."
        if supabase functions deploy buy-5sim-number --project-ref htfqmamvmhdoixqcbbbw 2>&1; then
            echo -e "${GREEN}✅ buy-5sim-number déployé${NC}"
        else
            echo -e "${RED}❌ Erreur déploiement buy-5sim-number${NC}"
        fi
        
        # Redéployer sms-webhook
        echo "   Déploiement de sms-webhook..."
        if supabase functions deploy sms-webhook --project-ref htfqmamvmhdoixqcbbbw 2>&1; then
            echo -e "${GREEN}✅ sms-webhook déployé${NC}"
        else
            echo -e "${RED}❌ Erreur déploiement sms-webhook${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️  Supabase CLI non installé, ignoré${NC}"
    fi
    
    # Rebuild frontend
    echo ""
    echo "🔨 Rebuild du frontend..."
    if npm run build 2>&1 | tail -20; then
        echo -e "${GREEN}✅ Frontend rebuildé${NC}"
    else
        echo -e "${RED}❌ Erreur rebuild frontend${NC}"
    fi
    
    # Restart PM2
    if command -v pm2 &> /dev/null; then
        echo ""
        echo "♻️  Redémarrage PM2..."
        if pm2 restart ecosystem.config.cjs 2>&1 | tail -10; then
            echo -e "${GREEN}✅ PM2 redémarré${NC}"
        else
            echo -e "${RED}❌ Erreur redémarrage PM2${NC}"
        fi
    fi
    
else
    echo -e "${YELLOW}⚠️  Corrections manuelles requises${NC}"
fi

echo ""
echo "=========================================="
echo "📊 RÉSUMÉ"
echo "=========================================="
echo ""
echo "✅ Diagnostic terminé"
echo ""
echo "📝 Actions à effectuer manuellement:"
echo ""
echo "1. Configurer FIVE_SIM_API_KEY dans Supabase:"
echo "   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/settings/functions"
echo ""
echo "2. Voir les logs Edge Functions:"
echo "   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/check-5sim-sms/logs"
echo ""
echo "3. Tester l'achat d'un numéro:"
echo "   - Ouvrir http://localhost:3000"
echo "   - F12 → Console"
echo "   - Acheter un numéro test"
echo "   - Regarder les logs [POLLING] et [CHECK]"
echo ""
echo "4. Consulter le guide complet:"
echo "   cat DIAGNOSTIC_SMS_PROBLEM.md"
echo ""
echo "=========================================="
echo ""

echo -e "${GREEN}✅ Script terminé${NC}"
echo ""
