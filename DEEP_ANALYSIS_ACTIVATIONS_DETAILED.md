# 🔍 ANALYSE APPROFONDIE: SYSTÈME ACTIVATIONS

**Date**: 5 décembre 2025  
**Focus**: Flux complet d'une activation de l'achat au commit/refund

---

## 📊 **ARCHITECTURE ACTIVATIONS**

### **Table Structure**

```sql
CREATE TABLE activations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  order_id TEXT,                    -- ID depuis SMS-Activate API
  phone TEXT,                       -- Numéro reçu
  service_code TEXT,                -- Service demandé (wa, tg, etc.)
  country_code TEXT,                -- Pays (6=Russia, etc.)
  operator TEXT,                    -- Opérateur (any, beeline, etc.)
  price DECIMAL(10,2),              -- Prix payé
  frozen_amount DECIMAL(10,2),      -- ⭐ Montant gelé pour cette activation
  status TEXT,                      -- pending, waiting, received, cancelled, timeout
  charged BOOLEAN DEFAULT FALSE,    -- ⭐ true = user a été chargé
  sms_code TEXT,                    -- Code SMS reçu
  sms_text TEXT,                    -- Texte complet du SMS
  provider TEXT DEFAULT 'sms-activate',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Colonnes Critiques**

| Colonne           | Rôle                               | Valeurs                                        |
| ----------------- | ---------------------------------- | ---------------------------------------------- |
| **frozen_amount** | Montant gelé pour CETTE activation | 0 si terminé, = price si pending               |
| **charged**       | User a-t-il été débité?            | true après commit, false après refund          |
| **status**        | État du workflow                   | pending → waiting → received/cancelled/timeout |

---

## 🔄 **FLUX COMPLET D'UNE ACTIVATION**

### **PHASE 1: ACHAT (buy-sms-activate-number)**

#### **État Attendu**

```
User balance: 100Ⓐ
User frozen_balance: 0Ⓐ
```

#### **Actions**

1. ❌ **FREEZE MANUEL** (ligne 234)

   ```typescript
   await supabaseClient
     .from("users")
     .update({
       frozen_balance: frozenBalance + price, // ❌ UPDATE DIRECT
     })
     .eq("id", userId);
   ```

2. **Appel API SMS-Activate**

   - Récupère `activationId` et `phone`

3. ❌ **CREATE ACTIVATION sans frozen_amount** (ligne 345)
   ```typescript
   const { data: activation } = await supabaseClient
     .from("activations")
     .insert({
       user_id: userId,
       order_id: activationId,
       phone: phone,
       price: price,
       status: "pending",
       // ❌ MANQUE: frozen_amount: price
     });
   ```

#### **Résultat Actuel**

```
✅ users.frozen_balance: 5Ⓐ (+5Ⓐ)
✅ users.balance: 100Ⓐ (constant)
❌ activations.frozen_amount: 0Ⓐ (DEVRAIT ÊTRE 5Ⓐ)
❌ activations.charged: false
❌ PAS de log dans balance_operations
```

#### **Problèmes**

1. 🔴 **N'utilise pas atomic_freeze**

   - Pas de log dans balance_operations
   - activations.frozen_amount n'est pas set

2. 🔴 **Incohérence frozen**
   - users.frozen_balance = 5Ⓐ
   - activations.frozen_amount = 0Ⓐ
   - Impossible de réconcilier

---

### **PHASE 2A: SUCCESS (check-sms-activate-status)**

#### **État Attendu**

```
activation.status: pending
activation.frozen_amount: 5Ⓐ
activation.charged: false
user.frozen_balance: 5Ⓐ
user.balance: 100Ⓐ
```

#### **Actions Actuelles** (Lignes 302-357)

1. ❌ **UPDATE DIRECT users**

   ```typescript
   await supabaseClient
     .from("users")
     .update({
       balance: user.balance - activation.price, // ❌ BYPASS atomic_commit
       frozen_balance: Math.max(0, user.frozen_balance - priceToUnfreeze),
     })
     .eq("id", activation.user_id);
   ```

2. ✅ **UPDATE activation**
   ```typescript
   await supabaseClient.from("activations").update({
     status: "received",
     sms_code: smsCode,
     sms_text: smsText,
     // ❌ MANQUE: charged: true, frozen_amount: 0
   });
   ```

#### **Résultat Actuel**

```
✅ users.balance: 95Ⓐ (-5Ⓐ)
✅ users.frozen_balance: 0Ⓐ (-5Ⓐ)
✅ activation.status: 'received'
❌ activation.charged: false (DEVRAIT ÊTRE true)
❌ activation.frozen_amount: 0Ⓐ (OK mais jamais set au départ)
❌ PAS de log dans balance_operations pour le commit
```

#### **Problèmes**

1. 🔴 **BYPASS atomic_commit**

   - Update direct balance
   - Pas de log balance_operations
   - charged reste false

2. 🔴 **Audit trail incomplet**
   - Impossible de tracer le commit
   - Impossible de vérifier cohérence

---

### **PHASE 2B: FAILURE (atomic-timeout-processor)**

#### **État Attendu**

```
activation.status: pending (timeout)
activation.frozen_amount: 5Ⓐ
activation.charged: false
user.frozen_balance: 5Ⓐ
user.balance: 100Ⓐ
```

#### **Actions Actuelles** (Lignes 71-88)

✅ **UTILISE atomic_refund**

```typescript
const { data: refundResult, error: refundError } = await supabaseClient.rpc(
  "atomic_refund",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: "Timeout processor - no SMS received",
  }
);
```

#### **Résultat Attendu**

```
✅ users.balance: 100Ⓐ (constant)
✅ users.frozen_balance: 0Ⓐ (-5Ⓐ)
✅ activation.status: 'timeout'
✅ activation.charged: false
✅ activation.frozen_amount: 0Ⓐ
✅ balance_operations: operation_type='refund'
```

#### **Statut**

✅ **CORRECT** - Utilise atomic_refund

---

## 🔥 **PROBLÈMES IDENTIFIÉS**

### **1. buy-sms-activate-number: N'utilise pas atomic_freeze**

**Impact**:

- ❌ Pas de log freeze dans balance_operations
- ❌ activations.frozen_amount jamais set
- ❌ Impossible de réconcilier users.frozen_balance

**Lignes affectées**: 234, 285, 301, 357

**Solution**:

```typescript
// AVANT l'appel API SMS-Activate
const { data: freezeResult, error: freezeErr } = await supabaseClient.rpc(
  "atomic_freeze",
  {
    p_user_id: userId,
    p_amount: price,
    p_transaction_id: transactionId,
    p_activation_id: null, // Pas encore créée
    p_rental_id: null,
    p_reason: "Buy SMS activation number",
  }
);

