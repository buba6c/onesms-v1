# 🔍 ANALYSE COMPLÈTE: SYSTÈME ATOMIC FUNCTIONS

**Date**: 5 décembre 2025  
**Statut**: ✅ ANALYSE TERMINÉE

---

## 📋 **RÉSUMÉ EXÉCUTIF**

### **Découvertes Critiques**

| Issue     | Fonction                   | Ligne              | Gravité      | Impact                                                     |
| --------- | -------------------------- | ------------------ | ------------ | ---------------------------------------------------------- |
| 🔴 **#1** | check-sms-activate-status  | 323, 350, 519, 550 | **CRITIQUE** | Bypass atomic_commit, pas de log balance_operations        |
| 🔴 **#2** | recover-sms-from-history   | 201, 252           | **CRITIQUE** | Update direct balance + appel atomic_commit (double débit) |
| 🟡 **#3** | continue-sms-activate-rent | 140                | **ÉLEVÉ**    | Update direct balance sans log                             |
| 🟡 **#4** | rent-sms-activate-number   | 271                | **ÉLEVÉ**    | Update direct balance sans log                             |
| 🟡 **#5** | rent-number                | 139                | **ÉLEVÉ**    | Update direct balance sans log                             |
| 🟡 **#6** | continue-rent              | 160                | **ÉLEVÉ**    | Update direct balance sans log                             |
| 🟡 **#7** | buy-sms-activate-rent      | 288                | **ÉLEVÉ**    | Update direct balance sans log                             |
| 🟢 **#8** | set-rent-status            | Multiple           | **INFO**     | Utilise secure_unfreeze_balance (cohérence)                |
| 🟢 **#9** | buy-sms-activate-number    | 234, 285, 301, 357 | **INFO**     | N'utilise PAS atomic_freeze (freeze manuel)                |

### **État du Système**

```
✅ FONCTIONS CORRECTES: 6/15 (40%)
❌ FONCTIONS BUGÉES: 7/15 (47%)
⚠️  FONCTIONS INCOHÉRENTES: 2/15 (13%)
```

---

## 🔴 **PROBLÈME #1: check-sms-activate-status**

### **Description**

Quand un SMS est reçu, la fonction met à jour **directement** `users.balance` et `users.frozen_balance` au lieu d'utiliser `atomic_commit`.

### **Code Bugué** (Lignes 302-357)

```typescript
// ALWAYS update user balance when SMS received
const { data: user } = await supabaseClient
  .from("users")
  .select("balance, frozen_balance")
  .eq("id", activation.user_id)
  .single();

if (user && user.frozen_balance > 0) {
  const priceToUnfreeze = Math.min(activation.price, user.frozen_balance);

  if (transaction) {
    // ❌ UPDATE DIRECT balance ET frozen_balance
    await supabaseClient
      .from("users")
      .update({
        balance: user.balance - activation.price, // ❌ BYPASS atomic_commit
        frozen_balance: Math.max(0, user.frozen_balance - priceToUnfreeze),
      })
      .eq("id", activation.user_id);
  } else {
    // ❌ UPDATE DIRECT frozen_balance
    await supabaseClient
      .from("users")
      .update({
        frozen_balance: Math.max(0, user.frozen_balance - priceToUnfreeze),
      })
      .eq("id", activation.user_id);
  }
}
```

### **Impact**

- ❌ **Bypass `users_balance_guard`**: Le trigger ne se déclenche pas
- ❌ **Pas de log dans `balance_operations`**: Audit trail incomplet
- ❌ **activations.charged** non mis à jour correctement
- ❌ **activations.frozen_amount** non réinitialisé

### **Fix Requis**

```typescript
// ✅ UTILISER atomic_commit
const { data: commitResult, error: commitErr } = await supabaseClient.rpc(
  "atomic_commit",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: transaction?.id || null,
    p_reason: "SMS received - commit charge",
  }
);

if (commitErr || !commitResult?.success) {
  console.error("❌ atomic_commit failed:", commitErr || commitResult);
  throw new Error("Failed to commit charge");
}

console.log("✅ User charged via atomic_commit:", commitResult.committed);
```

### **Occurrences**

- Ligne 323: `balance: user.balance - activation.price`
- Ligne 350: `balance: user.balance - activation.price`
- Ligne 519: `balance: user.balance - activation.price`
- Ligne 550: `balance: user.balance - activation.price`

---

## 🔴 **PROBLÈME #2: recover-sms-from-history**

### **Description**

La fonction fait **DEUX choses en même temps**:

1. Update direct de `users.balance`
2. Appel à `atomic_commit`

