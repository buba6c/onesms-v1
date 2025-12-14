# 🔒 AUDIT COMPLET : GESTION WALLET (Balance & Frozen)

**Date:** 30 novembre 2025  
**Système:** ONE SMS V1  
**Statut:** ⚠️ SÉCURISÉ MAIS INCOMPLET

---

## 📊 RÉSUMÉ EXÉCUTIF

### ✅ POINTS FORTS

1. **Système Freeze-Commit-Refund Implémenté**

   - ✅ Freeze lors de l'achat (balance -= prix, frozen += prix)
   - ✅ Commit au succès (frozen -= prix, balance inchangé)
   - ✅ Refund en cas d'échec (frozen -= prix, balance += prix)
   - ✅ Utilisation de `frozen_amount` par activation pour sécurité

2. **Protection contre Double-Processing**

   - ✅ Vérification transaction.status (pending/completed/refunded)
   - ✅ Vérification activation.status (pending/waiting/success/cancelled)
   - ✅ Locks atomiques via UPDATE avec WHERE status IN (...)
   - ✅ Messages "Already processed" partout

3. **Calculs Sécurisés**

   - ✅ `Math.min(frozenAmount, frozen_balance)` pour éviter underflow
   - ✅ `Math.max(0, frozen_balance - amount)` pour éviter négatifs
   - ✅ Utilisation de `activation.frozen_amount` (pas de recalcul global)

4. **Rollback Automatique**
   - ✅ Rollback si API échoue (refund + unfreeze)
   - ✅ Gestion d'erreurs avec try-catch
   - ✅ Logs détaillés à chaque étape

### ❌ PROBLÈMES CRITIQUES

1. **❌ PAS DE FOR UPDATE (Verrouillage DB manquant)**

   - **Impact:** Risque de race conditions sur opérations simultanées
   - **Gravité:** 🔴 CRITIQUE
   - **Affecté:** Toutes les Edge Functions
   - **Preuve:** Aucune requête `SELECT ... FOR UPDATE` trouvée
   - **Conséquence:** Deux achats simultanés peuvent créer un dépassement de balance

2. **❌ PAS DE TRANSACTIONS DATABASE**

   - **Impact:** Risque d'incohérence entre balance, frozen et transactions
   - **Gravité:** 🔴 CRITIQUE
   - **Affecté:** Toutes les Edge Functions
   - **Preuve:** Aucun `BEGIN`, `COMMIT`, `ROLLBACK` SQL trouvé
   - **Conséquence:** Si UPDATE users échoue après UPDATE transaction, données incohérentes

3. **❌ TABLE balance_operations N'EXISTE PAS**

   - **Impact:** Pas d'audit trail complet
   - **Gravité:** 🟠 MAJEUR
   - **Affecté:** Logs de toutes les opérations
   - **Preuve:** Code essaye d'insérer mais table manquante (catch silencieux)
   - **Conséquence:** Impossible de retracer l'historique des opérations balance/frozen

4. **❌ PAS DE CRON ANTI-FRAUDE**
   - **Impact:** Pas de détection d'incohérences
   - **Gravité:** 🟠 MAJEUR
   - **Affecté:** Détection de fraude
   - **Preuve:** Aucune tâche CRON mentionnée dans checklist
   - **Conséquence:** Balance négatif ou frozen > balance non détecté automatiquement

---

## 🔍 ANALYSE DÉTAILLÉE PAR COMPOSANT

### 1. ✅ FREEZE (Réservation de Fonds)

**Fichier:** `buy-sms-activate-number/index.ts` (lignes 209-280)

#### Implémentation Actuelle

```typescript
// ✅ Vérification disponibilité
const frozenBalance = userProfile.frozen_balance || 0;
const availableBalance = userProfile.balance - frozenBalance;
if (availableBalance < price) throw Error;

// ✅ Création transaction pending
const transaction = await supabase.from("transactions").insert({
  status: "pending",
  amount: -price,
});

// ✅ Freeze: balance -= prix, frozen += prix
const newBalance = currentBalance - price;
const newFrozenBalance = frozenBalance + price;
await supabase.from("users").update({
  balance: newBalance,
  frozen_balance: newFrozenBalance,
});
```

