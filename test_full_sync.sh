#!/bin/bash

echo "🧪 TEST COMPLET DE SYNCHRONISATION"
echo "=================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Nettoyage
echo -e "${BLUE}1️⃣  Nettoyage des anciennes pricing_rules...${NC}"
node cleanup_old_rules.mjs
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Erreur lors du nettoyage${NC}"
  exit 1
fi
echo ""

# 2. Synchronisation
echo -e "${BLUE}2️⃣  Lancement de la synchronisation SMS-Activate...${NC}"
SYNC_RESULT=$(curl -s -X POST \
  "https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-sms-activate" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4" \
  -H "Content-Type: application/json")

echo "$SYNC_RESULT" | jq '.'
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Erreur lors de la synchronisation${NC}"
  echo "$SYNC_RESULT"
  exit 1
fi
echo ""

# 3. Attendre un peu pour que les données soient disponibles
echo -e "${YELLOW}⏳ Attente de 3 secondes...${NC}"
sleep 3
echo ""

# 4. Analyse finale
echo -e "${BLUE}3️⃣  Analyse des résultats...${NC}"
node deep_sync_analysis.mjs

echo ""
echo -e "${GREEN}✅ Test terminé!${NC}"
