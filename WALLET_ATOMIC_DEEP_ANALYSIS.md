# 🏦 ANALYSE PROFONDE : SYSTÈME WALLET ATOMIQUE

## 📊 État Actuel de l'Architecture

### Tables Existantes

**users**

```sql
id UUID PRIMARY KEY
email TEXT
balance DECIMAL(10,2) DEFAULT 0
frozen_balance DECIMAL(10,2) DEFAULT 0  -- Ajouté récemment
created_at TIMESTAMP
updated_at TIMESTAMP
```

**activations**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
order_id TEXT  -- SMS-Activate ID
phone TEXT
service_code TEXT
price DECIMAL(10,2)
frozen_amount DECIMAL(10,2) DEFAULT 0  -- Ajouté récemment
status TEXT  -- pending, waiting, completed, cancelled, timeout
created_at TIMESTAMP
expires_at TIMESTAMP
```

**transactions**

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
type TEXT  -- purchase, refund, etc.
amount DECIMAL(10,2)
status TEXT  -- pending, completed, failed
related_activation_id UUID
description TEXT
created_at TIMESTAMP
```

---

## ⚠️ PROBLÈMES IDENTIFIÉS

### 1. **Pas de Verrouillage Atomique (Race Conditions)**

**Problème** : Plusieurs requêtes simultanées peuvent modifier `balance` et `frozen_balance` sans coordination.

**Scénario Critique** :

```
Thread A: Lit balance=100, freeze 50 → UPDATE balance=50, frozen=50
Thread B: Lit balance=100, freeze 50 → UPDATE balance=50, frozen=50
Résultat: balance=50, frozen=50 (devrait être 0, 100) ❌
```

**Code Actuel (buy-sms-activate-number)** :

```typescript
const { data: userProfile } = await supabase
  .from("users")
  .select("balance, frozen_balance")
  .eq("id", userId)
  .single();

// ❌ PAS DE LOCK ICI - Race condition possible !

const newBalance = userProfile.balance - price;
const newFrozen = userProfile.frozen_balance + price;

await supabase
  .from("users")
  .update({ balance: newBalance, frozen_balance: newFrozen })
  .eq("id", userId);
```

### 2. **Pas de Traçabilité des Opérations Wallet**

La table `transactions` stocke les achats/remboursements, mais **PAS les mouvements internes** :

- ❌ Pas de trace du freeze (balance → frozen)
- ❌ Pas de trace du commit (frozen → 0 quand SMS reçu)
- ❌ Pas de trace du refund (frozen → balance)

**Conséquence** : Impossible de reconstruire l'historique exact en cas de bug.

### 3. **Pas d'Idempotence**

Si un webhook SMS-Activate est appelé 2 fois, le système peut :

- Dégeler 2 fois le même montant ❌
- Débiter 2 fois la balance ❌

**Exemple** :

```
Webhook arrive 2x pour order_id=12345
1ère fois: frozen -= 5, balance -= 5 ✅
2ème fois: frozen -= 5, balance -= 5 ❌ (double débit!)
```

### 4. **Cleanup Manquant pour Rentals**

Les rentals expirés ne sont pas nettoyés automatiquement :

- 4 rentals expirés détectés avec 25.65 Ⓐ frozen
- Pas de fonction `cleanup-expired-rentals` (équivalent de `cleanup-expired-activations`)

### 5. **Pas de Versioning**

Impossible de détecter des modifications concurrentes :

- Thread A lit version=1, met à jour
- Thread B lit version=1, met à jour
- Thread A commit → version=2
- Thread B commit → version=2 (écrase A silencieusement) ❌

---

## ✅ SOLUTION PROPOSÉE : WALLET ATOMIQUE

### Architecture Cible

#### 1. **Table `wallets` (Nouvelle)**

```sql
CREATE TABLE wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  balance BIGINT NOT NULL DEFAULT 0,      -- En centimes (éviter float)
  frozen BIGINT NOT NULL DEFAULT 0,       -- En centimes
  version BIGINT NOT NULL DEFAULT 0,      -- Optimistic locking
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_frozen ON wallets(frozen) WHERE frozen > 0;

-- Constraints
ALTER TABLE wallets ADD CONSTRAINT chk_balance_positive CHECK (balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT chk_frozen_positive CHECK (frozen >= 0);
ALTER TABLE wallets ADD CONSTRAINT chk_frozen_lte_balance CHECK (frozen <= balance + frozen);
```

