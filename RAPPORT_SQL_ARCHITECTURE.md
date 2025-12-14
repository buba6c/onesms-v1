# 🔬 RAPPORT COMPLET - ARCHITECTURE SQL SUPABASE

**Date**: 5 décembre 2025
**Base**: PostgreSQL 17.6 (55 MB)
**Tables**: 22 actives

---

## 📊 1. STRUCTURE DES TABLES

### Tables Principales

#### **users** (45 enregistrements)

```sql
- id: UUID (PK)
- email: TEXT NOT NULL UNIQUE
- name: TEXT
- balance: NUMERIC DEFAULT 0.00
- frozen_balance: NUMERIC DEFAULT 0.00  ⚠️ CRITIQUE
- role: TEXT DEFAULT 'user'
- created_at, updated_at: TIMESTAMPTZ
```

#### **activations** (235 enregistrements)

```sql
- id: UUID (PK)
- user_id: UUID (FK → users.id)
- order_id: TEXT NOT NULL UNIQUE
- phone: TEXT NOT NULL
- service_code, country_code, operator: TEXT
- price: NUMERIC
- status: TEXT (pending/received/completed/cancelled/expired/timeout/refunded)
- frozen_amount: NUMERIC DEFAULT 0  ⚠️ CRITIQUE
- charged: BOOLEAN DEFAULT false
- sms_code, sms_text: TEXT
- expires_at: TIMESTAMPTZ NOT NULL
```

#### **rentals** (31 enregistrements)

```sql
- id: UUID (PK)
- user_id: UUID (FK → users.id)
- rent_id: TEXT NOT NULL UNIQUE
- phone: TEXT NOT NULL
- service_code, country_code: TEXT
- rent_hours: INTEGER NOT NULL
- total_cost: NUMERIC
- frozen_amount: NUMERIC DEFAULT 0  ⚠️ CRITIQUE
- status: TEXT (active/completed/cancelled)
- expires_at: TIMESTAMPTZ
- sms_messages: JSONB DEFAULT '[]'
```

#### **balance_operations** (208 enregistrements)

```sql
- id: UUID (PK)
- user_id: UUID (FK → users.id)
- operation_type: TEXT (freeze/unfreeze/refund/charge/deposit/credit)
- amount: NUMERIC NOT NULL
- balance_before: NUMERIC NOT NULL
- balance_after: NUMERIC NOT NULL
- frozen_before: NUMERIC
- frozen_after: NUMERIC
- activation_id: UUID (FK → activations.id)
- rental_id: UUID (FK → rentals.id)
- related_transaction_id: UUID
- reason: TEXT
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

#### **transactions** (385 enregistrements)

```sql
- id: UUID (PK)
- user_id: UUID (FK → users.id)
- type: TEXT (deposit/credit/purchase/rental/number_purchase/refund)
- status: TEXT (pending/completed/failed/cancelled)
- amount: NUMERIC NOT NULL
- payment_method: TEXT
- reference: TEXT UNIQUE
- metadata: JSONB
```

---

## 🔗 2. RELATIONS CLÉS (FOREIGN KEYS)

```
users (1) ──< (N) activations
          ──< (N) rentals
          ──< (N) balance_operations
          ──< (N) transactions

