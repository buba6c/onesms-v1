# 🚨 PROBLÈME CRITIQUE : DOUBLE DÉDUCTION DE BALANCE

**Date**: 30 novembre 2025  
**Sévérité**: 🔴 CRITIQUE  
**Impact**: Perte d'argent réelle pour les utilisateurs

---

## 📊 Symptômes Observés

### Cas Utilisateur (buba6c@gmail.com)

**Avant 1er achat** :

- Balance : 46.84 FCFA
- Frozen : 0 FCFA
- Disponible : 46.84 FCFA

**Après 1er achat (5 FCFA)** :

- Balance : 41.84 FCFA ❌ (devrait rester 46.84)
- Frozen : 5 FCFA ✅
- Disponible : 36.84 FCFA ✅

**Après 2ème achat (5 FCFA)** :

- Balance : 36.84 FCFA ❌ (devrait rester 46.84)
- Frozen : 5 FCFA ✅ (le 1er frozen a été libéré)
- Disponible : 31.84 FCFA ❌ (devrait être 41.84)

**Résultat** : L'utilisateur a perdu **10 FCFA** au lieu de **5 FCFA** !

---

## 🔍 Analyse du Code

### Fonction: `buy-sms-activate-number/index.ts`

**Lignes 264-276** :

```typescript
// 3.2. DEBIT balance AND FREEZE credits atomically
// Comportement souhaité: balance -= prix, frozen += prix
// Le frozen représente l'argent dépensé mais remboursable si annulation
const newBalance = currentBalance - price; // ❌ ERREUR ICI
const newFrozenBalance = frozenBalance + price; // ✅ Correct

const { error: freezeError } = await supabaseClient
  .from("users")
  .update({
    balance: newBalance, // ❌ ERREUR ICI
    frozen_balance: newFrozenBalance,
  })
  .eq("id", userId);
```

**Commentaire dans le code** :

```typescript
// Comportement souhaité: balance -= prix, frozen += prix
```

**Mais c'est FAUX !** Le comportement souhaité devrait être :

```typescript
// Comportement correct: balance INCHANGÉE, frozen += prix
```

---

## 🎯 Logique Correcte

### Système Freeze-Commit-Refund

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: ACHAT (Freeze)                                     │
├─────────────────────────────────────────────────────────────┤
│ Balance:  46 FCFA  →  46 FCFA  (INCHANGÉE)                 │
│ Frozen:    0 FCFA  →   5 FCFA  (Réservé)                   │
│ Dispo:    46 FCFA  →  41 FCFA  (= balance - frozen)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2a: SMS REÇU (Commit)                                 │
├─────────────────────────────────────────────────────────────┤
│ Balance:  46 FCFA  →  41 FCFA  (Déduction finale)          │
│ Frozen:    5 FCFA  →   0 FCFA  (Libéré)                    │
│ Dispo:    41 FCFA  →  41 FCFA  (= balance - frozen)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2b: ANNULATION (Refund)                               │
├─────────────────────────────────────────────────────────────┤
│ Balance:  46 FCFA  →  46 FCFA  (INCHANGÉE)                 │
│ Frozen:    5 FCFA  →   0 FCFA  (Libéré)                    │
│ Dispo:    41 FCFA  →  46 FCFA  (Récupéré)                  │
└─────────────────────────────────────────────────────────────┘
```

### Système Actuel (INCORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: ACHAT (DOUBLE DÉDUCTION !)                         │
├─────────────────────────────────────────────────────────────┤
│ Balance:  46 FCFA  →  41 FCFA  ❌ (Déduit trop tôt)        │
│ Frozen:    0 FCFA  →   5 FCFA  ✅                           │
│ Dispo:    46 FCFA  →  36 FCFA  ✅                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2a: SMS REÇU (Frozen libéré, balance inchangée)       │
├─────────────────────────────────────────────────────────────┤
│ Balance:  41 FCFA  →  41 FCFA  ❌ (Devrait diminuer ici)   │
│ Frozen:    5 FCFA  →   0 FCFA  ✅                           │
│ Dispo:    36 FCFA  →  41 FCFA  ❌ (Devrait rester 41)      │
└─────────────────────────────────────────────────────────────┘

RÉSULTAT: Balance passe de 46 à 41 = 5 FCFA perdus ✅
MAIS: Frozen de 5 FCFA n'a jamais été utilisé pour la déduction finale
DONC: Lors du prochain achat, encore 5 FCFA perdus = 10 FCFA au total ❌
```

