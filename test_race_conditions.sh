#!/bin/bash

# ============================================================================
# TEST RACE CONDITIONS - buy-sms-activate-number
# ============================================================================
# Objectif: Vérifier que freeze-before-call empêche les achats multiples
# Date: 28 novembre 2025
# ============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://htfqmamvmhdoixqcbbbw.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg"

# Utilisateur test
TEST_EMAIL="race-test@example.com"
TEST_PASSWORD="Test123456!"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          TEST RACE CONDITIONS - FREEZE-BEFORE-CALL          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# ÉTAPE 1: Créer utilisateur test
# ============================================================================
echo -e "${YELLOW}📝 ÉTAPE 1: Création utilisateur test${NC}"

AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

USER_ID=$(echo $AUTH_RESPONSE | jq -r '.user.id // empty')

if [ -z "$USER_ID" ]; then
  echo -e "${YELLOW}⚠️  User already exists, attempting login...${NC}"
  
  AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
  
  USER_ID=$(echo $AUTH_RESPONSE | jq -r '.user.id // empty')
fi

ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token // .session.access_token')

if [ -z "$USER_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Failed to authenticate test user${NC}"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ User authenticated: $USER_ID${NC}"
echo ""

# ============================================================================
# ÉTAPE 2: Donner 10 FCFA de solde (=1 activation)
# ============================================================================
echo -e "${YELLOW}💰 ÉTAPE 2: Configuration du solde (10 FCFA)${NC}"

# Note: Cette requête nécessite normalement des permissions admin
# Dans un environnement de production, utiliser une Edge Function admin
echo -e "${YELLOW}⚠️  Veuillez exécuter manuellement:${NC}"
echo -e "${BLUE}UPDATE users SET balance = 10.00, frozen_balance = 0 WHERE id = '$USER_ID';${NC}"
echo ""
read -p "Appuyez sur ENTER une fois le solde configuré..."
echo ""

# ============================================================================
# ÉTAPE 3: Lancer 10 requêtes SIMULTANÉES
# ============================================================================
echo -e "${YELLOW}🚀 ÉTAPE 3: Test race conditions (10 requêtes simultanées)${NC}"
echo -e "${YELLOW}Prix activation: ~10 FCFA${NC}"
echo -e "${YELLOW}Solde initial: 10 FCFA${NC}"
echo -e "${YELLOW}Résultat attendu: 1 seul succès${NC}"
echo ""

# Paramètres activation
SERVICE_CODE="wa"      # WhatsApp
COUNTRY_CODE="6"       # Indonesia (cheap)

# Lancer 10 requêtes en parallèle
echo -e "${BLUE}Lancement de 10 requêtes parallèles...${NC}"

PIDS=()
SUCCESS_COUNT=0
ERROR_COUNT=0

for i in {1..10}; do
  {
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/buy-sms-activate-number" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "apikey: ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"serviceCode\":\"${SERVICE_CODE}\",\"countryCode\":\"${COUNTRY_CODE}\"}")
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success // false')
    
    if [ "$SUCCESS" == "true" ]; then
      echo -e "${GREEN}✅ Request $i: SUCCESS${NC}"
      echo "$RESPONSE" | jq '.' > "/tmp/race_test_success_$i.json"
      ((SUCCESS_COUNT++))
    else
      ERROR=$(echo $RESPONSE | jq -r '.error // "Unknown error"')
      if [[ "$ERROR" == *"Insufficient balance"* ]]; then
        echo -e "${YELLOW}⏸️  Request $i: BLOCKED (Insufficient balance)${NC}"
      else
        echo -e "${RED}❌ Request $i: ERROR - $ERROR${NC}"
      fi
      ((ERROR_COUNT++))
    fi
  } &
  PIDS+=($!)
done

# Attendre que toutes les requêtes se terminent
echo ""
echo -e "${BLUE}⏳ Attente de la fin de toutes les requêtes...${NC}"
for pid in "${PIDS[@]}"; do
  wait $pid
done

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                       RÉSULTATS                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total requêtes:        ${BLUE}10${NC}"
echo -e "Succès:               ${GREEN}${SUCCESS_COUNT}${NC}"
echo -e "Erreurs/Bloquées:     ${YELLOW}${ERROR_COUNT}${NC}"
echo ""

# ============================================================================
# ÉTAPE 4: Vérifier le solde final
# ============================================================================
echo -e "${YELLOW}🔍 ÉTAPE 4: Vérification du solde final${NC}"
echo -e "${YELLOW}Veuillez vérifier manuellement:${NC}"
echo -e "${BLUE}SELECT balance, frozen_balance FROM users WHERE id = '$USER_ID';${NC}"
echo ""

# ============================================================================
# ÉTAPE 5: Validation
# ============================================================================
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                       VALIDATION                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $SUCCESS_COUNT -eq 1 ]; then
  echo -e "${GREEN}✅ TEST RÉUSSI!${NC}"
  echo -e "${GREEN}   - Exactement 1 activation achetée${NC}"
  echo -e "${GREEN}   - 9 requêtes bloquées (freeze-before-call fonctionne!)${NC}"
  echo ""
  echo -e "${GREEN}🎉 Le bug de race condition est CORRIGÉ!${NC}"
  exit 0
elif [ $SUCCESS_COUNT -eq 0 ]; then
  echo -e "${YELLOW}⚠️  AVERTISSEMENT: Aucune requête n'a réussi${NC}"
  echo -e "${YELLOW}   Vérifiez:${NC}"
  echo -e "${YELLOW}   - Le solde a bien été configuré (10 FCFA)${NC}"
  echo -e "${YELLOW}   - La colonne frozen_balance existe dans users${NC}"
  echo -e "${YELLOW}   - Les logs Edge Function dans Supabase Dashboard${NC}"
  exit 1
else
  echo -e "${RED}❌ TEST ÉCHOUÉ!${NC}"
  echo -e "${RED}   - ${SUCCESS_COUNT} activations achetées (attendu: 1)${NC}"
  echo -e "${RED}   - Le bug de race condition est TOUJOURS PRÉSENT${NC}"
  echo ""
  echo -e "${RED}🔧 Actions requises:${NC}"
  echo -e "${RED}   1. Vérifier que frozen_balance est bien utilisé${NC}"
  echo -e "${RED}   2. Vérifier le déploiement de buy-sms-activate-number${NC}"
  echo -e "${RED}   3. Consulter les logs dans Dashboard Supabase${NC}"
  exit 1
fi
