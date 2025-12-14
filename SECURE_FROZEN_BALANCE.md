# 🔒 SYSTÈME SÉCURISÉ DE FROZEN BALANCE - DOCUMENTATION

## Problème Résolu

### Situation Initiale (BUG CRITIQUE)

- `frozen_balance` était un nombre agrégé sur la table `users`
- Quand un utilisateur avait 2 activations à 100€ chacune, `frozen_balance = 200`
- À l'annulation d'UNE activation, le système libérait TOUT le `frozen_balance`
- **RISQUE FINANCIER**: L'utilisateur récupérait 200€ au lieu de 100€

### Solution Implémentée

- Ajout de `frozen_amount` sur chaque activation/rental
- Chaque opération utilise maintenant le `frozen_amount` individuel
- `frozen_balance` reste une agrégation mais sa mise à jour est contrôlée
- Système d'audit complet avec table `balance_operations`
- Vue de monitoring `v_frozen_balance_health`

## Différence entre Activations et Rentals

### Activations (SMS)

- **À l'achat**: `frozen_balance += price`, `balance` reste inchangé
- **Si SMS reçu**: `frozen_balance -= price`, `balance -= price` (charge définitive)
- **Si annulation/timeout**: `frozen_balance -= price`, `balance` reste inchangé (remboursement)

### Rentals (Location)

- **À l'achat**: `balance -= price` ET `frozen_balance += price` temporairement
- **Settle immédiat**: `frozen_balance -= price` (le balance est déjà débité)
- **Annulation (< 20min)**: Remboursement `balance += price`

## Fichiers Modifiés

### 1. Migration SQL

`migrations/secure_frozen_balance_system.sql`

- ALTER TABLE activations ADD frozen_amount
- ALTER TABLE rentals ADD frozen_amount
- CREATE TABLE balance_operations (audit)
- CREATE FUNCTION secure_freeze_balance()
- CREATE FUNCTION secure_unfreeze_balance()
- CREATE FUNCTION fix_frozen_balance_discrepancy()
- CREATE FUNCTION reconcile_frozen_balance()
- CREATE VIEW v_frozen_balance_health

### 2. Edge Functions Modifiées

#### `cancel-sms-activate-order/index.ts`

- Utilise `activation.frozen_amount` au lieu de `activation.price`
- Reset `frozen_amount: 0` après dégel
- Protection `Math.min()` contre sur-dégel

#### `buy-sms-activate-number/index.ts`

- Enregistre `frozen_amount: price` à l'insertion

#### `check-sms-activate-status/index.ts`

- FES Step 2 (SUCCESS): utilise frozen_amount
- FES Step 3 (FAIL): utilise frozen_amount
- Section 2 (SMS reçu): utilise frozen_amount
- STATUS_CANCEL: utilise frozen_amount

#### `cron-check-pending-sms/index.ts`

- Utilise `frozen_amount` pour le dégel lors d'expiration
- Utilise `frozen_amount` pour le dégel lors de réception SMS
- Reset `frozen_amount: 0` après opérations

#### `sync-sms-activate-activations/index.ts`

- Utilise `frozen_amount` pour le dégel lors de synchronisation SMS
- Reset `frozen_amount: 0` après succès

#### `recover-sms-from-history/index.ts`

- Utilise `frozen_amount` pour le dégel lors de récupération
- Reset `frozen_amount: 0` après succès

#### `cleanup-expired-activations/index.ts`

- Utilise `frozen_amount` pour le dégel des activations expirées
- Reset `frozen_amount: 0` après nettoyage

#### `buy-sms-activate-rent/index.ts`

- Enregistre `frozen_amount: roundedPrice` à la création
- Reset `frozen_amount: 0` après le settle

#### `set-rent-status/index.ts`

- Logique de remboursement maintenue (pour rentals < 20min)

### 3. Scripts de Migration

`migrate_secure_frozen.mjs`