---

## 💰 Impact Financier

### Cas de Test

| Achat     | Balance Avant | Frozen Avant | Balance Après | Frozen Après | Perte Réelle   |
| --------- | ------------- | ------------ | ------------- | ------------ | -------------- |
| 1er       | 46 FCFA       | 0 FCFA       | 41 FCFA       | 5 FCFA       | 5 FCFA ✅      |
| SMS       | 41 FCFA       | 5 FCFA       | 41 FCFA       | 0 FCFA       | 0 FCFA ❌      |
| 2ème      | 41 FCFA       | 0 FCFA       | 36 FCFA       | 5 FCFA       | 5 FCFA ✅      |
| **TOTAL** | **46 FCFA**   | -            | **36 FCFA**   | **5 FCFA**   | **10 FCFA** ❌ |

**Attendu** : 46 - 5 - 5 = 36 FCFA (si les 2 achats sont validés)  
**Réel** : 46 → 41 (1er achat) → 36 (2ème achat) = **Perte prématurée**

**Le problème** :

- La balance diminue **à l'achat** au lieu de **à la réception du SMS**
- Le `frozen_balance` est censé "protéger" l'argent pour remboursement
- Mais il est juste un indicateur, pas un mécanisme de déduction différée

---

## 🔧 Solution

### Option 1 : Corriger buy-sms-activate-number (RECOMMANDÉ)

```typescript
// AVANT (INCORRECT)
const newBalance = currentBalance - price; // ❌
const newFrozenBalance = frozenBalance + price;

await supabaseClient.from("users").update({
  balance: newBalance, // ❌
  frozen_balance: newFrozenBalance,
});

// APRÈS (CORRECT)
const newFrozenBalance = frozenBalance + price;

await supabaseClient.from("users").update({
  frozen_balance: newFrozenBalance, // Balance inchangée
});
```

### Option 2 : Corriger check-sms-activate-status

```typescript
// AVANT (INCORRECT)
await supabaseClient.from("users").update({
  frozen_balance: newFrozenBalance, // Juste dégeler
});

// APRÈS (CORRECT)
const newBalance = user.balance - priceToUnfreeze; // Déduire maintenant
const newFrozenBalance = user.frozen_balance - priceToUnfreeze;

await supabaseClient.from("users").update({
  balance: newBalance, // Déduction finale
  frozen_balance: newFrozenBalance,
});
```

### Option 3 : Utiliser les Fonctions Atomiques (IDÉAL)

Remplacer TOUTES les modifications directes par les RPC functions :

```typescript
// ACHAT
await supabase.rpc("atomic_freeze", {
  p_user_id: userId,
  p_amount: price,
  p_transaction_id: activationId,
  p_reason: `Activation ${serviceCode}`,
});

// SMS REÇU
await supabase.rpc("atomic_commit", {
  p_user_id: userId,
  p_activation_id: activationId,
  p_transaction_id: activationId,
});

// ANNULATION
await supabase.rpc("atomic_refund", {
  p_user_id: userId,
  p_activation_id: activationId,
  p_transaction_id: activationId,
});
```

---

## ✅ Plan de Correction

### Phase 1 : URGENT - Corriger le Bug (30 min)

