# 🔍 DEEP ANALYSIS: SYSTÈME ATOMIC FUNCTIONS - COMMIT & REFUND

**Date**: 5 décembre 2025
**Analyse**: Système complet de gestion des transactions atomiques

---

## 📊 **VUE D'ENSEMBLE**

### **Fonctions Atomiques Déployées**

| Fonction                    | Signature                                                                         | Utilisation                                   | Fichier Source                               |
| --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| **atomic_freeze**           | `(p_user_id, p_amount, p_transaction_id, p_activation_id, p_rental_id, p_reason)` | Geler des crédits lors d'un achat             | `FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql` |
| **atomic_commit**           | `(p_user_id, p_activation_id, p_rental_id, p_transaction_id, p_reason)`           | Confirmer une transaction (charger le client) | `FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql` |
| **atomic_refund**           | `(p_user_id, p_activation_id, p_rental_id, p_transaction_id, p_reason)`           | Rembourser des crédits gelés                  | `FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql` |
| **admin_add_credit**        | `(p_user_id, p_amount, p_admin_note)`                                             | Créditer un utilisateur (admin)               | `admin_add_credit.sql`                       |
| **secure_unfreeze_balance** | `(p_user_id, p_amount, p_refund_to_balance)`                                      | Libérer frozen_balance (guard-safe)           | `sql/secure_unfreeze_balance_guard_safe.sql` |

---

## 🔄 **FLOW COMPLET D'UNE TRANSACTION**

### **1. ACHAT (Activation/Rental)**

```
User clique "Buy Number"
   ↓
Edge Function: buy-sms-activate-number
   ↓
atomic_freeze(userId, price, ...)
   ├─ balance: CONSTANT (100Ⓐ → 100Ⓐ)
   ├─ frozen_balance: +5Ⓐ (0 → 5Ⓐ)
   ├─ activations.frozen_amount: 5Ⓐ
   └─ balance_operations: operation_type='freeze'
   ↓
Activation créée (status='pending', frozen_amount=5Ⓐ)
```

### **2A. SUCCESS - SMS REÇU (Commit)**

```
SMS reçu de l'API
   ↓
Edge Function: check-sms-activate-status
   ↓
atomic_commit(userId, activationId, ...)
   ├─ balance: -5Ⓐ (100Ⓐ → 95Ⓐ)
   ├─ frozen_balance: -5Ⓐ (5Ⓐ → 0Ⓐ)
   ├─ activations.frozen_amount: 0Ⓐ
   ├─ activations.charged: true
   └─ balance_operations: operation_type='commit'
   ↓
Activation finalisée (status='received', charged=true)
```

### **2B. FAILURE - TIMEOUT/CANCEL (Refund)**

```
Timeout ou Cancel
   ↓
Edge Function: atomic-timeout-processor / cancel-sms-activate-order
   ↓
atomic_refund(userId, activationId, ...)
   ├─ balance: CONSTANT (100Ⓐ → 100Ⓐ)
   ├─ frozen_balance: -5Ⓐ (5Ⓐ → 0Ⓐ)
   ├─ activations.frozen_amount: 0Ⓐ
   ├─ activations.charged: false
   └─ balance_operations: operation_type='refund'
   ↓
Activation annulée (status='cancelled/timeout', charged=false)
```

---

## 🎯 **UTILISATION PAR EDGE FUNCTION**

### **A. FONCTIONS UTILISANT atomic_refund**

#### **1. cron-check-pending-sms** ✅

**Path**: `supabase/functions/cron-check-pending-sms/index.ts`
**Lignes**: 75-88, 148-161
**Contexte**: Cron job qui vérifie les SMS en attente

```typescript
// Refund pour activations timeout/cancelled
const { data: refundResult, error: refundErr } = await supabaseClient.rpc(
  "atomic_refund",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: "Activation cancelled by SMS-Activate API",
  }
);
```

**Status**: ✅ Utilise correctement atomic_refund

---

#### **2. cleanup-expired-activations** ✅

**Path**: `supabase/functions/cleanup-expired-activations/index.ts`
**Ligne**: 82-84
**Contexte**: Nettoie les activations expirées

```typescript
const { data: refundResult, error: refundError } = await supabaseClient.rpc(
  "atomic_refund",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: "Activation expired without SMS",
  }
);
```

**Status**: ✅ Utilise correctement atomic_refund

---

#### **3. cancel-sms-activate-order** ✅

**Path**: `supabase/functions/cancel-sms-activate-order/index.ts`
**Ligne**: 109-130
**Contexte**: Annulation manuelle d'une activation

```typescript
const { data: refundResult, error: refundError } = await supabaseClient.rpc(
  "atomic_refund",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: "Manual cancellation by user",
  }
);
```

**Status**: ✅ Utilise correctement atomic_refund

---

#### **4. check-sms-activate-status** ✅

**Path**: `supabase/functions/check-sms-activate-status/index.ts`
**Lignes**: 373-417, 572-601
**Contexte**: Vérifie le statut SMS et gère les refunds

