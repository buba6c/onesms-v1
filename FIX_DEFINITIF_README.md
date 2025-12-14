# 🔥 FIX DÉFINITIF: Problèmes balance/frozen

## 🚨 PROBLÈMES IDENTIFIÉS (ANALYSE PROFONDE)

### Problème 1: "Activation échoue → frozen déduit même si pas son frozen"

**Cause:** `atomic_freeze` DIMINUE balance lors du freeze

```sql
-- File: supabase/migrations/20251202_wallet_atomic_functions.sql
-- Ligne 107-108
v_new_balance := v_user.balance - p_amount;  -- ❌ INCORRECT
UPDATE users SET balance = v_new_balance, frozen_balance = v_new_frozen
```

**Résultat:**

1. User achète activation (10 Ⓐ)
2. `atomic_freeze` → balance 100 → 90, frozen 0 → 10 ❌
3. Activation échoue
4. `atomic_refund` → balance 90 (constant), frozen 10 → 0 ✅
5. **User perd 10 Ⓐ définitivement** car balance n'a jamais remonté

### Problème 2: "Rent expire → frozen libéré ET balance augmente"

**Cause:** `atomic_refund` AUGMENTE balance lors du refund

```sql
-- File: supabase/migrations/20251202_wallet_atomic_functions.sql
-- Ligne 352
v_new_balance := v_user.balance + v_refund;  -- ❌ INCORRECT
UPDATE users SET balance = v_new_balance, frozen_balance = v_new_frozen
```

**Résultat:**

1. User loue rental (15 Ⓐ)
2. `atomic_freeze` → balance 100 → 85, frozen 0 → 15 ❌
3. Rental expire (timeout)
4. `atomic_refund` → balance 85 → 100 ❌, frozen 15 → 0 ✅
5. **User récupère 15 Ⓐ GRATUITS** car balance a augmenté

### Problème 3: "Problèmes généraux de libération frozen"

**Cause:** Incohérence Model A dans les 3 fonctions atomiques

## 🎯 MODEL A (CORRECT)

### Règles strictes:

```
┌─────────────────┬──────────────────────┬─────────────────────┐
│   OPÉRATION     │   BALANCE            │   FROZEN_BALANCE    │
├─────────────────┼──────────────────────┼─────────────────────┤
│ freeze          │ CONSTANT ✅          │ += amount           │
│ refund          │ CONSTANT ✅          │ -= amount           │
│ commit          │ -= amount            │ -= amount           │
│ deposit         │ += amount            │ CONSTANT            │
└─────────────────┴──────────────────────┴─────────────────────┘
```

### Flow complet:

```
ACHAT RÉUSSI (SMS reçu):
1. freeze:  balance=100, frozen=0  → balance=100, frozen=10 ✅
2. commit:  balance=100, frozen=10 → balance=90,  frozen=0  ✅
   ➜ User paye 10 Ⓐ

ACHAT ÉCHOUÉ (timeout):
1. freeze:  balance=100, frozen=0  → balance=100, frozen=10 ✅
2. refund:  balance=100, frozen=10 → balance=100, frozen=0  ✅
   ➜ User paye 0 Ⓐ (remboursé)
```

## 🛠️ SOLUTION DÉFINITIVE

### Fichier: `FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql`

#### 1️⃣ atomic_freeze (CORRIGÉ)

```sql
-- ❌ AVANT (ligne 107)
v_new_balance := v_user.balance - p_amount;

-- ✅ APRÈS
-- balance reste CONSTANT, on ne calcule que frozen
v_new_frozen := v_user.frozen_balance + p_amount;

-- ❌ AVANT (ligne 113)
UPDATE users SET balance = v_new_balance, frozen_balance = v_new_frozen

-- ✅ APRÈS
UPDATE users SET frozen_balance = v_new_frozen -- balance pas touché!
```

#### 2️⃣ atomic_commit (DÉJÀ CORRECT)

```sql
-- ✅ CORRECT: balance ET frozen diminuent
v_commit := LEAST(v_frozen_amount, v_user.frozen_balance);
v_new_balance := GREATEST(0, v_user.balance - v_commit);
v_new_frozen := GREATEST(0, v_user.frozen_balance - v_commit);

UPDATE users SET balance = v_new_balance, frozen_balance = v_new_frozen
```

#### 3️⃣ atomic_refund (CORRIGÉ)

```sql
-- ❌ AVANT (ligne 352)
v_new_balance := v_user.balance + v_refund;

-- ✅ APRÈS
-- balance reste CONSTANT, on ne calcule que frozen
v_new_frozen := GREATEST(0, v_user.frozen_balance - v_refund);

-- ❌ AVANT (ligne 358)
UPDATE users SET balance = v_new_balance, frozen_balance = v_new_frozen

-- ✅ APRÈS
UPDATE users SET frozen_balance = v_new_frozen -- balance pas touché!
```

## 📋 DÉPLOIEMENT

### Étape 1: Diagnostic (OPTIONNEL)

```bash
node DEEP_DIAGNOSTIC_COMPLET.mjs
```

Montre tous les cas récents où balance a changé incorrectement.

### Étape 2: Test AVANT déploiement

```bash
node TEST_FIX_ATOMIC_FUNCTIONS.mjs
```