**Pourquoi BIGINT ?**

- Évite les erreurs d'arrondi DECIMAL (0.1 + 0.2 ≠ 0.3)
- Stockage : 1 Ⓐ = 100 centimes
- Calculs : 5.50 Ⓐ = 550 centimes

#### 2. **Table `wallet_transactions` (Nouvelle)**

```sql
CREATE TABLE wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT REFERENCES wallets(id),

  -- Type d'opération
  kind TEXT NOT NULL CHECK (kind IN ('freeze', 'commit', 'refund', 'topup')),

  -- Montant (toujours positif, le kind indique la direction)
  amount BIGINT NOT NULL CHECK (amount > 0),

  -- État avant/après (snapshot pour audit)
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  frozen_before BIGINT NOT NULL,
  frozen_after BIGINT NOT NULL,

  -- Lien avec l'activation/rental
  order_id UUID NULL,  -- SMS-Activate order_id ou activation.id
  order_type TEXT NULL CHECK (order_type IN ('activation', 'rental')),

  -- Métadonnées
  meta JSONB NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Index pour idempotence
  UNIQUE(order_id, kind) WHERE order_id IS NOT NULL
);

CREATE INDEX idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_order_id ON wallet_transactions(order_id);
CREATE INDEX idx_wallet_tx_created_at ON wallet_transactions(created_at DESC);
```

**Unique constraint** : Empêche 2 `freeze` pour le même `order_id` (idempotence).

---

## 🔧 IMPLÉMENTATION : 3 FONCTIONS ATOMIQUES

### 1. **`freeze(walletId, amount, orderId)`**

**Objectif** : Réserver des fonds (balance → frozen)

**Comportement** :

- **Avant** : balance = 36, frozen = 0
- **Après** : balance = 31, frozen = 5

**Code SQL** :

```sql
-- Avec transaction + lock
BEGIN;

-- 1. Verrouiller la ligne (pas d'autres UPDATE possibles)
SELECT id, user_id, balance, frozen, version
FROM wallets
WHERE id = $1
FOR UPDATE;

-- 2. Vérifier idempotence
SELECT id FROM wallet_transactions
WHERE order_id = $2 AND kind = 'freeze';
-- Si existe → ROLLBACK et retourner success (déjà fait)

-- 3. Vérifier solde suffisant
IF balance < amount THEN
  RAISE EXCEPTION 'insufficient_balance';
END IF;

-- 4. Calculer nouveaux montants
new_balance := balance - amount;
new_frozen := frozen + amount;

-- 5. Mettre à jour wallet (version++)
UPDATE wallets
SET
  balance = new_balance,
  frozen = new_frozen,
  version = version + 1,
  updated_at = now()
WHERE id = $1;

-- 6. Logger l'opération
INSERT INTO wallet_transactions (
  wallet_id, kind, amount,
  balance_before, balance_after,
  frozen_before, frozen_after,
  order_id, meta
) VALUES (
  $1, 'freeze', amount,
  balance, new_balance,
  frozen, new_frozen,
  $2, $3
);

COMMIT;
```

### 2. **`commit(walletId, amount, orderId)`**

**Objectif** : Confirmer la consommation (frozen → 0, balance inchangée)

**Comportement** :

- **Avant** : balance = 31, frozen = 5
- **Après** : balance = 31, frozen = 0

**Code SQL** :

```sql
BEGIN;

-- 1. Lock
SELECT * FROM wallets WHERE id = $1 FOR UPDATE;

-- 2. Idempotence
SELECT id FROM wallet_transactions
WHERE order_id = $2 AND kind = 'commit';
-- Si existe → retourner success

-- 3. Vérifier frozen suffisant
IF frozen < amount THEN
  RAISE EXCEPTION 'not_enough_frozen_to_commit';
END IF;

-- 4. Calculer
new_frozen := frozen - amount;
-- balance RESTE IDENTIQUE

-- 5. Update
UPDATE wallets
SET frozen = new_frozen, version = version + 1
WHERE id = $1;

-- 6. Log
INSERT INTO wallet_transactions (...)
VALUES (..., 'commit', ...);

COMMIT;
```

### 3. **`refund(walletId, amount, orderId)`**

**Objectif** : Annulation/expiration (frozen → balance)

**Comportement** :