```typescript
// Cas 1: NO_ID / BANNED / CANCELLED
.rpc('atomic_refund', {
  p_user_id: activation.user_id,
  p_activation_id: activation.id,
  p_rental_id: null,
  p_transaction_id: null,
  p_reason: `API error: ${statusText}`
})

// Cas 2: STATUS_CANCEL
.rpc('atomic_refund', {
  p_user_id: activation.user_id,
  p_activation_id: activation.id,
  p_rental_id: null,
  p_transaction_id: null,
  p_reason: 'Activation cancelled by SMS-Activate'
})
```

**Status**: ✅ Utilise correctement atomic_refund

---

#### **5. atomic-timeout-processor** ✅

**Path**: `supabase/functions/atomic-timeout-processor/index.ts`
**Ligne**: 71-88
**Contexte**: Processeur dédié pour les timeouts

```typescript
const { data: refundResult, error: refundError } = await supabaseClient.rpc(
  "atomic_refund",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: "Timeout processor - no SMS received within time limit",
  }
);
```

**Status**: ✅ Utilise correctement atomic_refund

---

### **B. FONCTIONS UTILISANT atomic_commit**

#### **1. cleanup-expired-rentals** ✅

**Path**: `supabase/functions/cleanup-expired-rentals/index.ts`
**Ligne**: 67-99
**Contexte**: Nettoie les locations expirées (consommées)

```typescript
const { data: commitResult, error: commitError } = await supabaseClient.rpc(
  "atomic_commit",
  {
    p_user_id: rental.user_id,
    p_activation_id: null,
    p_rental_id: rental.id,
    p_transaction_id: null,
    p_reason: "Rental expired - consumed",
  }
);
```

**Logique**:

- ✅ Rental expiré = service consommé = COMMIT (pas refund)
- ✅ Libère frozen_balance ET charge balance

**Status**: ✅ Utilise correctement atomic_commit

---

#### **2. recover-sms-from-history** ✅

**Path**: `supabase/functions/recover-sms-from-history/index.ts`
**Lignes**: 206-237
**Contexte**: Récupère SMS depuis l'historique API

```typescript
// Cas 1: SMS trouvé pour activation
const { data: commitResult, error: commitErr } = await supabaseClient.rpc(
  "atomic_commit",
  {
    p_user_id: activation.user_id,
    p_activation_id: activation.id,
    p_rental_id: null,
    p_transaction_id: null,
    p_reason: "SMS recovered from history",
  }
);

// Cas 2: SMS trouvé pour rental
const { data: commitResult, error: commitErr } = await supabaseClient.rpc(
  "atomic_commit",
  {
    p_user_id: rental.user_id,
    p_activation_id: null,
    p_rental_id: rental.id,
    p_transaction_id: null,
    p_reason: "SMS recovered from history",
  }
);
```

**Status**: ✅ Utilise correctement atomic_commit

---

## ⚠️ **PROBLÈMES DÉTECTÉS**

### **1. check-sms-activate-status: Double Gestion Balance**

**Fichier**: `supabase/functions/check-sms-activate-status/index.ts`
**Lignes**: 302-357 ET 499-550

**Code actuel**:

```typescript
// ALWAYS update user balance when SMS received
const { data: user } = await supabaseClient
  .from("users")
  .select("balance, frozen_balance")
  .eq("id", activation.user_id)
  .single();

if (user && user.frozen_balance > 0) {
  const priceToUnfreeze = Math.min(activation.price, user.frozen_balance);

  if (!activation.charged) {
    // Update balance AND frozen
    await supabaseClient
      .from("users")
      .update({
        balance: user.balance - activation.price, // ❌ UPDATE DIRECT
        frozen_balance: Math.max(0, user.frozen_balance - priceToUnfreeze),
      })
      .eq("id", activation.user_id);
  }
}
```

**Problème**:

- ❌ **UPDATE DIRECT** de `users.balance` et `frozen_balance`
- ❌ **NE PASSE PAS** par atomic_commit
- ❌ **BYPASS** users_balance_guard
- ❌ **PAS DE LOG** dans balance_operations pour la partie balance

**Impact**:

- ⚠️ Désynchronisation possible balance/frozen
- ⚠️ Audit trail incomplet
- ⚠️ Viola contrainte si guard activé

**Solution**:

```typescript
// Remplacer par atomic_commit
const { error: commitErr } = await supabaseClient.rpc("atomic_commit", {
  p_user_id: activation.user_id,
  p_activation_id: activation.id,
  p_rental_id: null,
  p_transaction_id: null,
  p_reason: "SMS received - commit charge",
});
```

---

### **2. Moneroo/MoneyFusion: Crédit sans atomic**

**Analysé précédemment**: ✅ CORRIGÉ dans dernier commit

- MoneyFusion: Maintenant utilise `admin_add_credit()`
- Moneroo: Maintenant utilise `admin_add_credit()`