**Important:** Ce script teste les 3 fonctions sur Supabase AVANT le fix définitif.
Il va probablement ÉCHOUER car les fonctions actuelles sont incorrectes.

### Étape 3: Déployer le FIX

```sql
-- Ouvrir Supabase SQL Editor
-- Copier-coller FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql
-- Exécuter
```

**Contient:**

- ✅ `atomic_freeze` corrigé (balance constant)
- ✅ `atomic_commit` maintenu (balance diminue)
- ✅ `atomic_refund` corrigé (balance constant)

### Étape 4: Valider le FIX

```bash
node TEST_FIX_ATOMIC_FUNCTIONS.mjs
```

Tous les tests doivent être ✅ RÉUSSIS

### Étape 5: Monitoring

```sql
-- Vérifier balance_operations récentes
SELECT
  operation_type,
  COUNT(*) as count,
  SUM(CASE WHEN balance_after != balance_before THEN 1 ELSE 0 END) as balance_changed,
  SUM(CASE WHEN frozen_after != frozen_before THEN 1 ELSE 0 END) as frozen_changed
FROM balance_operations
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY operation_type;
```

**Résultat attendu:**

```
operation_type | count | balance_changed | frozen_changed
---------------|-------|-----------------|----------------
freeze         |  10   |       0         |      10        ✅
refund         |   5   |       0         |       5        ✅
commit         |   3   |       3         |       3        ✅
deposit        |   2   |       2         |       0        ✅
```

## 🧪 TESTS DE VALIDATION

### Test 1: freeze → balance constant

```sql
-- Avant: balance=100, frozen=0
SELECT atomic_freeze(user_id, 10, tx_id, activation_id);
-- Après: balance=100, frozen=10 ✅
```

### Test 2: commit → balance ET frozen diminuent

```sql
-- Avant: balance=100, frozen=10
SELECT atomic_commit(user_id, activation_id);
-- Après: balance=90, frozen=0 ✅
```

### Test 3: refund → balance constant

```sql
-- Avant: balance=100, frozen=10
SELECT atomic_refund(user_id, activation_id);
-- Après: balance=100, frozen=0 ✅
```

## 🎯 RÉSULTATS ATTENDUS

### Avant FIX:

- ❌ Activation échoue → User perd balance
- ❌ Rent expire → User gagne balance gratuits
- ❌ balance_operations incohérentes

### Après FIX:

- ✅ Activation échoue → User récupère frozen, balance constant
- ✅ Rent expire → User récupère frozen, balance constant
- ✅ Seul `commit` et `deposit` modifient balance
- ✅ `freeze` et `refund` ne touchent QUE frozen_balance

## 📊 IMPACT

### Users affectés:

- Tous ceux qui ont eu activation/rental échoués récemment
- Chercher dans balance_operations les refund avec balance_after != balance_before

```sql
-- Trouver users affectés par le bug
SELECT
  user_id,
  COUNT(*) as refunds_incorrects,
  SUM(balance_after - balance_before) as balance_gained
FROM balance_operations
WHERE operation_type = 'refund'
  AND balance_after != balance_before
  AND created_at > '2024-12-01'
GROUP BY user_id
ORDER BY balance_gained DESC;
```

### Correction manuelle (si nécessaire):

```sql
-- Si des users ont gagné balance incorrectement
UPDATE users
SET balance = balance - :balance_incorrectly_gained
WHERE id = :user_id;

-- Logger la correction
INSERT INTO balance_operations (
  user_id, operation_type, amount,
  balance_before, balance_after, description
) VALUES (
  :user_id, 'correction', -:amount,
  :old_balance, :new_balance, 'Correction bug refund'
);
```

## ✅ CHECKLIST FINALE

- [ ] 1. Exécuter `DEEP_DIAGNOSTIC_COMPLET.mjs` (voir état actuel)
- [ ] 2. Exécuter `TEST_FIX_ATOMIC_FUNCTIONS.mjs` (tests avant fix)
- [ ] 3. Déployer `FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql`
- [ ] 4. Re-exécuter `TEST_FIX_ATOMIC_FUNCTIONS.mjs` (tous ✅)
- [ ] 5. Monitoring 1h: vérifier balance_operations
- [ ] 6. Identifier users affectés (query ci-dessus)
- [ ] 7. Correction manuelle si nécessaire
- [ ] 8. Communiquer aux users affectés

## 🔗 FICHIERS

1. **DEEP_DIAGNOSTIC_COMPLET.mjs** - Diagnostic profond (trouve les bugs)
2. **FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql** - FIX des 3 fonctions
3. **TEST_FIX_ATOMIC_FUNCTIONS.mjs** - Tests validation
4. **Ce fichier (README)** - Documentation complète

## 🎉 CONCLUSION

Ce FIX corrige DÉFINITIVEMENT les 3 problèmes en respectant strictement Model A:

1. ✅ **freeze:** balance CONSTANT, frozen augmente
2. ✅ **refund:** balance CONSTANT, frozen diminue
3. ✅ **commit:** balance diminue, frozen diminue

Plus AUCUNE perte de balance incorrecte possible.
Plus AUCUN gain de balance gratuit possible.

**Système 100% cohérent et prévisible.**