1. ✅ Modifier `buy-sms-activate-number/index.ts`

   - Supprimer `balance: newBalance` dans l'update
   - Ne modifier QUE `frozen_balance`

2. ✅ Modifier `check-sms-activate-status/index.ts`

   - Ajouter `balance: newBalance` dans l'update lors du commit
   - Calculer `newBalance = user.balance - priceToUnfreeze`

3. ✅ Tester avec un achat réel

   - Balance ne doit pas changer à l'achat
   - Balance doit diminuer au SMS reçu

4. ✅ Déployer immédiatement
   ```bash
   npx supabase functions deploy buy-sms-activate-number check-sms-activate-status --no-verify-jwt
   ```

### Phase 2 : IMPORTANT - Migration vers Atomic Functions (2h)

1. Remplacer tous les `.update({ balance, frozen_balance })` par RPC calls
2. Tester extensivement
3. Déployer progressivement

### Phase 3 : CRITIQUE - Correction Rétroactive (1h)

Recalculer la balance correcte pour tous les utilisateurs affectés :

```sql
-- Identifier les users avec incohérence
SELECT
  u.id,
  u.email,
  u.balance,
  u.frozen_balance,
  COUNT(a.id) as activations_total,
  SUM(CASE WHEN a.status IN ('received', 'completed') THEN a.price ELSE 0 END) as total_depense,
  SUM(CASE WHEN a.status IN ('timeout', 'cancelled', 'failed') THEN a.price ELSE 0 END) as total_rembourse,
  (SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND status = 'completed' AND type IN ('credit', 'recharge')) as total_recharge
FROM users u
LEFT JOIN activations a ON a.user_id = u.id
WHERE u.balance > 0
GROUP BY u.id;
```

---

## 📊 Tests de Validation

### Test 1 : Achat Simple

```javascript
// Initial: balance = 100, frozen = 0

// Achat 10 FCFA
await buyNumber({ price: 10 });

// Attendu: balance = 100, frozen = 10, dispo = 90
// Vérifier: balance NE DOIT PAS changer

// SMS reçu
await checkStatus();

// Attendu: balance = 90, frozen = 0, dispo = 90
// Vérifier: balance a diminué MAINTENANT
```

### Test 2 : Annulation

```javascript
// Initial: balance = 100, frozen = 0

// Achat 10 FCFA
await buyNumber({ price: 10 });

// Attendu: balance = 100, frozen = 10

// Annulation
await cancelOrder();

// Attendu: balance = 100, frozen = 0
// Vérifier: balance INCHANGÉE (jamais déduite)
```

### Test 3 : Achats Multiples

```javascript
// Initial: balance = 100, frozen = 0

// 3 achats consécutifs
await buyNumber({ price: 5 }); // balance = 100, frozen = 5
await buyNumber({ price: 5 }); // balance = 100, frozen = 10
await buyNumber({ price: 5 }); // balance = 100, frozen = 15

// Attendu: balance = 100, frozen = 15, dispo = 85

// 1er SMS reçu
await checkStatus(); // balance = 95, frozen = 10

// 2ème SMS reçu
await checkStatus(); // balance = 90, frozen = 5

// 3ème timeout
await checkStatus(); // balance = 90, frozen = 0 (remboursé)

// Final: balance = 90 (2 achats validés à 5 FCFA chacun)
```

---

## 🎯 Conclusion

**Problème** : Double déduction de balance (à l'achat ET au SMS)  
**Cause** : Logique freeze-commit mal implémentée  
**Impact** : Perte d'argent réelle pour tous les utilisateurs  
**Solution** : NE PAS toucher balance à l'achat, SEULEMENT au commit  
**Priorité** : 🔴 CRITIQUE - À corriger IMMÉDIATEMENT

---

**Date de découverte** : 30 novembre 2025  
**Utilisateur affecté** : buba6c@gmail.com (et probablement tous les autres)  
**Perte estimée** : Variable selon le nombre d'achats
