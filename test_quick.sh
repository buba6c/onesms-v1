#!/bin/bash

# ============================================================================
# TEST RAPIDE - buy-sms-activate-number avec frozen_balance
# ============================================================================
# Test simplifié pour valider le fonctionnement du freeze-before-call
# ============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUPABASE_URL="https://htfqmamvmhdoixqcbbbw.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        TEST RAPIDE - VALIDATION FROZEN_BALANCE              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Utiliser un compte existant
read -p "Email du compte test (ex: test@example.com): " TEST_EMAIL
read -s -p "Mot de passe: " TEST_PASSWORD
echo ""

echo -e "${YELLOW}🔐 Connexion...${NC}"

AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

USER_ID=$(echo $AUTH_RESPONSE | jq -r '.user.id // empty')
ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token // empty')

if [ -z "$USER_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Échec de connexion${NC}"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Connecté: $USER_ID${NC}"
echo ""

# Tester 3 achats rapides (pas 10 pour économiser les crédits)
echo -e "${YELLOW}🚀 Test: 3 achats simultanés${NC}"
echo -e "${YELLOW}Service: WhatsApp (wa)${NC}"
echo -e "${YELLOW}Pays: Indonesia (6) - Prix ~10 FCFA${NC}"
echo ""

SERVICE_CODE="wa"
COUNTRY_CODE="6"

echo -e "${BLUE}Lancement de 3 requêtes parallèles...${NC}"
echo ""

SUCCESS_COUNT=0
ERROR_COUNT=0
INSUFFICIENT_COUNT=0

for i in {1..3}; do
  {
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/buy-sms-activate-number" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "apikey: ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"serviceCode\":\"${SERVICE_CODE}\",\"countryCode\":\"${COUNTRY_CODE}\"}")
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success // false')
    ERROR=$(echo $RESPONSE | jq -r '.error // ""')
    
    if [ "$SUCCESS" == "true" ]; then
      ACTIVATION_ID=$(echo $RESPONSE | jq -r '.data.activationId')
      PHONE=$(echo $RESPONSE | jq -r '.data.phone')
      echo -e "${GREEN}✅ Request $i: SUCCESS - $PHONE (ID: $ACTIVATION_ID)${NC}"
      ((SUCCESS_COUNT++))
    else
      if [[ "$ERROR" == *"Insufficient balance"* ]] || [[ "$ERROR" == *"frozen"* ]]; then
        echo -e "${YELLOW}🔒 Request $i: BLOCKED - Insufficient balance${NC}"
        ((INSUFFICIENT_COUNT++))
      else
        echo -e "${RED}❌ Request $i: ERROR - $ERROR${NC}"
        ((ERROR_COUNT++))
      fi
    fi
  } &
  
  # Petit délai entre les requêtes pour mieux voir l'effet
  sleep 0.1
done

# Attendre toutes les requêtes
wait

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      RÉSULTATS                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total requêtes:          ${BLUE}3${NC}"
echo -e "Succès:                  ${GREEN}${SUCCESS_COUNT}${NC}"
echo -e "Bloquées (frozen):       ${YELLOW}${INSUFFICIENT_COUNT}${NC}"
echo -e "Erreurs:                 ${RED}${ERROR_COUNT}${NC}"
echo ""

# Validation
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     VALIDATION                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $SUCCESS_COUNT -ge 1 ] && [ $INSUFFICIENT_COUNT -ge 1 ]; then
  echo -e "${GREEN}✅ TEST RÉUSSI!${NC}"
  echo -e "${GREEN}   - Au moins 1 activation achetée${NC}"
  echo -e "${GREEN}   - Au moins 1 requête bloquée par frozen_balance${NC}"
  echo ""
  echo -e "${GREEN}🎉 Le système freeze-before-call fonctionne!${NC}"
  echo ""
  echo -e "${BLUE}💡 Prochaines étapes:${NC}"
  echo -e "   1. Vérifier dans Dashboard Supabase → Database → users"
  echo -e "      - Colonne frozen_balance devrait être > 0"
  echo -e "   2. Vérifier table transactions"
  echo -e "      - Status: 'pending' pour l'activation en cours"
  echo -e "   3. Attendre réception SMS (20 min max)"
  echo -e "      - frozen_balance retourne à 0"
  echo -e "      - balance est débité"
  exit 0
elif [ $SUCCESS_COUNT -eq 0 ]; then
  echo -e "${YELLOW}⚠️  AVERTISSEMENT: Aucune activation n'a réussi${NC}"
  echo -e "${YELLOW}   Causes possibles:${NC}"
  echo -e "${YELLOW}   - Solde insuffisant${NC}"
  echo -e "${YELLOW}   - Service/Pays indisponible${NC}"
  echo -e "${YELLOW}   - Erreur API SMS-Activate${NC}"
  echo ""
  echo -e "${YELLOW}💡 Vérifiez:${NC}"
  echo -e "   supabase functions logs buy-sms-activate-number --follow"
  exit 1
elif [ $INSUFFICIENT_COUNT -eq 0 ]; then
  echo -e "${YELLOW}⚠️  AVERTISSEMENT: Aucune requête bloquée${NC}"
  echo -e "${YELLOW}   - Possiblement beaucoup de solde disponible${NC}"
  echo -e "${YELLOW}   - Ou les 3 requêtes ont toutes réussi (rare)${NC}"
  echo ""
  echo -e "${BLUE}💡 Relancer avec balance plus faible pour mieux tester${NC}"
  exit 0
else
  echo -e "${GREEN}✅ TEST PARTIEL${NC}"
  echo -e "${GREEN}   - ${SUCCESS_COUNT} activation(s) achetée(s)${NC}"
  echo -e "${GREEN}   - ${INSUFFICIENT_COUNT} requête(s) bloquée(s)${NC}"
  echo -e "${GREEN}   - Le système semble fonctionner correctement${NC}"
  exit 0
fi