#### ✅ Points Positifs

- Calcul correct: `balance - frozen` pour disponibilité
- Transaction créée AVANT modification wallet
- Balance et frozen modifiés ensemble
- Logs clairs

#### ❌ Problèmes

1. **CRITIQUE:** Pas de `FOR UPDATE` → 2 achats simultanés peuvent réussir avec balance insuffisante
2. **CRITIQUE:** Pas de transaction DB → Si freeze échoue, transaction reste orpheline
3. **MAJEUR:** Pas d'audit dans `balance_operations`
4. **MINEUR:** Pas de vérification `amount > 0` avant UPDATE

#### 🔧 Correction Nécessaire

```typescript
// BEGIN TRANSACTION
const { data: user } = await supabase.rpc("lock_user_wallet", {
  user_id: userId,
});

// Vérifier après lock
if (user.balance - user.frozen_balance < price) {
  // ROLLBACK
  throw Error("Insufficient balance");
}

// UPDATE + INSERT atomique
// COMMIT ou ROLLBACK
```

---

### 2. ✅ COMMIT (SMS Reçu / Succès)

**Fichier:** `check-sms-activate-status/index.ts` (lignes 380-440)

#### Implémentation Actuelle

```typescript
// ✅ Vérification double-processing
if (transaction.status === "completed" || transaction.status === "refunded") {
  return alreadyProcessed;
}

// ✅ COMMIT: frozen -= prix, balance inchangé
const frozenAmountToUnfreeze = activation.frozen_amount || activation.price;
const priceToUnfreeze = Math.min(frozenAmountToUnfreeze, user.frozen_balance);
const newFrozenBalance = Math.max(0, user.frozen_balance - priceToUnfreeze);

await supabase.from("users").update({
  frozen_balance: newFrozenBalance, // ✅ Balance NOT touched
});

// ✅ Reset frozen_amount
await supabase.from("activations").update({ frozen_amount: 0 });

// ✅ Complete transaction
await supabase.from("transactions").update({ status: "completed" });
```

#### ✅ Points Positifs

- Ne touche PAS balance (déjà débité au freeze) ✅
- Utilise `activation.frozen_amount` (pas recalcul global) ✅
- Protection `Math.min` contre underflow ✅
- Vérification double-processing ✅
- Reset `frozen_amount` après commit ✅

#### ❌ Problèmes

1. **CRITIQUE:** Pas de `FOR UPDATE` → Race condition sur frozen_balance
2. **CRITIQUE:** Pas de transaction DB → Si users.update échoue, transaction reste 'pending'
3. **MAJEUR:** 3 UPDATE séparés (users, activations, transactions) sans atomicité

#### 🔧 Correction Nécessaire

```typescript
// BEGIN TRANSACTION
const { data: user } = await supabase.rpc("lock_user_wallet", { user_id });

// UPDATE users, activations, transactions dans MÊME transaction DB
// COMMIT atomique
```

---

### 3. ✅ REFUND (Annulation / Expiration)

**Fichier:** `cancel-sms-activate-order/index.ts` (lignes 180-250)

#### Implémentation Actuelle

```typescript
// ✅ Lock atomique sur activation
const { data: lockedActivation } = await supabase
  .from("activations")
  .update({ status: "cancelled", frozen_amount: 0 })
  .eq("id", activationId)
  .in("status", ["pending", "waiting"]) // ✅ ATOMIC
  .select()
  .single();

if (!lockedActivation) {
  return alreadyProcessed; // ✅ Idempotence
}

// ✅ Calcul sécurisé du refund
const actualUnfreezeAmount = Math.min(
  activation.frozen_amount,
  user.frozen_balance
);
const newFrozenBalance = Math.max(
  0,
  user.frozen_balance - actualUnfreezeAmount
);
const newBalance = user.balance + actualUnfreezeAmount; // ✅ Refund

// ✅ Update users
await supabase.from("users").update({
  balance: newBalance,
  frozen_balance: newFrozenBalance,
});

// ✅ Mark transaction as refunded
await supabase.from("transactions").update({ status: "refunded" });

// ✅ Log operation (si table existe)
try {
  await supabase.from("balance_operations").insert({
    operation_type: "refund",
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
  });
} catch (logError) {
  // Table n'existe pas - juste logger
}
```