---

### **3. set-rent-status: Utilise secure_unfreeze_balance**

**Fichier**: `supabase/functions/set-rent-status/index.ts`

**Code actuel**:

```typescript
// Cancel avec refund
const { data: refundResult, error: refundErr } = await supabase.rpc(
  "secure_unfreeze_balance",
  {
    p_user_id: rental.user_id,
    p_amount: refundAmount,
    p_refund_to_balance: true, // true = refund
    p_reason: "Rental cancelled within 20 min",
  }
);

// Finish ou cancel > 20min
const { data: commitResult, error: commitErr } = await supabase.rpc(
  "secure_unfreeze_balance",
  {
    p_user_id: rental.user_id,
    p_amount: rental.frozen_amount,
    p_refund_to_balance: false, // false = commit
    p_reason: "Rental finished",
  }
);
```

**Status**: ✅ OK mais différent des autres

- Utilise `secure_unfreeze_balance` au lieu de `atomic_commit/atomic_refund`
- Fonction custom pour rentals
- Fonctionne mais manque de cohérence

**Recommandation**: ⚠️ Standardiser sur atomic_commit/atomic_refund

---

### **4. continue-sms-activate-rent: UPDATE DIRECT balance**

**Fichier**: `supabase/functions/continue-sms-activate-rent/index.ts`
**Ligne**: 145-150

```typescript
// Update user balance
const newBalance = userProfile.balance - extensionPrice;

await supabaseClient
  .from("users")
  .update({ balance: newBalance }) // ❌ UPDATE DIRECT
  .eq("id", userId);
```

**Problème**:

- ❌ **UPDATE DIRECT** de balance
- ❌ **PAS DE LOG** dans balance_operations
- ❌ **BYPASS** users_balance_guard

**Solution**:
Utiliser une fonction SQL dédiée ou atomic_freeze pour l'extension

---

## 📈 **STATISTIQUES DES FONCTIONS ATOMIQUES**

### **Fichiers SQL avec atomic functions**

```
Total SQL files: 24
- FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql (SOURCE PRINCIPALE)
- atomic_commit_fixed.sql
- atomic_commit_with_drop.sql
- atomic_freeze_guard_safe.sql
- fix_atomic_refund_timeout.sql
- DEPLOY_MISSING_FUNCTIONS.sql
- DEPLOY_FUNCTIONS_FIXED.sql
```

### **Edge Functions utilisant atomic**

```
Total: 7 fonctions
- cron-check-pending-sms: atomic_refund
- cleanup-expired-activations: atomic_refund
- cleanup-expired-rentals: atomic_commit
- cancel-sms-activate-order: atomic_refund
- check-sms-activate-status: atomic_refund (+ UPDATE DIRECT ❌)
- recover-sms-from-history: atomic_commit
- atomic-timeout-processor: atomic_refund
```

---

## ✅ **RÉSUMÉ**

### **Fonctions Bien Implémentées** ✅

1. ✅ cron-check-pending-sms → atomic_refund
2. ✅ cleanup-expired-activations → atomic_refund
3. ✅ cleanup-expired-rentals → atomic_commit
4. ✅ cancel-sms-activate-order → atomic_refund
5. ✅ recover-sms-from-history → atomic_commit
6. ✅ atomic-timeout-processor → atomic_refund
7. ✅ moneyfusion-webhook → admin_add_credit (corrigé)
8. ✅ moneroo-webhook → admin_add_credit (corrigé)

### **Fonctions À Corriger** ❌

1. ❌ **check-sms-activate-status** (lignes 302-357, 499-550)
   - Update direct balance + frozen_balance
   - Ne passe pas par atomic_commit
2. ⚠️ **continue-sms-activate-rent** (ligne 145-150)

   - Update direct balance
   - Pas de log dans balance_operations

3. ⚠️ **set-rent-status** (cohérence)
   - Utilise secure_unfreeze_balance au lieu de atomic functions
   - Fonctionne mais pas standard

---

## 🎯 **RECOMMANDATIONS**

### **Priorité 1: Corriger check-sms-activate-status**

Remplacer les UPDATE direct par atomic_commit (2 occurrences)

### **Priorité 2: Standardiser set-rent-status**

Migrer vers atomic_commit/atomic_refund pour cohérence

### **Priorité 3: Corriger continue-sms-activate-rent**

Créer fonction SQL pour extensions ou utiliser atomic

---

## 🔒 **SÉCURITÉ**

### **Guards Actifs**

- ✅ `users_balance_guard`: Empêche UPDATE direct de balance sans log
- ✅ `protect_frozen_amount`: Empêche UPDATE direct de frozen_amount
- ✅ `frozen_consistency_guards`: Vérifie cohérence frozen

### **Bypass Détectés**

1. ❌ check-sms-activate-status (2 occurrences)
2. ❌ continue-sms-activate-rent (1 occurrence)

---

**FIN DE L'ANALYSE**