- **Avant** : balance = 31, frozen = 5
- **Après** : balance = 36, frozen = 0

**Code SQL** :

```sql
BEGIN;

-- 1. Lock
SELECT * FROM wallets WHERE id = $1 FOR UPDATE;

-- 2. Idempotence
SELECT id FROM wallet_transactions
WHERE order_id = $2 AND kind = 'refund';

-- 3. Calculer refund réel (min(amount, frozen))
actual_refund := LEAST(amount, frozen);
IF actual_refund <= 0 THEN
  RAISE EXCEPTION 'nothing_to_refund';
END IF;

-- 4. Calculer
new_frozen := frozen - actual_refund;
new_balance := balance + actual_refund;

-- 5. Update
UPDATE wallets
SET balance = new_balance, frozen = new_frozen, version = version + 1
WHERE id = $1;

-- 6. Log
INSERT INTO wallet_transactions (...)
VALUES (..., 'refund', ...);

COMMIT;
```

---

## 🔄 INTÉGRATION DANS L'EXISTANT

### Étape 1 : Migration

```sql
-- 1. Créer tables wallets et wallet_transactions
-- (voir schéma ci-dessus)

-- 2. Migrer données users → wallets
INSERT INTO wallets (user_id, balance, frozen)
SELECT
  id,
  FLOOR(balance * 100)::BIGINT,  -- Convertir en centimes
  FLOOR(COALESCE(frozen_balance, 0) * 100)::BIGINT
FROM users;

-- 3. Créer fonction trigger pour synchro
CREATE OR REPLACE FUNCTION sync_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    balance = NEW.balance::DECIMAL / 100,
    frozen_balance = NEW.frozen::DECIMAL / 100
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_wallet_update
AFTER UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION sync_user_wallet();
```

### Étape 2 : Wrapper TypeScript

```typescript
// lib/wallet.ts
import { supabase } from './supabase'

export async function freeze(
  userId: string,
  amountInCoins: number,  // En centimes : 550 = 5.50 Ⓐ
  orderId: string,
  meta: Record<string, any> = {}
) {
  const { data, error } = await supabase.rpc('wallet_freeze', {
    p_user_id: userId,
    p_amount: amountInCoins,
    p_order_id: orderId,
    p_meta: meta
  })

  if (error) throw error
  return data
}

export async function commit(
  userId: string,
  amountInCoins: number,
  orderId: string,
  meta: Record<string, any> = {}
) {
  const { data, error } = await supabase.rpc('wallet_commit', {
    p_user_id: userId,
    p_amount: amountInCoins,
    p_order_id: orderId,
    p_meta: meta
  })

  if (error) throw error
  return data
}

export async function refund(
  userId: string,
  amountInCoins: number,
  orderId: string,
  meta: Record<string, any> = {}
) {
  const { data, error } = await supabase.rpc('wallet_refund', {
    p_user_id: userId,
    p_amount: amountInCoins,
    p_order_id: orderId,
    p_meta: meta
  })

  if (error} throw error
  return data
}
```

### Étape 3 : Migration des Edge Functions

**buy-sms-activate-number** :

```typescript
// AVANT
const newBalance = currentBalance - price;
const newFrozen = frozenBalance + price;
await supabase
  .from("users")
  .update({ balance: newBalance, frozen_balance: newFrozen });

// APRÈS
await freeze(userId, price * 100, activationId, {
  service: product,
  country: country,
  provider: "sms-activate",
});
```

**check-sms-activate-status** (SMS reçu) :

```typescript
// AVANT
await supabase.from("users").update({ frozen_balance: newFrozen });

// APRÈS
await commit(userId, price * 100, activationId, {
  sms_code: code,
  received_at: new Date().toISOString(),
});
```

**cancel-sms-activate-order** :

```typescript
// AVANT
const newBalance = user.balance + amount;
const newFrozen = user.frozen_balance - amount;
await supabase
  .from("users")
  .update({ balance: newBalance, frozen_balance: newFrozen });

// APRÈS
await refund(userId, amount * 100, activationId, {
  reason: "user_cancelled",
  cancelled_at: new Date().toISOString(),
});
```

---

## 🎯 AVANTAGES DE LA SOLUTION

### 1. **Atomicité Garantie**

- `SELECT ... FOR UPDATE` verrouille la ligne
- Aucune race condition possible
- Transactions ACID complètes

