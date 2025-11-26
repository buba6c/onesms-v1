#!/bin/bash

# Test complet des GitHub Workflows
echo "🧪 TEST DES GITHUB WORKFLOWS"
echo "=" | tr -s "=" | head -c 60 && echo ""
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que gh est installé
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) n'est pas installé${NC}"
    echo "   Installation: brew install gh"
    echo "   Puis: gh auth login"
    exit 1
fi

# Vérifier l'authentification
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Non authentifié sur GitHub${NC}"
    echo "   Exécuter: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI installé et authentifié${NC}"
echo ""

# 1. Lister les workflows
echo -e "${BLUE}1️⃣  WORKFLOWS DISPONIBLES${NC}"
echo "-" | tr -s "-" | head -c 60 && echo ""
gh workflow list
echo ""

# 2. Vérifier les secrets
echo -e "${BLUE}2️⃣  SECRETS GITHUB${NC}"
echo "-" | tr -s "-" | head -c 60 && echo ""
if gh secret list | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
    echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY configuré${NC}"
else
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY manquant${NC}"
    echo ""
    echo "Pour l'ajouter:"
    echo "  1. Copier la clé depuis: https://supabase.com/dashboard/project/qepxgaozywhjbnvqkgfr/settings/api"
    echo "  2. Exécuter: gh secret set SUPABASE_SERVICE_ROLE_KEY"
    echo "  3. Coller la clé"
    exit 1
fi
echo ""

# 3. Déclencher sync-sms-activate manuellement
echo -e "${BLUE}3️⃣  TEST SYNC SMS-ACTIVATE${NC}"
echo "-" | tr -s "-" | head -c 60 && echo ""
echo "Déclenchement du workflow sync-sms-activate..."
gh workflow run sync-sms-activate.yml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Workflow déclenché${NC}"
    echo "   Attendre 5 secondes..."
    sleep 5
    
    # Récupérer le dernier run
    RUN_ID=$(gh run list --workflow=sync-sms-activate.yml --limit 1 --json databaseId --jq '.[0].databaseId')
    
    if [ ! -z "$RUN_ID" ]; then
        echo ""
        echo "📊 Status du workflow:"
        gh run view $RUN_ID
        
        echo ""
        echo "Pour voir les logs en direct:"
        echo "  gh run watch $RUN_ID"
        echo ""
        echo "Pour voir les logs complets:"
        echo "  gh run view $RUN_ID --log"
    fi
else
    echo -e "${RED}❌ Échec du déclenchement${NC}"
    exit 1
fi
echo ""

# 4. Vérifier les runs récents
echo -e "${BLUE}4️⃣  RUNS RÉCENTS${NC}"
echo "-" | tr -s "-" | head -c 60 && echo ""
gh run list --limit 10
echo ""

# 5. Résumé
echo ""
echo "=" | tr -s "=" | head -c 60 && echo ""
echo -e "${GREEN}🎉 TESTS TERMINÉS${NC}"
echo ""
echo "Commandes utiles:"
echo "  • Lister workflows:        gh workflow list"
echo "  • Déclencher manuellement: gh workflow run <workflow>.yml"
echo "  • Voir runs récents:       gh run list"
echo "  • Voir détails d'un run:   gh run view <run_id>"
echo "  • Voir logs:               gh run view <run_id> --log"
echo "  • Suivre en direct:        gh run watch <run_id>"
echo ""