Cela cause un **DOUBLE DÉBIT**.

### **Code Bugué** (Lignes 190-237)

```typescript
// ❌ ÉTAPE 1: UPDATE DIRECT balance
await supabaseClient
  .from("users")
  .update({
    balance: user.balance - activation.price, // ❌ DÉBIT #1
    frozen_balance: newFrozenBalance,
  })
  .eq("id", activation.user_id);

// ❌ ÉTAPE 2: atomic_commit (DÉBIT #2)
const { data: commitResult, error: commitErr } = await supabaseClient.rpc(
  "atomic_commit",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_reason: "SMS received (recovery)",
  }
);
```

### **Impact**

- 🔴 **DOUBLE DÉBIT**: User est chargé DEUX FOIS pour le même SMS
- 🔴 **Balance incorrecte**: `balance -= price * 2`
- 🔴 **Perte financière pour l'utilisateur**

### **Fix Requis**

```typescript
// ✅ SUPPRIMER l'UPDATE direct, GARDER SEULEMENT atomic_commit
const { data: commitResult, error: commitErr } = await supabaseClient.rpc(
  "atomic_commit",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: transaction?.id || null,
    p_reason: "SMS recovered from history",
  }
);

if (commitErr || !commitResult?.success) {
  throw new Error("Failed to commit recovered SMS");
}
```

### **Occurrences**

- Ligne 201: `balance: user.balance - activation.price` + atomic_commit
- Ligne 252: `balance: user.balance - activation.price` (sans atomic_commit)

---

## 🟡 **PROBLÈME #3: continue-sms-activate-rent**

### **Description**

Extension d'un rental: update direct de `users.balance` sans log.

### **Code Bugué** (Ligne 140)

```typescript
const newBalance = userProfile.balance - extensionPrice;

await supabaseClient
  .from("users")
  .update({ balance: newBalance }) // ❌ UPDATE DIRECT
  .eq("id", userId);
```

### **Impact**

- ❌ Pas de log dans `balance_operations`
- ❌ Bypass `users_balance_guard`
- ⚠️ Audit trail incomplet

### **Fix Requis**

```typescript
// ✅ Créer une fonction SQL dédiée: atomic_extend_rental
const { error } = await supabaseClient.rpc("atomic_extend_rental", {
  p_user_id: userId,
  p_rental_id: rentalId,
  p_extension_price: extensionPrice,
  p_reason: "Rental extension",
});
```

---

## 🟡 **PROBLÈMES #4-7: Autres UPDATE directs**

| Fonction                 | Ligne | Contexte                                            |
| ------------------------ | ----- | --------------------------------------------------- |
| rent-sms-activate-number | 271   | `.update({ balance: newBalance })`                  |
| rent-number              | 139   | `.update({ balance: profile.balance - totalCost })` |
| continue-rent            | 160   | `.update({ balance: profile.balance - price })`     |
| buy-sms-activate-rent    | 288   | `.update({ balance: userProfile.balance - price })` |

### **Impact Global**

Tous ces UPDATE directs:

- ❌ Bypass `users_balance_guard`
- ❌ Pas de log dans `balance_operations`
- ❌ Incohérence avec le système atomic

---

## 🟢 **PROBLÈME #8: set-rent-status (Incohérence)**

### **Description**

Utilise `secure_unfreeze_balance` au lieu de `atomic_commit`/`atomic_refund`.

### **Code Actuel**

```typescript
// Cancel avec refund
const { data: refundResult } = await supabase.rpc("secure_unfreeze_balance", {
  p_user_id: userId,
  p_rental_id: rental.id,
  p_refund_to_balance: true, // true = refund
  p_reason: "Rental cancelled within 20 min",
});

// Finish
const { data: commitResult } = await supabase.rpc("secure_unfreeze_balance", {
  p_user_id: userId,
  p_rental_id: rental.id,
  p_refund_to_balance: false, // false = commit
  p_reason: "Rental finished",
});
```

### **Impact**

- ⚠️ Fonctionne correctement mais pas cohérent avec les autres fonctions
- ⚠️ `secure_unfreeze_balance` est une fonction custom pour rentals
- ⚠️ Pas de standardisation

### **Recommandation**

```typescript
// ✅ Standardiser sur atomic functions
// Cancel
await supabase.rpc("atomic_refund", {
  p_user_id: userId,
  p_activation_id: null,
  p_rental_id: rental.id,
  p_reason: "Rental cancelled within 20 min",
});

// Finish
await supabase.rpc("atomic_commit", {
  p_user_id: userId,
  p_activation_id: null,
  p_rental_id: rental.id,
  p_reason: "Rental finished",
});
```