activations (1) ──< (N) balance_operations
rentals (1) ──< (N) balance_operations
transactions (1) ──< (N) balance_operations
```

**Règles de suppression**:

- `ON DELETE CASCADE` pour toutes les relations depuis users
- Garantit l'intégrité référentielle

---

## ⚙️ 3. TRIGGERS CRITIQUES

### 3.1 Protection Frozen Amount

#### `prevent_direct_frozen_amount_update` (users)

```sql
-- Empêche la modification directe de frozen_balance
-- Seules les fonctions SECURITY DEFINER peuvent modifier
-- Force l'utilisation de: atomic_freeze, atomic_commit, atomic_refund
```

#### `protect_frozen_amount_activations` (activations)

```sql
-- Empêche la modification directe de frozen_amount
-- Protection contre les race conditions
```

#### `protect_frozen_amount_rentals` (rentals)

```sql
-- Empêche la modification directe de frozen_amount
-- Protection contre les race conditions
```

### 3.2 Auto-Update Timestamps

```sql
-- Triggers sur toutes les tables principales:
- update_users_updated_at
- update_activations_updated_at
- update_rentals_updated_at
- update_transactions_updated_at
etc.
```

---

## 🔧 4. FONCTIONS CRITIQUES (49 au total)

### 4.1 SYSTÈME ATOMIC (Protection Wallet)

#### **atomic_freeze** ⭐⭐⭐

```sql
CREATE FUNCTION atomic_freeze(
  p_user_id UUID,
  p_amount NUMERIC,
  p_transaction_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON
SECURITY DEFINER;
```

**Logique**:

1. `SELECT ... FOR UPDATE` sur users (LOCK)
2. Vérifie `balance - frozen_balance >= p_amount`
3. Si OK:
   - `frozen_balance += p_amount`
   - `frozen_amount += p_amount` sur activation/rental
   - Enregistre dans `balance_operations`
4. Si KO: Retourne `{success: false, error: 'Insufficient balance'}`

**Protection**:

- Transaction atomique
- FOR UPDATE évite race conditions
- SECURITY DEFINER bypass RLS

---

#### **atomic_commit** ⭐⭐⭐

```sql
CREATE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Service completed'
) RETURNS JSON
SECURITY DEFINER;
```

**Logique**:

1. `SELECT ... FOR UPDATE` sur users
2. Récupère `frozen_amount` de l'activation/rental
3. **Débit définitif**:
   - `balance -= frozen_amount`
   - `frozen_balance -= frozen_amount`
   - `frozen_amount = 0` sur activation/rental
   - `charged = true` sur activation
4. Enregistre dans `balance_operations` (type: 'charge')

**Quand appelé**:

- Activation completed (SMS reçu)
- Rental completed (fin du contrat)

---

#### **atomic_refund** ⭐⭐⭐

```sql
CREATE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON
SECURITY DEFINER;
```

**Logique**:

1. `SELECT ... FOR UPDATE` sur users
2. Récupère `frozen_amount`
3. **Remboursement**:
   - `balance += frozen_amount` (recrédite)
   - `frozen_balance -= frozen_amount`
   - `frozen_amount = 0` sur activation/rental
4. Enregistre dans `balance_operations` (type: 'refund')

**Quand appelé**:

- Activation timeout/cancelled/expired
- Rental cancelled/expired
- Erreur provider

---

### 4.2 RÉCONCILIATION

#### **reconcile_frozen_balance**

```sql
-- Vérifie la cohérence entre:
-- users.frozen_balance
-- SUM(activations.frozen_amount WHERE status IN ('pending','waiting'))
-- SUM(rentals.frozen_amount WHERE status = 'active')
```

#### **reconcile_orphan_freezes**

```sql
-- Détecte et libère les frozen orphelins:
-- Activations timeout/failed/cancelled avec frozen_amount > 0
-- Appelle atomic_refund automatiquement
```

#### **reconcile_rentals_orphan_freezes**

```sql
-- Idem pour les rentals
```

---

### 4.3 PROCESSUS AUTOMATIQUES

#### **process_expired_activations**

```sql
-- Appelé par CRON
-- Pour chaque activation pending/waiting expirée:
-- 1. Change status → 'expired'
-- 2. Appelle atomic_refund si frozen_amount > 0
-- 3. Log l'opération
```

#### **lock_user_wallet**

```sql
-- Utilitaire pour obtenir un lock exclusif
SELECT balance, frozen_balance, (balance - frozen_balance) AS available
FROM users
WHERE id = p_user_id
FOR UPDATE;
```

---

### 4.4 SÉCURITÉ

#### **secure_freeze_balance** / **secure_unfreeze_balance**

```sql
-- Versions "safe" des fonctions atomic
-- Vérifications supplémentaires
-- Logs détaillés
```

---

## 🔐 5. POLITIQUES RLS (69 policies)

### 5.1 Users

```sql
✅ Users can view own data (SELECT)
✅ Users can update own data (UPDATE)
✅ Admins can view all users (SELECT)
```

### 5.2 Activations

```sql
✅ Users can view own activations (SELECT)
✅ Users can insert own activations (INSERT)
✅ Users can update own activations (UPDATE)
✅ Admins can read all activations (SELECT)
✅ Service role full access (ALL)
```

**⚠️ PROBLÈME**:

- Pas de protection sur la modification de `frozen_amount`
- Compensé par les triggers `protect_frozen_amount_*`

### 5.3 Rentals

```sql
✅ Users can view/insert/update own rentals
✅ Admins can view/update all rentals
✅ Service role full access
```

### 5.4 Balance Operations

```sql
❌ AUCUNE POLICY !
```

**⚠️ SÉCURITÉ**: Table non accessible via RLS

- Uniquement via fonctions SECURITY DEFINER
- Empêche manipulation directe

### 5.5 Transactions

```sql
✅ Users can view own transactions (SELECT)
✅ Admins can view all transactions (SELECT)
```

---

## ⚡ 6. INDEX DE PERFORMANCE (114 index)

### Index Critiques

#### Users

```sql
idx_users_email (email)
idx_users_role (role)
idx_users_frozen_balance (frozen_balance)  -- Pour requêtes frozen
```

#### Activations

```sql
idx_activations_user_id (user_id)  -- Pour JOIN
idx_activations_status (status)  -- Pour filtres
idx_activations_frozen (frozen_amount) WHERE frozen_amount > 0
idx_activations_charged (charged)
idx_activations_order_id (order_id)  -- UNIQUE
idx_activations_reconcile (user_id, status, frozen_amount)  -- Composite
```

#### Rentals

```sql
idx_rentals_user_id (user_id)
idx_rentals_status (status)
idx_rentals_frozen (frozen_amount) WHERE frozen_amount > 0
idx_rentals_expires_at (expires_at)  -- Pour cleanup cron
```

#### Balance Operations

```sql
idx_balance_ops_user (user_id)
idx_balance_ops_type (operation_type)
idx_balance_ops_activation (activation_id)
idx_balance_ops_rental (rental_id)
idx_balance_ops_related_tx (related_transaction_id)
```

---

## 🧊 7. FROZEN AMOUNTS - ARCHITECTURE COMPLÈTE

### 7.1 Principe

```
┌─────────────────────────────────────────┐
│           WALLET USER                   │
├─────────────────────────────────────────┤
│  balance: 1000 XOF                      │
│  frozen_balance: 150 XOF                │
│  ─────────────────────────────          │
│  DISPONIBLE: 850 XOF                    │
└─────────────────────────────────────────┘
         │
         │  frozen_amount distribué sur:
         ├──> Activation #1: 50 XOF (pending)
         ├──> Activation #2: 50 XOF (waiting)
         └──> Rental #1: 50 XOF (active)