if (freezeErr || !freezeResult?.success) {
  throw new Error("Failed to freeze balance");
}

// Après création de l'activation, lier le freeze
await supabaseClient
  .from("balance_operations")
  .update({ activation_id: activation.id })
  .eq("user_id", userId)
  .eq("transaction_id", transactionId)
  .eq("operation_type", "freeze")
  .is("activation_id", null);
```

---

### **2. check-sms-activate-status: N'utilise pas atomic_commit**

**Impact**:

- ❌ Update direct balance (bypass guard)
- ❌ Pas de log commit dans balance_operations
- ❌ activations.charged reste false

**Lignes affectées**: 302-357, 490-560

**Solution**:

```typescript
// Remplacer TOUT le bloc UPDATE par:
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

console.log("✅ User charged via atomic_commit:", {
  committed: commitResult.committed,
  balance_after: commitResult.balance_after,
  frozen_after: commitResult.frozen_after,
});

// Transaction sera completée par atomic_commit si transaction_id fourni
```

---

### **3. recover-sms-from-history: Double débit**

**Impact**:

- 🔴 **DOUBLE DÉBIT**: Update direct + atomic_commit
- 🔴 User perd 2x le prix

**Lignes affectées**: 190-237

**Solution**:

```typescript
// SUPPRIMER ce bloc:
// await supabaseClient
//   .from('users')
//   .update({
//     balance: user.balance - activation.price,  // ❌ SUPPRIMER
//     frozen_balance: newFrozenBalance
//   })