#### ✅ Points Positifs

- **EXCELLENT:** Lock atomique sur activation via UPDATE + WHERE status IN ✅
- **EXCELLENT:** Idempotence garantie (si lock échoue = already processed) ✅
- Calcul sécurisé avec Math.min/max ✅
- Tentative de log dans balance_operations ✅
- Transaction marquée 'refunded' AVANT user update ✅

#### ❌ Problèmes

1. **CRITIQUE:** Pas de `FOR UPDATE` sur users → Race condition possible
2. **CRITIQUE:** Pas de transaction DB → Si users.update échoue, activation reste 'cancelled' mais pas refunded
3. **MAJEUR:** Table `balance_operations` n'existe pas (catch silencieux)

#### 🔧 Correction Nécessaire

```typescript
// BEGIN TRANSACTION
const locked_activation = LOCK activation
const locked_user = SELECT ... FOR UPDATE FROM users

// UPDATE users, activations, transactions atomique
// INSERT balance_operations
// COMMIT
```

---

### 4. ❌ SÉCURITÉ & CONTRÔLE

#### ✅ Ce qui fonctionne

- **Idempotence:** Vérifications `alreadyProcessed` partout ✅
- **Validation statuts:** Vérifications transaction.status et activation.status ✅
- **Logs détaillés:** Balance before/after, frozen before/after ✅
- **Rollback applicatif:** En cas d'erreur API, refund automatique ✅

#### ❌ Ce qui manque

##### 1. **FOR UPDATE (Verrouillage Pessimiste)**

```sql
-- ❌ ACTUEL: Pas de lock
SELECT balance, frozen_balance FROM users WHERE id = $1

-- ✅ REQUIS:
SELECT balance, frozen_balance FROM users WHERE id = $1 FOR UPDATE
```

**Scénario de race condition:**

```
T=0  User1: SELECT balance=36, frozen=0
T=0  User2: SELECT balance=36, frozen=0
T=1  User1: UPDATE balance=31, frozen=5  (achat 5Ⓐ)
T=2  User2: UPDATE balance=31, frozen=5  (achat 5Ⓐ)
→ RÉSULTAT: balance=31, frozen=5 (devrait être 26/10)
→ PERTE: 5Ⓐ
```

##### 2. **Transactions Database**

```typescript
// ❌ ACTUEL: 3 UPDATE séparés
await supabase.from('transactions').update(...)
await supabase.from('users').update(...)
await supabase.from('activations').update(...)

// ✅ REQUIS:
await supabase.rpc('atomic_commit', {
  transaction_id, user_id, amount
})
```

**Scénario d'incohérence:**

```
1. UPDATE transactions SET status='completed' ✅
2. UPDATE users SET frozen_balance=0 ❌ (échoue)
3. UPDATE activations (ne s'exécute pas)
→ RÉSULTAT: Transaction 'completed' mais frozen toujours gelé
→ BLOQUÉ: Crédits gelés à vie
```

##### 3. **Table balance_operations**