---

## 🟢 **PROBLÈME #9: buy-sms-activate-number (N'utilise pas atomic_freeze)**

### **Description**

La fonction d'achat freeze **manuellement** les crédits au lieu d'utiliser `atomic_freeze`.

### **Code Actuel** (Lignes 234, 285, 301, 357)

```typescript
// Initial freeze
await supabaseClient
  .from("users")
  .update({
    frozen_balance: frozenBalance + price, // ❌ FREEZE MANUEL
  })
  .eq("id", userId);

// Rollback si erreur
await supabaseClient
  .from("users")
  .update({
    frozen_balance: Math.max(0, frozenBalance), // ❌ UNFREEZE MANUEL
  })
  .eq("id", userId);
```

### **Impact**

- ⚠️ Pas de log dans `balance_operations` pour le freeze
- ⚠️ Pas de liaison avec `activations.frozen_amount`
- ⚠️ Rollback manuel en cas d'erreur

### **Recommandation**

```typescript
// ✅ UTILISER atomic_freeze
const { data: freezeResult, error: freezeErr } = await supabaseClient.rpc(
  "atomic_freeze",
  {
    p_user_id: userId,
    p_amount: price,
    p_transaction_id: transactionId,
    p_activation_id: activationId,
    p_rental_id: null,
    p_reason: "Buy SMS activation number",
  }
);

if (freezeErr || !freezeResult?.success) {
  throw new Error("Failed to freeze balance");
}
```

---

## 📊 **FLUX COMPLET ACTUEL vs IDÉAL**

### **FLUX ACTUEL (BUGUÉ)**

```
ACHAT (buy-sms-activate-number)
├─ ❌ frozen_balance += price (UPDATE DIRECT)
├─ ✅ activations.insert(frozen_amount=0)  ← BUG: devrait être price
└─ ✅ transactions.insert(status='pending')

SMS REÇU (check-sms-activate-status)
├─ ❌ balance -= price (UPDATE DIRECT)
├─ ❌ frozen_balance -= price (UPDATE DIRECT)
├─ ✅ activations.update(status='received')
└─ ⚠️  PAS de log balance_operations

RECOVERY (recover-sms-from-history)
├─ ❌ balance -= price (UPDATE DIRECT)
├─ ❌ atomic_commit() → balance -= price ENCORE
├─ 🔴 DOUBLE DÉBIT
└─ ❌ User perd 2x le prix
```

### **FLUX IDÉAL (AVEC atomic_functions)**

```
ACHAT (buy-sms-activate-number)
├─ ✅ atomic_freeze(userId, price, activationId)
│   ├─ balance: CONSTANT (100Ⓐ)
│   ├─ frozen_balance: +5Ⓐ (0 → 5Ⓐ)
│   ├─ activations.frozen_amount: 5Ⓐ
│   └─ balance_operations: operation_type='freeze'
└─ ✅ transactions.insert(status='pending')

SMS REÇU (check-sms-activate-status)
├─ ✅ atomic_commit(userId, activationId)
│   ├─ balance: -5Ⓐ (100 → 95Ⓐ)
│   ├─ frozen_balance: -5Ⓐ (5 → 0Ⓐ)
│   ├─ activations.frozen_amount: 0Ⓐ
│   ├─ activations.charged: true
│   └─ balance_operations: operation_type='commit'
└─ ✅ transactions.update(status='completed')

TIMEOUT (atomic-timeout-processor)
├─ ✅ atomic_refund(userId, activationId)
│   ├─ balance: CONSTANT (100Ⓐ)
│   ├─ frozen_balance: -5Ⓐ (5 → 0Ⓐ)
│   ├─ activations.frozen_amount: 0Ⓐ
│   ├─ activations.charged: false
│   └─ balance_operations: operation_type='refund'
└─ ✅ activations.update(status='timeout')
```

---

## ✅ **FONCTIONS CORRECTES**

### **1. cron-check-pending-sms** ✅

- Utilise `atomic_refund` pour annulations
- Lignes 75-88, 148-161

### **2. cleanup-expired-activations** ✅

- Utilise `atomic_refund` pour expirations
- Ligne 82-84

### **3. cleanup-expired-rentals** ✅

- Utilise `atomic_commit` pour consommation
- Ligne 67-99

### **4. cancel-sms-activate-order** ✅

- Utilise `atomic_refund` pour annulations manuelles
- Ligne 109-130

### **5. atomic-timeout-processor** ✅

- Utilise `atomic_refund` pour timeouts
- Ligne 71-88

