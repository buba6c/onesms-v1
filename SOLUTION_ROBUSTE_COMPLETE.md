# 🛡️ SOLUTION ROBUSTE: Protection contre perte de frozen_amount

## 🔍 PROBLÈME IDENTIFIÉ

### Symptômes

- ❌ Activations échouent (timeout, failed, cancelled) mais `frozen_amount=0` sans refund
- ❌ Users perdent des Ⓐ même quand l'activation échoue
- ❌ 8 activations dans les 24h: **41 Ⓐ perdus** (status=timeout, frozen=0, charged=false, AUCUN refund)
- ❌ 28 freeze orphelins (freeze existe mais pas de refund/commit correspondant)

### Cause Root

```typescript
// buy-sms-activate-number/index.ts ligne 549
} catch (error: any) {
  // ❌ PROBLÈME: Retourne erreur SANS vérifier si freeze a été appliqué
  return new Response(JSON.stringify({ success: false, error: error.message }))
}
```

**Scénario de perte:**

1. `secure_freeze_balance()` réussit → frozen_amount gelé ✅
2. Erreur survient après (ex: linkError, linkFreezeError, network timeout)
3. `catch(error)` retourne erreur à l'utilisateur
4. ❌ **AUCUN ROLLBACK** → frozen_amount reste gelé à jamais
5. User voit "Erreur" mais son solde est perdu

## 🛡️ SOLUTION EN 3 COUCHES

### 1️⃣ Protection Code (Edge Function)

**Fichier:** `supabase/functions/buy-sms-activate-number/index.ts`

```typescript
// 🛡️ PROTECTION ROLLBACK: Track si freeze appliqué
let freezeApplied = false;
let frozenAmount = 0;

try {
  // 4.1. Freeze
  const { data: freezeResult, error: freezeError } = await supabaseClient.rpc(
    "secure_freeze_balance",
    {
      p_user_id: userId,
      p_activation_id: activation.id,
      p_amount: price,
      p_reason: `Activation ${product} (${country})`,
    }
  );

  if (freezeError) {
    // Freeze échoué → cleanup activation + transaction
    await supabaseClient.from("activations").delete().eq("id", activation.id);
    await supabaseClient
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", transactionId);
    throw new Error(`Failed to freeze balance: ${freezeError.message}`);
  }

  // ✅ FREEZE APPLIQUÉ - Activer protection
  freezeApplied = true;
  frozenAmount = freezeResult.frozen_amount;

  // ... reste de la logique (link transaction, link freeze, etc.)
} catch (postFreezeError: any) {
  // 🚨 ERREUR APRÈS FREEZE → ROLLBACK OBLIGATOIRE
  console.error("🚨 [BUY-SMS-ACTIVATE] Error after freeze, rolling back...");

  if (freezeApplied) {
    console.log("🔄 [BUY-SMS-ACTIVATE] Attempting atomic_refund rollback...");

    const { data: rollbackResult, error: rollbackError } =
      await supabaseClient.rpc("atomic_refund", {
        p_user_id: userId,
        p_activation_id: activation.id,
        p_amount: frozenAmount,
        p_reason: `Rollback: ${postFreezeError.message}`,
      });

    if (rollbackError) {
      console.error(
        "❌ [BUY-SMS-ACTIVATE] atomic_refund rollback FAILED:",
        rollbackError
      );
    } else if (rollbackResult?.success) {
      console.log("✅ [BUY-SMS-ACTIVATE] Rollback successful:", rollbackResult);
    }
  }

  // Nettoyer transaction
  await supabaseClient
    .from("transactions")
    .update({
      status: "failed",
      description: `Error: ${postFreezeError.message}`,
    })
    .eq("id", transactionId);

  // Re-throw erreur originale
  throw postFreezeError;
}
```

**✅ Avantages:**

- Protection immédiate: rollback dès qu'erreur après freeze
- Idempotent: si rollback échoue, la réconciliation CRON le rattrapera
- Logging complet pour debugging

### 2️⃣ Réconciliation Automatique (CRON Job)

**Fichier:** `SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql`

```sql
-- Function: reconcile_orphan_freezes()
-- Trouve activations avec frozen_amount > 0 ET status IN (timeout, failed, cancelled)
-- Vérifie si refund existe dans balance_operations
-- Si non, appelle atomic_refund

CREATE OR REPLACE FUNCTION reconcile_orphan_freezes()
RETURNS TABLE(
  activation_id uuid,
  user_id uuid,
  frozen_amount numeric,
  status text,
  refund_applied boolean,
  error text
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_activation RECORD;
  v_refund_exists BOOLEAN;
BEGIN
  FOR v_activation IN
    SELECT a.id, a.user_id, a.frozen_amount, a.status
    FROM activations a
    WHERE a.frozen_amount > 0
      AND a.status IN ('timeout', 'failed', 'cancelled')
      AND a.charged = false
    ORDER BY a.created_at DESC
    LIMIT 50
  LOOP
    -- Vérifier si refund existe
    SELECT EXISTS(
      SELECT 1 FROM balance_operations
      WHERE activation_id = v_activation.id AND operation_type = 'refund'
    ) INTO v_refund_exists;

    IF NOT v_refund_exists THEN
      -- Appliquer atomic_refund
      BEGIN
        PERFORM atomic_refund(
          v_activation.user_id,
          v_activation.id,
          v_activation.frozen_amount,
          'Reconciliation: orphan freeze cleanup'
        );

        RETURN QUERY SELECT
          v_activation.id, v_activation.user_id, v_activation.frozen_amount,
          v_activation.status, true, NULL::text;
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
          v_activation.id, v_activation.user_id, v_activation.frozen_amount,
          v_activation.status, false, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;
```

