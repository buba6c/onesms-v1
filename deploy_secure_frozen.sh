#!/bin/bash
# ============================================================================
# DÉPLOIEMENT SYSTÈME SÉCURISÉ FROZEN BALANCE
# ONE SMS - Novembre 2025
# ============================================================================

echo "🔒 DÉPLOIEMENT SYSTÈME SÉCURISÉ FROZEN BALANCE"
echo "=============================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté depuis le répertoire du projet ONE SMS${NC}"
    exit 1
fi

# Étape 1: Migration SQL
echo ""
echo -e "${YELLOW}📊 ÉTAPE 1: Application de la migration SQL${NC}"
echo "   Veuillez exécuter manuellement dans Supabase SQL Editor:"
echo "   - Ouvrir: https://app.supabase.com > Votre projet > SQL Editor"
echo "   - Copier le contenu de: migrations/secure_frozen_balance_system.sql"
echo "   - Exécuter la migration"
echo ""
read -p "Avez-vous exécuté la migration SQL? (oui/non) " -r
if [[ ! $REPLY =~ ^[Oo]ui$ ]]; then
    echo -e "${RED}❌ Veuillez d'abord exécuter la migration SQL${NC}"
    exit 1
fi

# Étape 2: Déployer les Edge Functions
echo ""
echo -e "${YELLOW}🚀 ÉTAPE 2: Déploiement des Edge Functions${NC}"

FUNCTIONS=(
    "cancel-sms-activate-order"
    "buy-sms-activate-number"
    "check-sms-activate-status"
    "cron-check-pending-sms"
    "sync-sms-activate-activations"
    "recover-sms-from-history"
    "cleanup-expired-activations"
    "buy-sms-activate-rent"
    "set-rent-status"
)

for func in "${FUNCTIONS[@]}"; do
    echo ""
    echo -e "   📦 Déploiement: ${func}..."
    if npx supabase functions deploy "$func" --no-verify-jwt; then
        echo -e "   ${GREEN}✅ $func déployé avec succès${NC}"
    else
        echo -e "   ${RED}❌ Erreur lors du déploiement de $func${NC}"
        read -p "   Continuer quand même? (oui/non) " -r
        if [[ ! $REPLY =~ ^[Oo]ui$ ]]; then
            exit 1
        fi
    fi
done

# Étape 3: Migration des données
echo ""
echo -e "${YELLOW}📊 ÉTAPE 3: Migration et réconciliation des données${NC}"
read -p "Exécuter la migration des données? (oui/non) " -r
if [[ $REPLY =~ ^[Oo]ui$ ]]; then
    node migrate_secure_frozen.mjs
fi

# Étape 4: Vérification
echo ""
echo -e "${YELLOW}✅ ÉTAPE 4: Vérification${NC}"
echo "   Veuillez vérifier dans Supabase SQL Editor:"
echo ""
echo "   -- Vérifier la santé des frozen_balance"
echo "   SELECT * FROM v_frozen_balance_health WHERE health_status != 'OK';"
echo ""
echo "   -- Vérifier les activations pending"
echo "   SELECT id, status, price, frozen_amount FROM activations WHERE status IN ('pending', 'waiting') LIMIT 10;"
echo ""

echo ""
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo ""
echo "📝 PROCHAINES ÉTAPES:"
echo "   1. Tester l'achat d'une activation"
echo "   2. Tester l'annulation (vérifier que frozen_balance diminue correctement)"
echo "   3. Tester avec plusieurs activations simultanées"
echo "   4. Surveiller les logs dans Supabase Dashboard"
echo ""
