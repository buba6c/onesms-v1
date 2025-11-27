#!/bin/bash

# =============================================================================
# 🔄 INSTALLATION CRON JOB - Synchronisation Automatique
# =============================================================================
#
# Ce script configure la synchronisation automatique toutes les 5 minutes
# 
# Usage:
#   chmod +x scripts/setup-cron.sh
#   ./scripts/setup-cron.sh
#
# =============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
CRON_LOG="$LOG_DIR/sync-cron.log"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🔄 Configuration Synchronisation Automatique            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# 1. VÉRIFICATIONS PRÉ-INSTALLATION
# =============================================================================

echo -e "${YELLOW}1️⃣  Vérifications préliminaires...${NC}\n"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé!${NC}"
    echo -e "   Installez Node.js: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Vérifier npm packages
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo -e "${RED}❌ node_modules manquant!${NC}"
    echo -e "   Exécutez: npm install"
    exit 1
fi
echo -e "${GREEN}✅ node_modules présent${NC}"

# Vérifier script sync
if [ ! -f "$PROJECT_DIR/scripts/sync-services-realtime.js" ]; then
    echo -e "${RED}❌ Script sync-services-realtime.js manquant!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Script de synchronisation présent${NC}"

# Vérifier .env
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}❌ Fichier .env manquant!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Fichier .env présent${NC}"

# =============================================================================
# 2. CRÉER DOSSIER LOGS
# =============================================================================

echo -e "\n${YELLOW}2️⃣  Création dossier logs...${NC}\n"

mkdir -p "$LOG_DIR"
touch "$CRON_LOG"
echo -e "${GREEN}✅ Dossier logs créé: $LOG_DIR${NC}"

# =============================================================================
# 3. TEST EXÉCUTION MANUELLE
# =============================================================================

echo -e "\n${YELLOW}3️⃣  Test synchronisation manuelle...${NC}\n"

echo -e "${BLUE}⏳ Exécution test (dry run)...${NC}\n"

cd "$PROJECT_DIR"
DRY_RUN=true node scripts/sync-services-realtime.js

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Test réussi!${NC}"
else
    echo -e "\n${RED}❌ Test échoué!${NC}"
    echo -e "   Vérifiez les erreurs ci-dessus"
    exit 1
fi

# =============================================================================
# 4. CONFIGURER CRON JOB
# =============================================================================

echo -e "\n${YELLOW}4️⃣  Configuration cron job...${NC}\n"

# Ligne cron à ajouter
CRON_LINE="*/5 * * * * cd \"$PROJECT_DIR\" && /usr/local/bin/node scripts/sync-services-realtime.js >> \"$CRON_LOG\" 2>&1"

# Vérifier si déjà configuré
if crontab -l 2>/dev/null | grep -q "sync-services-realtime.js"; then
    echo -e "${YELLOW}⚠️  Cron job déjà configuré!${NC}"
    echo -e "   Voulez-vous le remplacer? (y/n)"
    read -r response
    
    if [ "$response" != "y" ]; then
        echo -e "${BLUE}ℹ️  Configuration annulée${NC}"
        exit 0
    fi
    
    # Supprimer ancienne ligne
    crontab -l 2>/dev/null | grep -v "sync-services-realtime.js" | crontab -
fi

# Ajouter nouvelle ligne
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo -e "${GREEN}✅ Cron job configuré!${NC}"

# =============================================================================
# 5. VÉRIFICATION FINALE
# =============================================================================

echo -e "\n${YELLOW}5️⃣  Vérification configuration...${NC}\n"

echo -e "${BLUE}📋 Cron jobs actifs:${NC}\n"
crontab -l | grep "sync-services-realtime.js"

echo -e "\n${GREEN}✅ Installation terminée!${NC}\n"

# =============================================================================
# 6. RÉSUMÉ
# =============================================================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   📊 Configuration Résumé                                  ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   ⏰ Fréquence:     Toutes les 5 minutes                   ║${NC}"
echo -e "${BLUE}║   📝 Logs:          $LOG_DIR/sync-cron.log${NC}"
echo -e "${BLUE}║   🔧 Script:        scripts/sync-services-realtime.js     ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║   🎯 Prochaines étapes:                                    ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   1. Synchronisation automatique activée ✅                ║${NC}"
echo -e "${BLUE}║   2. Vérifiez les logs: tail -f $LOG_DIR/sync-cron.log${NC}"
echo -e "${BLUE}║   3. Dashboard Admin pour monitoring (à venir)            ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║   ⚡ Commandes utiles:                                     ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   • Voir logs temps réel:                                 ║${NC}"
echo -e "${BLUE}║     tail -f $CRON_LOG${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   • Sync manuel:                                          ║${NC}"
echo -e "${BLUE}║     node scripts/sync-services-realtime.js                ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   • Test sans modifications:                              ║${NC}"
echo -e "${BLUE}║     DRY_RUN=true node scripts/sync-services-realtime.js   ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   • Désactiver cron:                                      ║${NC}"
echo -e "${BLUE}║     crontab -l | grep -v sync-services-realtime | crontab ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   • Voir tous les crons:                                  ║${NC}"
echo -e "${BLUE}║     crontab -l                                            ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}🚀 Système de synchronisation temps réel activé!${NC}\n"