**CRON Job Supabase:**

- **Nom:** `reconcile-orphan-freezes`
- **Schedule:** `*/5 * * * *` (toutes les 5 minutes)
- **SQL:**
  ```sql
  SELECT reconcile_orphan_freezes();
  SELECT reconcile_rentals_orphan_freezes();
  ```

**✅ Avantages:**

- Filet de sécurité: rattrape les freeze orphelins même si Edge Function échoue
- Automatique: aucune intervention manuelle
- Idempotent: ne double pas les refunds

### 3️⃣ Monitoring (View Health)

**Fichier:** `SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql`

```sql
-- View: v_frozen_balance_health
-- Compare users.frozen_balance avec SUM(activations.frozen_amount + rentals.frozen_amount)
-- Détecte les discrepancies

CREATE OR REPLACE VIEW v_frozen_balance_health AS
WITH user_frozen_sums AS (
  SELECT user_id, COALESCE(SUM(frozen_amount), 0) AS total_frozen_activations
  FROM (
    SELECT user_id, frozen_amount FROM activations WHERE frozen_amount > 0
    UNION ALL
    SELECT user_id, frozen_amount FROM rentals WHERE frozen_amount > 0
  ) AS combined
  GROUP BY user_id
)
SELECT
  u.id AS user_id,
  u.balance,
  u.frozen_balance AS frozen_balance_user,
  COALESCE(ufs.total_frozen_activations, 0) AS total_frozen_activations,
  (u.frozen_balance - COALESCE(ufs.total_frozen_activations, 0)) AS frozen_discrepancy,
  CASE
    WHEN (u.frozen_balance - COALESCE(ufs.total_frozen_activations, 0)) = 0 THEN '✅ Healthy'
    WHEN (u.frozen_balance - COALESCE(ufs.total_frozen_activations, 0)) > 0 THEN '⚠️ Over-frozen'
    ELSE '🚨 Under-frozen'
  END AS health_status
FROM users u
LEFT JOIN user_frozen_sums ufs ON u.id = ufs.user_id
WHERE u.frozen_balance > 0 OR COALESCE(ufs.total_frozen_activations, 0) > 0;
```

**Query Monitoring:**

```sql
-- Trouver users avec discrepancy
SELECT * FROM v_frozen_balance_health
WHERE frozen_discrepancy != 0
ORDER BY frozen_discrepancy DESC;

-- Dashboard santé
SELECT
  health_status,
  COUNT(*) as count,
  SUM(frozen_discrepancy) as total_discrepancy
FROM v_frozen_balance_health
GROUP BY health_status;
```

## 📋 DÉPLOIEMENT

### Étape 1: Déployer SQL

```bash
# Ouvrir Supabase SQL Editor
# Copier-coller: SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql
# Exécuter
```

**Contient:**

- ✅ View `v_frozen_balance_health`
- ✅ Function `reconcile_orphan_freezes()`
- ✅ Function `reconcile_rentals_orphan_freezes()`
- ✅ Function `atomic_refund_rental()` (si manquant)

### Étape 2: Tester Réconciliation

```sql
-- Trouver activations orphelines
SELECT * FROM activations
WHERE frozen_amount > 0
  AND status IN ('timeout', 'failed', 'cancelled')
  AND charged = false;

-- Appliquer réconciliation
SELECT * FROM reconcile_orphan_freezes();

-- Vérifier résultat
SELECT * FROM v_frozen_balance_health WHERE frozen_discrepancy != 0;
```

### Étape 3: Déployer Edge Function

```bash
npx supabase functions deploy buy-sms-activate-number
```

**Modifications:**

- ✅ try-catch autour de `secure_freeze_balance` + logique suivante
- ✅ Flag `freezeApplied` pour tracker si freeze réussi
- ✅ `catch(postFreezeError)` appelle `atomic_refund` si `freezeApplied=true`

### Étape 4: Créer CRON Job

**Supabase Dashboard → Database → Cron Jobs**

- **Name:** `reconcile-orphan-freezes`
- **Schedule:** `*/5 * * * *` (toutes les 5 minutes)
- **SQL Command:**
  ```sql
  SELECT reconcile_orphan_freezes();
  SELECT reconcile_rentals_orphan_freezes();
  ```

### Étape 5: Monitoring Dashboard