FORMULE:
users.frozen_balance = SUM(activations.frozen_amount) + SUM(rentals.frozen_amount)
```

### 7.2 Flux Activation

```
1. USER ACHÈTE UN NUMÉRO
   ├─> atomic_freeze(user_id, 50 XOF, activation_id)
   │   ├─ balance: 1000 XOF (inchangé)
   │   ├─ frozen_balance: 0 → 50 XOF
   │   └─ activation.frozen_amount: 0 → 50 XOF
   │
   └─> Disponible: 950 XOF

2. SMS REÇU (SUCCESS)
   ├─> atomic_commit(user_id, activation_id)
   │   ├─ balance: 1000 → 950 XOF  ⚡ DÉBIT
   │   ├─ frozen_balance: 50 → 0 XOF
   │   ├─ activation.frozen_amount: 50 → 0 XOF
   │   └─ activation.charged: false → true
   │
   └─> Disponible: 950 XOF

3. TIMEOUT/CANCEL (ÉCHEC)
   ├─> atomic_refund(user_id, activation_id)
   │   ├─ balance: 1000 → 1000 XOF  ⚡ REMBOURSEMENT
   │   ├─ frozen_balance: 50 → 0 XOF
   │   └─ activation.frozen_amount: 50 → 0 XOF
   │
   └─> Disponible: 1000 XOF
```

### 7.3 Protection Race Conditions

```sql
-- Thread A et B essaient simultanément d'acheter pour 600 XOF
-- Balance: 1000 XOF, Frozen: 0