### 2. **Idempotence Native**

- Contrainte `UNIQUE(order_id, kind)`
- Appels multiples = safe
- Webhooks répétés = no problem

### 3. **Audit Trail Complet**

- Chaque mouvement tracé dans `wallet_transactions`
- balance_before/after pour vérification
- Métadonnées JSON pour contexte

### 4. **Versioning (Optimistic Locking)**

- Détecte les modifications concurrentes
- `version++` à chaque UPDATE
- Retry automatique si conflict

### 5. **Performance**

- Index optimisés (user_id, order_id, created_at)
- Pas de scan complet de table
- BIGINT = rapide (vs DECIMAL)

### 6. **Debugging Facilité**

```sql
-- Voir l'historique complet d'un wallet
SELECT * FROM wallet_transactions WHERE wallet_id = 123 ORDER BY created_at DESC;

-- Vérifier cohérence
SELECT
  user_id,
  balance,
  frozen,
  (SELECT SUM(CASE WHEN kind='topup' THEN amount WHEN kind='freeze' THEN -amount WHEN kind='refund' THEN amount END)
   FROM wallet_transactions WHERE wallet_id = w.id) as calculated_balance
FROM wallets w;
```

---

## 📋 PLAN D'IMPLÉMENTATION

### Phase 1 : Préparation (1-2h)

- [x] Créer migration SQL (wallets + wallet_transactions)
- [ ] Créer fonctions RPC (wallet_freeze, wallet_commit, wallet_refund)
- [ ] Créer wrapper TypeScript (lib/wallet.ts)
- [ ] Tests unitaires des fonctions

### Phase 2 : Migration Données (30min)

- [ ] Backup base de données
- [ ] Exécuter migration (users → wallets)
- [ ] Vérifier cohérence
- [ ] Créer trigger de synchronisation

### Phase 3 : Refactoring Code (2-3h)

- [ ] buy-sms-activate-number → freeze()
- [ ] check-sms-activate-status → commit()
- [ ] cancel-sms-activate-order → refund()
- [ ] cleanup-expired-activations → refund()
- [ ] buy-sms-activate-rent → freeze()

### Phase 4 : Tests (1-2h)

- [ ] Tests unitaires des 3 opérations
- [ ] Tests de concurrence (10 freeze simultanés)
- [ ] Tests d'idempotence (2x même order_id)
- [ ] Tests de rollback (erreur API)

### Phase 5 : Monitoring (1h)

- [ ] Dashboard wallet_transactions
- [ ] Alertes sur frozen > 1h
- [ ] Job cleanup automatique (expirés > 20min)
- [ ] Métriques performance

### Phase 6 : Déploiement (1h)

- [ ] Déployer en staging
- [ ] Tests smoke
- [ ] Déployer en production
- [ ] Monitoring 24h

---

## 🚨 RISQUES & MITIGATION

### Risque 1 : Migration Données Incorrecte

**Mitigation** :

- Backup complet avant migration
- Script de vérification (balance users = balance wallets)
- Rollback plan documenté

### Risque 2 : Deadlocks

**Mitigation** :

- Toujours verrouiller dans le même ordre (par user_id)
- Timeout transaction (5s max)
- Retry avec backoff exponentiel

### Risque 3 : Performance

**Mitigation** :

- Index sur tous les JOINs
- Partitionnement wallet_transactions (par mois)
- Archivage vieux logs (> 6 mois)

### Risque 4 : Complexité

**Mitigation** :

- Documentation complète
- Exemples de code
- Tests exhaustifs

---

## 📊 ESTIMATION

**Temps total** : ~8-10h
**Complexité** : Moyenne-Élevée
**ROI** : 🔥 TRÈS ÉLEVÉ (élimine bugs critiques + race conditions)

**Priorité** : ⚠️ **CRITIQUE**

- Bugs actuels causent perte d'argent
- Race conditions = risque sécurité
- Pas d'audit trail = compliance ❌

---

## 🎓 RÉFÉRENCES

- [PostgreSQL Row Locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
- [Optimistic Locking Pattern](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)
- [Idempotency in Distributed Systems](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [Wallet System Best Practices](https://stripe.com/docs/connect/account-balances)

---

**Auteur** : GitHub Copilot  
**Date** : 30 novembre 2025  
**Status** : 📋 Analyse complète - Prêt pour implémentation