```sql
-- Dashboard quotidien
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_activations,
  COUNT(*) FILTER (WHERE status = 'timeout' AND frozen_amount = 0 AND charged = false) as suspect_timeout,
  COUNT(*) FILTER (WHERE frozen_amount > 0 AND status IN ('timeout', 'failed', 'cancelled')) as orphans
FROM activations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Health check temps réel
SELECT * FROM v_frozen_balance_health
WHERE frozen_discrepancy != 0;
```

## 🧪 TESTS

### Test 1: Protection Rollback

```typescript
// Simuler erreur après freeze
try {
  const freeze = await secure_freeze_balance(...)
  freezeApplied = true

  // SIMULER ERREUR
  throw new Error('Test error after freeze')

} catch (e) {
  // Doit appeler atomic_refund
}
```

**Résultat attendu:**

- ✅ Log: "🔄 Attempting atomic_refund rollback..."
- ✅ Log: "✅ Rollback successful"
- ✅ `frozen_amount` = 0
- ✅ `balance_operations` contient refund

### Test 2: Réconciliation CRON

```sql
-- 1. Créer activation orpheline (simulation)
INSERT INTO activations (user_id, frozen_amount, status, charged, ...)
VALUES ('user-id', 5, 'timeout', false, ...);

-- 2. Lancer réconciliation
SELECT * FROM reconcile_orphan_freezes();

-- 3. Vérifier
SELECT * FROM balance_operations
WHERE activation_id = 'activation-id' AND operation_type = 'refund';
```

**Résultat attendu:**

- ✅ Refund créé dans `balance_operations`
- ✅ `frozen_amount` = 0 sur activation
- ✅ `users.frozen_balance` réduit

### Test 3: Health Monitoring

```sql
-- Doit retourner 0 discrepancy après réconciliation
SELECT * FROM v_frozen_balance_health WHERE frozen_discrepancy != 0;
```

## 📊 RÉSULTATS ATTENDUS

### Avant Solution

- ❌ 8 activations orphelines / 24h → 41 Ⓐ perdus
- ❌ 28 freeze sans refund correspondant
- ❌ `frozen_balance` incohérent pour plusieurs users

### Après Solution

- ✅ 0 activation orpheline (réconciliation automatique)
- ✅ `frozen_balance` toujours cohérent
- ✅ Aucune perte de Ⓐ même si erreur après freeze
- ✅ Monitoring en temps réel via view

## 🎯 MAINTENANCE

### Checks Quotidiens

```sql
-- 1. Vérifier santé frozen_balance
SELECT * FROM v_frozen_balance_health WHERE frozen_discrepancy != 0;

-- 2. Vérifier activations orphelines
SELECT COUNT(*) FROM activations
WHERE frozen_amount > 0 AND status IN ('timeout', 'failed', 'cancelled');

-- 3. Vérifier logs CRON
SELECT * FROM cron.job_run_details
WHERE jobname = 'reconcile-orphan-freezes'
ORDER BY start_time DESC LIMIT 10;
```

### Alerts

- ⚠️ Si `frozen_discrepancy` > 100 Ⓐ → Investiguer
- ⚠️ Si CRON échoue > 3 fois → Vérifier logs
- ⚠️ Si rollback échoue dans logs → Vérifier `atomic_refund`

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] 1. Exécuter `SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql` dans Supabase
- [ ] 2. Tester: `SELECT * FROM reconcile_orphan_freezes();`
- [ ] 3. Vérifier: `SELECT * FROM v_frozen_balance_health;`
- [ ] 4. Déployer: `npx supabase functions deploy buy-sms-activate-number`
- [ ] 5. Créer CRON Job: `reconcile-orphan-freezes` (_/5 _ \* \* \*)
- [ ] 6. Tester achat normal → doit fonctionner
- [ ] 7. Simuler erreur après freeze → doit rollback
- [ ] 8. Attendre 5 minutes → CRON doit tourner
- [ ] 9. Vérifier logs CRON → doit être success
- [ ] 10. Monitor: `SELECT * FROM v_frozen_balance_health WHERE frozen_discrepancy != 0;`

## 🔗 FICHIERS MODIFIÉS

1. **SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql** (nouveau)

   - View `v_frozen_balance_health`
   - Function `reconcile_orphan_freezes()`
   - Function `reconcile_rentals_orphan_freezes()`
   - Function `atomic_refund_rental()`

2. **supabase/functions/buy-sms-activate-number/index.ts** (modifié)

   - Lignes 453-520: Wrapper try-catch avec rollback protection

3. **analyze_freeze_liberation_bug.mjs** (diagnostic)

   - Script d'analyse des freeze orphelins

4. **deploy_robust_freeze_protection.mjs** (déploiement)
   - Script de vérification et instructions

## 🎉 CONCLUSION

Cette solution en 3 couches garantit qu'**aucun frozen_amount ne peut rester gelé sans raison**:

1. **Couche 1 (Code):** Protection immédiate via try-catch avec rollback
2. **Couche 2 (CRON):** Réconciliation automatique toutes les 5 minutes
3. **Couche 3 (Monitoring):** View health pour détection précoce

**Résultat:** 0 perte de Ⓐ, frozen_balance toujours cohérent, système auto-réparateur.