┌──────────────┬──────────────────────────────┬──────────────────────────────┐
│   TEMPS      │         THREAD A             │         THREAD B             │
├──────────────┼──────────────────────────────┼──────────────────────────────┤
│ t1           │ BEGIN;                       │ BEGIN;                       │
│ t2           │ SELECT ... FOR UPDATE;       │ (ATTEND le lock)             │
│ t3           │ (lock obtenu)                │ (bloqué)                     │
│ t4           │ Vérifie: 1000-0 >= 600 ✅    │ ...                          │
│ t5           │ frozen_balance = 600         │ ...                          │
│ t6           │ COMMIT; (libère lock)        │ ...                          │
│ t7           │ ...                          │ SELECT ... FOR UPDATE;       │
│ t8           │ ...                          │ (lock obtenu)                │
│ t9           │ ...                          │ Vérifie: 1000-600 >= 600 ❌  │
│ t10          │ ...                          │ ROLLBACK; Error!             │
└──────────────┴──────────────────────────────┴──────────────────────────────┘

✅ FOR UPDATE garantit qu'un seul thread peut modifier à la fois
✅ Évite double-dépense (double-spend attack)
```

### 7.4 État Actuel du Système

```
👥 USERS:
   Total frozen: 70 XOF
   - buba6c@gmail.com: 60 XOF frozen
   - kawdpc@gmail.com: 10 XOF frozen

📱 ACTIVATIONS:
   - pending (5): 70 XOF frozen  ⚠️
   - received (32): 5 XOF frozen  ⚠️ Anormal !
   - Autres statuts: 0 XOF frozen ✅

🏠 RENTALS:
   - active (3): 15 XOF frozen  ⚠️ Incohérence !
   - Autres: 0 XOF ✅
```

**🚨 INCOHÉRENCES DÉTECTÉES**:

1. **received** avec frozen non libéré (5 XOF)
2. **rentals active** avec 15 XOF frozen mais users ont seulement 70 XOF
3. Total: 70 (users) ≠ 90 (activations + rentals)

---

## 💼 8. BALANCE OPERATIONS - TRAÇABILITÉ

### 8.1 Types d'Opérations

```sql
- 'freeze': Gel de fonds (avant achat)
- 'unfreeze': Libération sans refund
- 'charge': Débit définitif (commit)
- 'refund': Remboursement (refund)
- 'deposit': Ajout de crédits
- 'credit': Bonus/cadeau
```

### 8.2 Structure Complète

```sql
balance_operations {
  operation_type: 'freeze' | 'charge' | 'refund' | 'deposit' | 'credit'
  amount: NUMERIC  (positif ou négatif selon le type)
  balance_before: NUMERIC
  balance_after: NUMERIC
  frozen_before: NUMERIC
  frozen_after: NUMERIC
  activation_id: UUID (si lié à activation)
  rental_id: UUID (si lié à rental)
  related_transaction_id: UUID (transaction parente)
  reason: TEXT
  metadata: JSONB
}
```

### 8.3 Audit Trail Complet

Pour chaque activation/rental, on peut tracer:

```sql
SELECT
  bo.created_at,
  bo.operation_type,
  bo.amount,
  bo.balance_before,
  bo.balance_after,
  bo.frozen_before,
  bo.frozen_after,
  bo.reason
FROM balance_operations bo
WHERE activation_id = 'xxx'
ORDER BY created_at;
```

**Exemple de timeline**:

```
1. freeze: +50 frozen, balance stable
2. charge: -50 balance, -50 frozen (success)
OU
2. refund: +50 balance, -50 frozen (échec)
```

---

## 🔒 9. SÉCURITÉ

### 9.1 Protection en Couches

```
┌────────────────────────────────────────────┐
│  1. RLS (Row Level Security)               │
│     - Users voient leurs données           │
│     - Admins voient tout                   │
└────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────┐
│  2. TRIGGERS                               │
│     - prevent_direct_frozen_amount_update  │
│     - protect_frozen_amount_*              │
└────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────┐
│  3. SECURITY DEFINER Functions             │
│     - atomic_freeze/commit/refund          │
│     - Bypass RLS de manière contrôlée      │
└────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────┐
│  4. FOR UPDATE (Locks)                     │
│     - Évite race conditions                │
│     - Garantit atomicité                   │
└────────────────────────────────────────────┘
```

### 9.2 Qui Peut Faire Quoi

```
UTILISATEUR NORMAL:
  ✅ Voir ses activations/rentals
  ✅ Créer activations/rentals
  ❌ Modifier frozen_amount directement
  ❌ Modifier balance directement
  ❌ Voir balance_operations

