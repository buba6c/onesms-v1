#!/bin/bash

# Test de l'environnement local OneSMS v1
# Teste: Fonctions atomiques, Logging, Validations

set -e

echo "🧪 TEST LOCAL ONESMS V1 SYSTEM"
echo "================================="
echo ""

# Connexion DB
DB_HOST="127.0.0.1"
DB_PORT="54322"
DB_USER="postgres"
DB_PASS="postgres"
export PGPASSWORD=$DB_PASS

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Tests
PASSED=0
FAILED=0

# Fonction pour tester
test_db() {
  local name=$1
  local query=$2
  
  echo -n "Testing $name... "
  if result=$(psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -t -c "$query" 2>&1); then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC}: $result"
    ((FAILED++))
    return 1
  fi
}

# Test 1: Connexion
test_db "Database connection" "SELECT version();" > /dev/null 2>&1 || exit 1

# Test 2: Tables existent
test_db "Users table" "SELECT COUNT(*) FROM users;" > /dev/null 2>&1 || exit 1
test_db "Activations table" "SELECT COUNT(*) FROM activations;" > /dev/null 2>&1 || exit 1
test_db "Balance operations table" "SELECT COUNT(*) FROM balance_operations;" > /dev/null 2>&1 || exit 1
test_db "Logs provider table" "SELECT COUNT(*) FROM logs_provider;" > /dev/null 2>&1 || exit 1

# Test 3: Functions existent
test_db "atomic_freeze function" "SELECT 1 FROM information_schema.routines WHERE routine_name = 'atomic_freeze';" > /dev/null 2>&1 || exit 1
test_db "atomic_commit function" "SELECT 1 FROM information_schema.routines WHERE routine_name = 'atomic_commit';" > /dev/null 2>&1 || exit 1
test_db "atomic_refund function" "SELECT 1 FROM information_schema.routines WHERE routine_name = 'atomic_refund';" > /dev/null 2>&1 || exit 1

# Test 4: Test data exists
test_db "Test user exists" "SELECT COUNT(*) FROM users WHERE email = 'test@onesms.local';" > /dev/null 2>&1 || exit 1
test_db "Test activations exist" "SELECT COUNT(*) FROM activations;" | grep -q "^[[:space:]]*3" || exit 1

# Test 5: Atomic operations
echo ""
echo "Testing atomic operations..."

# Reset balance for clean test
psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -c "
DELETE FROM balance_operations;
UPDATE users SET balance = 5000.00, frozen_balance = 0.00 WHERE email = 'test@onesms.local';
" > /dev/null

USER_ID=$(psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -t -c "SELECT id FROM users WHERE email = 'test@onesms.local';")

# Freeze
RESULT=$(psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -t -c "
  SELECT (atomic_freeze('$USER_ID'::uuid, 100.00, NULL::uuid, 'test freeze') -> 'success')::text;" | xargs)
[ "$RESULT" = "true" ] && echo -e "  ${GREEN}✓${NC} Freeze works" || (echo -e "  ${RED}✗${NC} Freeze failed"; exit 1)

# Commit
RESULT=$(psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -t -c "
  SELECT (atomic_commit('$USER_ID'::uuid, 50.00, NULL::uuid, 'test commit') -> 'success')::text;" | xargs)
[ "$RESULT" = "true" ] && echo -e "  ${GREEN}✓${NC} Commit works" || (echo -e "  ${RED}✗${NC} Commit failed"; exit 1)

# Refund
RESULT=$(psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -t -c "
  SELECT (atomic_refund('$USER_ID'::uuid, 25.00, NULL::uuid, 'test refund') -> 'success')::text;" | xargs)
[ "$RESULT" = "true" ] && echo -e "  ${GREEN}✓${NC} Refund works" || (echo -e "  ${RED}✗${NC} Refund failed"; exit 1)

# Test logging
echo ""
echo "Testing logging system..."
LOG_COUNT=$(psql -h $DB_HOST -U $DB_USER -p $DB_PORT -d postgres -t -c "SELECT COUNT(*) FROM logs_provider;" | xargs)
[ "$LOG_COUNT" -gt 0 ] && echo -e "  ${GREEN}✓${NC} Logging works ($LOG_COUNT entries)" || (echo -e "  ${RED}✗${NC} Logging failed"; exit 1)

# Summary
echo ""
echo "================================="
echo "Tests passed: $PASSED"
[ $FAILED -gt 0 ] && echo "Tests failed: $FAILED" || echo "All tests passed! ✅"
echo ""

if [ $FAILED -gt 0 ]; then
  exit 1
fi