### **6. moneyfusion-webhook** ✅

- Utilise `admin_add_credit` (corrigé récemment)

### **7. moneroo-webhook** ✅

- Utilise `admin_add_credit` (corrigé récemment)

---

## 📈 **STATISTIQUES FINALES**

### **Fonctions Edge Analysées: 15**

```
✅ CORRECTES:        6 (40%)
🔴 CRITIQUES:        2 (13%)
🟡 ÉLEVÉES:          5 (33%)
🟢 INFOS:            2 (13%)
```

### **Types de Bugs**

| Type                          | Count | Gravité     |
| ----------------------------- | ----- | ----------- |
| Update direct balance         | 7     | 🔴 CRITIQUE |
| Double débit                  | 1     | 🔴 CRITIQUE |
| Pas de log balance_operations | 7     | 🟡 ÉLEVÉ    |
| Bypass users_balance_guard    | 7     | 🟡 ÉLEVÉ    |
| Incohérence atomic functions  | 2     | 🟢 INFO     |

### **Impact Financier Potentiel**

```
🔴 Double débit (recover-sms-from-history):
   - Affecte chaque recovery
   - Perte: 2x le prix du SMS
   - Urgent à corriger

🔴 Pas de log balance_operations:
   - Audit trail incomplet
   - Impossible de tracer certaines transactions
   - Compliance risk
```

---

## 🎯 **PLAN DE CORRECTION**

### **PHASE 1: CRITIQUE (Immédiat)**

1. **Fix recover-sms-from-history** (Double débit)

   - Supprimer UPDATE direct balance
   - Garder seulement atomic_commit
   - Déployer immédiatement

2. **Fix check-sms-activate-status** (Bypass atomic)
   - Remplacer 4 UPDATE directs par atomic_commit
   - Tester sur staging
   - Déployer en production

### **PHASE 2: ÉLEVÉ (Cette semaine)**

3. **Fix continue-sms-activate-rent**
4. **Fix rent-sms-activate-number**
5. **Fix rent-number**
6. **Fix continue-rent**
7. **Fix buy-sms-activate-rent**

### **PHASE 3: STANDARDISATION (Next sprint)**

8. **Standardiser set-rent-status** → atomic_commit/refund
9. **Migrer buy-sms-activate-number** → atomic_freeze

---

## 🔒 **RECOMMANDATIONS SÉCURITÉ**

### **1. Activer users_balance_guard en STRICT MODE**

```sql
-- Actuellement: SOFT (log only)
-- Recommandé: HARD (reject updates)

CREATE OR REPLACE FUNCTION users_balance_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.balance <> NEW.balance THEN
    -- ❌ REJETER au lieu de logger
    RAISE EXCEPTION 'Direct balance update forbidden. Use admin_add_credit or atomic functions.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### **2. Créer un audit quotidien**

```sql
-- Vérifier cohérence balance vs balance_operations
SELECT
  u.id,
  u.email,
  u.balance as current_balance,
  COALESCE(SUM(bo.amount_change), 0) as calculated_balance,
  u.balance - COALESCE(SUM(bo.amount_change), 0) as diff
FROM users u
LEFT JOIN balance_operations bo ON u.id = bo.user_id
WHERE bo.operation_type IN ('deposit', 'commit', 'withdraw')
GROUP BY u.id
HAVING ABS(u.balance - COALESCE(SUM(bo.amount_change), 0)) > 0.01;
```

### **3. Logger TOUTES les opérations balance**

Actuellement manquant:

- Extension de rental (continue-rent)
- Achat rental (buy-rent)
- Recovery SMS (recover-sms)

---

## 📝 **CONCLUSION**

### **État du Système**

Le système atomic functions est **partiellement implémenté**:

- ✅ Les fonctions SQL (atomic_freeze/commit/refund) sont correctes
- ✅ 6/15 edge functions les utilisent correctement
- ❌ 7/15 edge functions font des UPDATE directs (bypass)
- 🔴 1 fonction cause des double débits

### **Priorités**

1. 🔴 **URGENT**: Fix recover-sms-from-history (double débit)
2. 🔴 **URGENT**: Fix check-sms-activate-status (bypass atomic)
3. 🟡 **Important**: Fix 5 autres fonctions avec UPDATE direct
4. 🟢 **Nice to have**: Standardiser sur atomic functions partout

### **Prochaines Étapes**

1. Corriger les bugs critiques (Phase 1)
2. Tester en staging
3. Déployer en production
4. Migrer progressivement les autres fonctions (Phase 2-3)

---

**FIN DE L'ANALYSE COMPLÈTE**