ADMIN:
  ✅ Voir toutes activations/rentals
  ✅ Voir tous les users
  ✅ Voir balance_operations (via fonction)
  ⚠️  Modifier frozen_amount (bloqué par trigger)

SERVICE ROLE (Edge Functions):
  ✅ Accès complet via SECURITY DEFINER
  ✅ Peut appeler atomic_* functions
  ✅ Bypass RLS de manière sécurisée
```

---

## 📈 10. STATISTIQUES D'ACTIVITÉ

### Top 10 Tables par Activité

```
1. activations: 235 insertions, nombreuses updates
2. balance_operations: 208 insertions
3. transactions: 385 insertions
4. users: 45 insertions, updates fréquentes
5. rentals: 31 insertions, updates
```

### Index Usage

```
✅ Tous les index sont bien utilisés
✅ Pas d'index inutilisé détecté
✅ Performance optimale pour les requêtes fréquentes
```

---

## 🚨 11. PROBLÈMES IDENTIFIÉS

### 11.1 CRITIQUE - Incohérences Frozen

```
❌ users.frozen_balance (70 XOF) ≠
   activations.frozen_amount (75 XOF) +
   rentals.frozen_amount (15 XOF)

Total calculé: 90 XOF
Total user: 70 XOF
Différence: 20 XOF manquants
```

**Causes possibles**:

1. atomic_refund pas appelé sur certaines expirations
2. Updates manuels (avant mise en place triggers)
3. Race condition non détectée

**Solution**:

```sql
-- Exécuter la réconciliation
SELECT * FROM reconcile_orphan_freezes();
SELECT * FROM reconcile_rentals_orphan_freezes();
```

### 11.2 MAJEUR - Activations "received" avec frozen

```sql
-- 32 activations "received" avec 5 XOF frozen
-- Normalement, "received" devrait trigger atomic_commit
-- frozen_amount devrait être à 0
```

**Action requise**:

- Vérifier la logique de l'Edge Function `check-sms-activate-status`
- S'assurer que atomic_commit est appelé quand SMS reçu

### 11.3 MINEUR - Rentals expirés non traités

```
⚠️  3 rentals expirés (expires_at < NOW) avec status='active'
```

**Action**:

- Vérifier le CRON `cleanup-expired-rentals`
- Exécuter manuellement si nécessaire

### 11.4 MINEUR - Balance Operations sans "status"

```sql
-- La colonne "status" n'existe pas dans balance_operations
-- Peut-être prévu mais pas implémenté ?
```

---

## 🎯 12. RECOMMANDATIONS

### 12.1 Court Terme (Urgent)

1. **Réconcilier les frozen amounts**

   ```sql
   SELECT * FROM reconcile_orphan_freezes();
   SELECT * FROM reconcile_rentals_orphan_freezes();
   ```

2. **Traiter les rentals expirés**

   ```sql
   -- Via Edge Function ou manuellement
   UPDATE rentals
   SET status = 'expired'
   WHERE status = 'active' AND expires_at < NOW();
   ```

3. **Auditer les activations "received"**
   ```sql
   SELECT * FROM activations
   WHERE status = 'received' AND frozen_amount > 0;
   ```

### 12.2 Moyen Terme

1. **Ajouter monitoring**

   - Alerte si `users.frozen_balance ≠ SUM(activations+rentals)`
   - Dashboard admin avec ces métriques

2. **Renforcer CRON jobs**

   - `process_expired_activations` toutes les 5 minutes
   - `cleanup-expired-rentals` toutes les 10 minutes
   - `reconcile_orphan_freezes` toutes les heures

3. **Tests de charge**
   - Simuler 100 achats simultanés
   - Vérifier les race conditions

### 12.3 Long Terme

1. **Ajouter status sur balance_operations**

   ```sql
   ALTER TABLE balance_operations ADD COLUMN status TEXT DEFAULT 'completed';
   ```

2. **Historique pricing_rules**

   - pricing_rules_archive (119K rows) pourrait être une vue matérialisée

3. **Backup automated frozen state**
   - Snapshot quotidien de tous les frozen_amounts
   - Permet rollback en cas de corruption

---

## 📚 13. EXTENSIONS POSTGRESQL UTILISÉES

```
1. uuid-ossp: Génération UUID
2. http: Requêtes HTTP depuis PostgreSQL
3. pg_net: Networking (webhooks)
4. pgcrypto: Cryptographie
5. pgjwt: JWT tokens
```

---

## ✅ 14. POINTS FORTS

1. **Architecture robuste**

   - Fonctions atomic bien conçues
   - FOR UPDATE prévient race conditions
   - SECURITY DEFINER pour opérations sensibles

2. **Traçabilité complète**

   - balance_operations enregistre tout
   - Audit trail complet

3. **Sécurité multi-couches**

   - RLS + Triggers + Functions
   - Protection contre manipulation directe

4. **Performance**

   - 114 index bien placés
   - Requêtes optimisées

5. **Réconciliation automatique**
   - Fonctions de correction d'incohérences
   - CRON jobs de nettoyage

---

## 🎓 15. DOCUMENTATION DES FLUX

### Flux Complet d'Achat Activation

```
┌─────────────────────────────────────────────────────────────┐
│  1. USER CLIQUE "ACHETER"                                   │
└─────────────────────────────────────────────────────────────┘
  │
  ├─> Frontend: Appelle Edge Function "buy-sms-activate-number"
  │
  ├─> Edge Function:
  │   ├─ 1. Crée transaction (type: 'purchase', status: 'pending')
  │   │
  │   ├─ 2. Appelle atomic_freeze(user_id, price, transaction_id, activation_id)
  │   │      ├─ Lock user (FOR UPDATE)
  │   │      ├─ Vérifie balance disponible
  │   │      ├─ Si OK: frozen_balance += price
  │   │      └─ activation.frozen_amount = price
  │   │
  │   ├─ 3. Appelle API SMS-Activate
  │   │      ├─ POST /getNumber
  │   │      └─ Reçoit: {id, phone}
  │   │
  │   ├─ 4. Crée activation:
  │   │      status: 'pending'
  │   │      order_id: id de SMS-Activate
  │   │      phone: numéro reçu
  │   │      frozen_amount: price (déjà set par atomic_freeze)
  │   │
  │   └─ 5. Retourne au frontend
  │
  └─> Frontend: Affiche le numéro, commence polling