- Vérifie la structure des tables (activations + rentals)
- Migre les activations pending
- Migre les rentals actives
- Réconcilie les frozen_balance incorrects
- Génère un rapport de santé

## Plan de Déploiement

### Étape 1: Migration SQL

```bash
# Via Supabase CLI
cd "/Users/mac/Desktop/ONE SMS V1"
npx supabase db push

# OU manuellement dans SQL Editor de Supabase Dashboard
# Copier le contenu de migrations/secure_frozen_balance_system.sql
```

### Étape 2: Vérifier la migration

```bash
node migrate_secure_frozen.mjs
```

### Étape 3: Déployer les Edge Functions

```bash
npx supabase functions deploy cancel-sms-activate-order
npx supabase functions deploy buy-sms-activate-number
npx supabase functions deploy check-sms-activate-status
npx supabase functions deploy cron-check-pending-sms
```

### Étape 4: Vérifier le déploiement

1. Acheter une activation (vérifier que frozen_amount est set)
2. Annuler l'activation (vérifier que seul ce montant est dégelé)
3. Vérifier la vue de monitoring:

```sql
SELECT * FROM v_frozen_balance_health WHERE health_status != 'OK';
```

## Commandes Utiles

### Vérifier la santé des frozen_balance

```sql
SELECT * FROM v_frozen_balance_health;
```

### Corriger un utilisateur spécifique

```sql
SELECT fix_frozen_balance_discrepancy('user-uuid-here');
```

### Voir l'historique des opérations

```sql
SELECT * FROM balance_operations
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### Réconcilier un utilisateur

```sql
SELECT * FROM reconcile_frozen_balance('user-uuid-here');
```

## Architecture Technique

```
┌─────────────────┐    ┌─────────────────┐
│   activations   │    │     rentals     │
├─────────────────┤    ├─────────────────┤
│ id              │    │ id              │
│ user_id         │    │ user_id         │
│ price           │    │ total_cost      │
│ status          │    │ status          │
│ frozen_amount ◄─┼────┼─► frozen_amount │ ← NOUVEAU
└────────┬────────┘    └────────┬────────┘
         │                      │
         │    SUM(frozen_amount)│
         └──────────┬───────────┘
                    │
                    ▼
         ┌─────────────────┐
         │      users      │
         ├─────────────────┤
         │ id              │
         │ balance         │
         │ frozen_balance ◄┤ ← Agrégation contrôlée
         └─────────────────┘
                    │
                    │ Audit
                    ▼
         ┌─────────────────┐
         │balance_operations│
         ├─────────────────┤
         │ user_id         │
         │ activation_id   │
         │ operation_type  │
         │ amount          │
         │ frozen_before   │
         │ frozen_after    │
         └─────────────────┘
```

## Tests Recommandés

1. **Test d'achat simple**

   - Acheter une activation à 50€
   - Vérifier: activation.frozen_amount = 50, user.frozen_balance = 50

2. **Test d'annulation unique**

   - Annuler l'activation
   - Vérifier: activation.frozen_amount = 0, user.frozen_balance = 0, user.balance restauré

3. **Test d'achats multiples**

   - Acheter 2 activations à 50€ et 30€
   - Vérifier: frozen_balance = 80
   - Annuler la première (50€)
   - Vérifier: frozen_balance = 30 (PAS 0!)

4. **Test de succès SMS**
   - Acheter une activation
   - Simuler réception SMS (status = success)
   - Vérifier: frozen_amount = 0, frozen_balance = 0, balance débité définitivement

## Surveillance Continue

Ajouter ce check dans un cron job quotidien:

```sql
DO $$
DECLARE
    anomaly_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO anomaly_count
    FROM v_frozen_balance_health
    WHERE health_status = 'ANOMALY';

    IF anomaly_count > 0 THEN
        RAISE WARNING 'ALERT: % users with frozen_balance anomalies', anomaly_count;
        -- Envoyer notification/alert
    END IF;
END;
$$;
```