```sql
-- ❌ MANQUANT
CREATE TABLE balance_operations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activation_id UUID REFERENCES activations(id),
  operation_type TEXT, -- 'freeze', 'commit', 'refund'
  amount DECIMAL,
  balance_before DECIMAL,
  balance_after DECIMAL,
  frozen_before DECIMAL,
  frozen_after DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Impact:** Impossible de:

- Retracer historique des opérations
- Déboguer incohérences
- Auditer les fraudes
- Générer rapports comptables

##### 4. **CRON Anti-Fraude**

```typescript
// ❌ MANQUANT
// Tâche CRON toutes les heures
async function detectAnomalies() {
  // Détecter balance < 0
  const negativeBalances = await supabase
    .from("users")
    .select("*")
    .lt("balance", 0);

  // Détecter frozen > balance
  const inconsistent = await supabase
    .from("users")
    .select("*")
    .gt("frozen_balance", "balance");

  // Détecter activations avec frozen > 0 mais status final
  const orphanedFrozen = await supabase
    .from("activations")
    .select("*")
    .gt("frozen_amount", 0)
    .in("status", ["success", "cancelled", "timeout"]);

  // Alerter admin
}
```

---

## 🧪 SCÉNARIOS DE TEST

### ✅ Scenario 1: Usage Normal (FONCTIONNE)

```
1. balance=36, frozen=0
2. Achat 5Ⓐ → balance=31, frozen=5  ✅
3. SMS reçu → balance=31, frozen=0   ✅
→ RÉSULTAT ATTENDU: 31Ⓐ consommés ✅
```

### ✅ Scenario 2: Expiration (FONCTIONNE)

```
1. balance=36, frozen=0
2. Achat 5Ⓐ → balance=31, frozen=5  ✅
3. Timeout → balance=36, frozen=0   ✅
→ RÉSULTAT ATTENDU: Refund complet ✅
```

### ❌ Scenario 3: Double Clic (VULNÉRABLE)

```
Thread A:                    Thread B:
SELECT balance=36, frozen=0  SELECT balance=36, frozen=0
available=36 ✅              available=36 ✅
UPDATE balance=31, frozen=5  UPDATE balance=31, frozen=5
→ RÉSULTAT: balance=31, frozen=5 (devrait être 26/10)
→ PERTE: 5Ⓐ ❌
```

**Protection actuelle:** Idempotence sur transaction.id ✅  
**Problème:** Si 2 transactions différentes créées en parallèle ❌

### ❌ Scenario 4: Deux Achats Simultanés (VULNÉRABLE)

```
User a 10Ⓐ, achète 2x 6Ⓐ simultanément