// GARDER SEULEMENT:
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
```

---

## 📊 **STATISTIQUES ATTENDUES**

### **Après Corrections**

#### **buy-sms-activate-number**

```
✅ users.frozen_balance: +5Ⓐ
✅ users.balance: constant (100Ⓐ)
✅ activations.frozen_amount: 5Ⓐ
✅ activations.charged: false
✅ balance_operations: operation_type='freeze'
```

#### **check-sms-activate-status (SMS reçu)**

```
✅ users.balance: -5Ⓐ (100 → 95Ⓐ)
✅ users.frozen_balance: -5Ⓐ (5 → 0Ⓐ)
✅ activations.status: 'received'
✅ activations.charged: true
✅ activations.frozen_amount: 0Ⓐ
✅ balance_operations: operation_type='commit'
```

#### **atomic-timeout-processor (Timeout)**

```
✅ users.balance: constant (100Ⓐ)
✅ users.frozen_balance: -5Ⓐ (5 → 0Ⓐ)
✅ activations.status: 'timeout'
✅ activations.charged: false
✅ activations.frozen_amount: 0Ⓐ
✅ balance_operations: operation_type='refund'
```

---

## 🎯 **PLAN DE CORRECTION ACTIVATIONS**

### **Phase 1: Corriger recover-sms-from-history** (URGENT)

- ❌ Supprimer UPDATE direct balance
- ✅ Garder seulement atomic_commit
- **Priorité**: 🔴 CRITIQUE (cause double débit)

### **Phase 2: Corriger check-sms-activate-status** (URGENT)

- ❌ Supprimer UPDATE direct users (4 occurrences)
- ✅ Remplacer par atomic_commit
- **Priorité**: 🔴 CRITIQUE (bypass guard)

### **Phase 3: Migrer buy-sms-activate-number** (Important)

- ❌ Supprimer freeze manuel
- ✅ Utiliser atomic_freeze
- ✅ Set activations.frozen_amount
- **Priorité**: 🟡 ÉLEVÉ (audit trail)

---

## 🔒 **VÉRIFICATIONS POST-DÉPLOIEMENT**

### **Test 1: Achat → Success**

```sql
-- 1. Après achat
SELECT frozen_amount FROM activations WHERE id = ?
-- Attendu: frozen_amount = price

SELECT operation_type FROM balance_operations WHERE activation_id = ?
-- Attendu: 1 row avec operation_type='freeze'

-- 2. Après SMS reçu
SELECT charged, frozen_amount FROM activations WHERE id = ?
-- Attendu: charged=true, frozen_amount=0

SELECT operation_type FROM balance_operations WHERE activation_id = ?
-- Attendu: 2 rows ('freeze', 'commit')
```

### **Test 2: Achat → Timeout**

```sql
-- Après timeout
SELECT charged, frozen_amount FROM activations WHERE id = ?
-- Attendu: charged=false, frozen_amount=0

SELECT operation_type FROM balance_operations WHERE activation_id = ?
-- Attendu: 2 rows ('freeze', 'refund')
```

### **Test 3: Cohérence Frozen**

```sql
-- Vérifier sum(frozen_amount) = user.frozen_balance
SELECT
  u.id,
  u.frozen_balance as user_frozen,
  COALESCE(SUM(a.frozen_amount), 0) as activations_frozen,
  u.frozen_balance - COALESCE(SUM(a.frozen_amount), 0) as diff
FROM users u
LEFT JOIN activations a ON u.id = a.user_id
GROUP BY u.id
HAVING ABS(u.frozen_balance - COALESCE(SUM(a.frozen_amount), 0)) > 0.01;

-- Attendu: 0 rows (parfaite cohérence)
```

---

## 📝 **RÉSUMÉ**

### **État Actuel**

```
❌ buy-sms-activate-number: Freeze manuel, pas de log
❌ check-sms-activate-status: Update direct, bypass atomic_commit
❌ recover-sms-from-history: Double débit
✅ atomic-timeout-processor: Utilise atomic_refund (OK)
```

### **Après Corrections**

```
✅ buy-sms-activate-number: atomic_freeze
✅ check-sms-activate-status: atomic_commit
✅ recover-sms-from-history: atomic_commit seulement
✅ atomic-timeout-processor: atomic_refund (déjà OK)
```

### **Impact**

- ✅ Audit trail complet dans balance_operations
- ✅ Cohérence parfaite frozen_amount
- ✅ activations.charged toujours à jour
- ✅ Respect des guards SQL

---

**FIN DE L'ANALYSE ACTIVATIONS**