┌─────────────────────────────────────────────────────────────┐
│  2. ATTENTE SMS (Polling)                                   │
└─────────────────────────────────────────────────────────────┘
  │
  ├─> Frontend: Appelle "check-sms-activate-status" toutes les 5s
  │
  ├─> Edge Function:
  │   ├─ Appelle API SMS-Activate: GET /getStatus
  │   │
  │   ├─ Si SMS reçu:
  │   │   ├─ UPDATE activations SET
  │   │   │   status = 'received',
  │   │   │   sms_code = code,
  │   │   │   sms_text = message
  │   │   │
  │   │   ├─ Appelle atomic_commit(user_id, activation_id)
  │   │   │   ├─ Lock user
  │   │   │   ├─ balance -= frozen_amount  ⚡ DÉBIT DÉFINITIF
  │   │   │   ├─ frozen_balance -= frozen_amount
  │   │   │   ├─ activation.frozen_amount = 0
  │   │   │   └─ activation.charged = true
  │   │   │
  │   │   └─ Retourne code au frontend
  │   │
  │   └─ Si timeout/cancel:
  │       ├─ UPDATE activations SET status = 'timeout'
  │       │
  │       ├─ Appelle atomic_refund(user_id, activation_id)
  │       │   ├─ Lock user
  │       │   ├─ balance += frozen_amount  ⚡ REMBOURSEMENT
  │       │   ├─ frozen_balance -= frozen_amount
  │       │   └─ activation.frozen_amount = 0
  │       │
  │       └─ Retourne erreur au frontend
  │
  └─> CRON (toutes les 5 min):
      process_expired_activations()
      └─ Pour chaque activation pending/waiting expirée:
         atomic_refund automatique
```

---

**FIN DU RAPPORT**

_Pour analyse complète (2796 lignes), voir: `sql_analysis_complete.txt`_