Thread A (6Ⓐ):              Thread B (6Ⓐ):
SELECT balance=10, frozen=0  SELECT balance=10, frozen=0
available=10 ✅              available=10 ✅
UPDATE balance=4, frozen=6   UPDATE balance=4, frozen=6
→ RÉSULTAT: balance=4, frozen=6 (devrait refuser B)
→ DÉPASSEMENT: 2Ⓐ négatifs ❌
```

**Solution:** FOR UPDATE bloque Thread B jusqu'à fin de Thread A

### ❌ Scenario 5: Refund > Frozen (PARTIELLEMENT PROTÉGÉ)

```
1. balance=31, frozen=5
2. Bug: frozen_amount=10 (erreur)
3. Refund: actualUnfreeze = Math.min(10, 5) = 5 ✅
→ RÉSULTAT: balance=36, frozen=0 ✅
```

**Protection:** `Math.min(frozenAmount, frozen_balance)` ✅  
**Problème:** Ne corrige pas l'incohérence frozen_amount

---

## 🛠️ PLAN DE CORRECTION

### 🔴 PRIORITÉ 1: FOR UPDATE + Transactions DB

#### A. Créer fonction RPC pour Lock Wallet

```sql
-- supabase/migrations/999_wallet_lock_functions.sql
CREATE OR REPLACE FUNCTION lock_user_wallet(user_id UUID)
RETURNS TABLE(
  balance DECIMAL,
  frozen_balance DECIMAL,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.balance, u.frozen_balance, u.version
  FROM users u
  WHERE u.id = user_id
  FOR UPDATE;
END;
$$ LANGUAGE plpgsql;
```

#### B. Créer fonctions atomiques

```sql
-- Fonction freeze atomique
CREATE OR REPLACE FUNCTION atomic_freeze(
  p_user_id UUID,
  p_amount DECIMAL,
  p_transaction_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_available DECIMAL;
BEGIN
  -- Lock user
  SELECT balance, frozen_balance, version INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check available
  v_available := v_user.balance - v_user.frozen_balance;
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % available, % required', v_available, p_amount;
  END IF;

  -- Update user
  UPDATE users
  SET
    balance = balance - p_amount,
    frozen_balance = frozen_balance + p_amount,
    version = version + 1
  WHERE id = p_user_id;

  -- Insert operation log
  INSERT INTO balance_operations (
    user_id, operation_type, amount,
    balance_before, balance_after,
    frozen_before, frozen_after,
    transaction_id
  ) VALUES (
    p_user_id, 'freeze', p_amount,
    v_user.balance, v_user.balance - p_amount,
    v_user.frozen_balance, v_user.frozen_balance + p_amount,
    p_transaction_id
  );

  RETURN json_build_object(
    'success', true,
    'new_balance', v_user.balance - p_amount,
    'new_frozen', v_user.frozen_balance + p_amount
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction commit atomique
CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID,
  p_transaction_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_activation RECORD;
  v_unfreeze DECIMAL;
BEGIN
  -- Lock user
  SELECT balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- Lock activation
  SELECT frozen_amount INTO v_activation
  FROM activations WHERE id = p_activation_id FOR UPDATE;

  -- Calculate unfreeze
  v_unfreeze := LEAST(v_activation.frozen_amount, v_user.frozen_balance);

  -- Update user (only unfreeze, don't touch balance)
  UPDATE users
  SET frozen_balance = frozen_balance - v_unfreeze
  WHERE id = p_user_id;

  -- Update activation
  UPDATE activations
  SET frozen_amount = 0, status = 'success'
  WHERE id = p_activation_id;

  -- Update transaction
  UPDATE transactions
  SET status = 'completed'
  WHERE id = p_transaction_id;

  -- Log operation
  INSERT INTO balance_operations (
    user_id, activation_id, operation_type, amount,
    balance_before, balance_after,
    frozen_before, frozen_after,
    transaction_id
  ) VALUES (
    p_user_id, p_activation_id, 'commit', v_unfreeze,
    v_user.balance, v_user.balance,
    v_user.frozen_balance, v_user.frozen_balance - v_unfreeze,
    p_transaction_id
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Fonction refund atomique
CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID,
  p_transaction_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_activation RECORD;
  v_refund DECIMAL;
BEGIN
  -- Lock user
  SELECT balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  -- Lock activation
  SELECT frozen_amount INTO v_activation
  FROM activations WHERE id = p_activation_id FOR UPDATE;

  -- Calculate refund
  v_refund := LEAST(v_activation.frozen_amount, v_user.frozen_balance);

  -- Update user (unfreeze + refund)
  UPDATE users
  SET
    balance = balance + v_refund,
    frozen_balance = frozen_balance - v_refund
  WHERE id = p_user_id;

  -- Update activation
  UPDATE activations
  SET frozen_amount = 0, status = 'cancelled'
  WHERE id = p_activation_id;

  -- Update transaction
  UPDATE transactions
  SET status = 'refunded'
  WHERE id = p_transaction_id;

  -- Log operation
  INSERT INTO balance_operations (
    user_id, activation_id, operation_type, amount,
    balance_before, balance_after,
    frozen_before, frozen_after,
    transaction_id
  ) VALUES (
    p_user_id, p_activation_id, 'refund', v_refund,
    v_user.balance, v_user.balance + v_refund,
    v_user.frozen_balance, v_user.frozen_balance - v_refund,
    p_transaction_id
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

#### C. Mettre à jour Edge Functions

```typescript
// buy-sms-activate-number/index.ts

// ❌ AVANT
const availableBalance = userProfile.balance - frozenBalance;
if (availableBalance < price) throw Error;

const newBalance = currentBalance - price;
const newFrozenBalance = frozenBalance + price;
await supabase.from("users").update({
  balance: newBalance,
  frozen_balance: newFrozenBalance,
});

// ✅ APRÈS
const { data, error } = await supabase.rpc("atomic_freeze", {
  p_user_id: userId,
  p_amount: price,
  p_transaction_id: transactionId,
});

if (error) {
  if (error.message.includes("Insufficient balance")) {
    throw new Error(`Solde insuffisant`);
  }
  throw error;
}
```

### 🟠 PRIORITÉ 2: Créer Table balance_operations

```sql
-- supabase/migrations/998_balance_operations.sql
CREATE TABLE IF NOT EXISTS balance_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activation_id UUID REFERENCES activations(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  operation_type TEXT NOT NULL CHECK (operation_type IN ('freeze', 'commit', 'refund')),
  amount DECIMAL NOT NULL,

  balance_before DECIMAL NOT NULL,
  balance_after DECIMAL NOT NULL,
  frozen_before DECIMAL NOT NULL,
  frozen_after DECIMAL NOT NULL,

  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_operation CHECK (
    -- Freeze: balance diminue, frozen augmente
    (operation_type = 'freeze' AND balance_after = balance_before - amount AND frozen_after = frozen_before + amount)
    OR
    -- Commit: balance inchangé, frozen diminue
    (operation_type = 'commit' AND balance_after = balance_before AND frozen_after = frozen_before - amount)
    OR
    -- Refund: balance augmente, frozen diminue
    (operation_type = 'refund' AND balance_after = balance_before + amount AND frozen_after = frozen_before - amount)
  )
);

CREATE INDEX idx_balance_ops_user ON balance_operations(user_id, created_at DESC);
CREATE INDEX idx_balance_ops_activation ON balance_operations(activation_id);
CREATE INDEX idx_balance_ops_transaction ON balance_operations(transaction_id);

-- Vue santé wallet
CREATE OR REPLACE VIEW v_frozen_balance_health AS
SELECT
  u.id AS user_id,
  u.email,
  u.balance,
  u.frozen_balance,
  COALESCE(SUM(a.frozen_amount), 0) AS total_frozen_in_activations,
  COALESCE(SUM(r.frozen_amount), 0) AS total_frozen_in_rentals,
  (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) AS expected_frozen,
  u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) AS frozen_diff,
  CASE
    WHEN u.balance < 0 THEN 'CRITICAL: Negative balance'
    WHEN u.frozen_balance > u.balance THEN 'CRITICAL: Frozen > Balance'
    WHEN ABS(u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0))) > 0.01
      THEN 'WARNING: Frozen mismatch'
    ELSE 'OK'
  END AS health_status
FROM users u
LEFT JOIN activations a ON a.user_id = u.id AND a.status IN ('pending', 'waiting') AND a.frozen_amount > 0
LEFT JOIN rentals r ON r.user_id = u.id AND r.status = 'active' AND r.frozen_amount > 0
GROUP BY u.id, u.email, u.balance, u.frozen_balance
HAVING
  u.balance < 0
  OR u.frozen_balance > u.balance
  OR ABS(u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0))) > 0.01;
```

### 🟡 PRIORITÉ 3: CRON Anti-Fraude

```typescript
// supabase/functions/cron-wallet-health/index.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  console.log("🔍 [CRON-WALLET-HEALTH] Starting wallet health check...");

  // 1. Détecter incohérences
  const { data: issues } = await supabase
    .from("v_frozen_balance_health")
    .select("*");

  if (issues && issues.length > 0) {
    console.error("🚨 [CRON-WALLET-HEALTH] Issues detected:", issues.length);

    // 2. Corriger automatiquement si possible
    for (const issue of issues) {
      if (issue.health_status.includes("Frozen mismatch")) {
        console.log(
          `🔧 [CRON-WALLET-HEALTH] Auto-correcting user ${issue.user_id}`
        );

        // Recalculer frozen correct
        const { data: activations } = await supabase
          .from("activations")
          .select("frozen_amount")
          .eq("user_id", issue.user_id)
          .in("status", ["pending", "waiting"]);

        const { data: rentals } = await supabase
          .from("rentals")
          .select("frozen_amount")
          .eq("user_id", issue.user_id)
          .eq("status", "active");

        const correctFrozen =
          (activations?.reduce((sum, a) => sum + (a.frozen_amount || 0), 0) ||
            0) +
          (rentals?.reduce((sum, r) => sum + (r.frozen_amount || 0), 0) || 0);

        // Corriger
        await supabase
          .from("users")
          .update({ frozen_balance: correctFrozen })
          .eq("id", issue.user_id);

        console.log(
          `✅ [CRON-WALLET-HEALTH] Corrected: frozen ${issue.frozen_balance} → ${correctFrozen}`
        );
      }
    }

    // 3. Alerter admin pour CRITICAL
    const critical = issues.filter((i) => i.health_status.includes("CRITICAL"));
    if (critical.length > 0) {
      // TODO: Envoyer email/notification admin
      console.error("🚨 [CRON-WALLET-HEALTH] CRITICAL issues:", critical);
    }
  } else {
    console.log("✅ [CRON-WALLET-HEALTH] All wallets healthy");
  }

  return new Response(
    JSON.stringify({ success: true, issues: issues?.length || 0 })
  );
});
```

```yaml
# supabase/functions/cron-wallet-health/cron.yaml
- name: "Wallet Health Check"
  schedule: "0 * * * *" # Toutes les heures
  function: cron-wallet-health
```

---

## 📋 CHECKLIST MISE EN CONFORMITÉ

### Phase 1: Sécurité Critique (1 semaine)

- [ ] Créer `balance_operations` table
- [ ] Créer fonctions RPC atomiques (atomic_freeze, atomic_commit, atomic_refund)
- [ ] Mettre à jour `buy-sms-activate-number` pour utiliser atomic_freeze
- [ ] Mettre à jour `check-sms-activate-status` pour utiliser atomic_commit
- [ ] Mettre à jour `cancel-sms-activate-order` pour utiliser atomic_refund
- [ ] Tester scénarios 3 et 4 (double clic, achats simultanés)

### Phase 2: Monitoring (3 jours)

- [ ] Créer vue `v_frozen_balance_health`
- [ ] Créer CRON `cron-wallet-health`
- [ ] Configurer alertes admin (email/SMS)
- [ ] Dashboard admin pour visualiser issues

### Phase 3: Auditing (2 jours)

- [ ] Vérifier tous les logs `balance_operations`
- [ ] Créer rapports comptables
- [ ] Tester retraçage historique
- [ ] Documentation procédure résolution incohérences

### Phase 4: Tests (1 semaine)

- [ ] Tests unitaires fonctions RPC
- [ ] Tests intégration Edge Functions
- [ ] Tests charge (100 achats simultanés)
- [ ] Tests chaos (pannes réseau, timeouts)

---

## 🎯 CONCLUSION

### Statut Actuel: ⚠️ SÉCURISÉ MAIS INCOMPLET

**Ce qui fonctionne bien:**

- ✅ Logique freeze-commit-refund correcte
- ✅ Protection double-processing
- ✅ Calculs sécurisés (Math.min/max)
- ✅ Rollback automatique

**Ce qui manque (CRITIQUE):**

- ❌ FOR UPDATE (race conditions possibles)
- ❌ Transactions DB (incohérences possibles)
- ❌ Table balance_operations (pas d'audit)
- ❌ CRON anti-fraude (pas de détection auto)

### Recommandation: 🔴 IMPLÉMENTER PRIORITÉ 1 IMMÉDIATEMENT

**Risque actuel:**

- Probabilité: MOYENNE (besoin de timing précis)
- Impact: CRITIQUE (perte argent, balance négatif)
- Urgence: ÉLEVÉE

**Effort correction:**

- Priorité 1: 1 semaine (CRITIQUE)
- Priorité 2: 3 jours (MAJEUR)
- Priorité 3: 2 jours (IMPORTANT)

**Total: 2 semaines pour sécurisation complète**

---

**Audité par:** GitHub Copilot  
**Date:** 30 novembre 2025  
**Version:** 1.0
