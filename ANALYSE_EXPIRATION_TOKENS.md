# 🔍 ANALYSE APPROFONDIE: Pourquoi les tokens ne sont pas libérés à l'expiration

## 📊 Résumé Exécutif

**PROBLÈME IDENTIFIÉ**: Les tokens (frozen_balance) ne sont **PAS automatiquement libérés** quand une activation expire.

**IMPACT**: Fonds des utilisateurs gelés indéfiniment, même après expiration des activations.

---

## 🧬 Architecture du Système d'Expiration

### 1. Le Flux Normal (Comment ça DEVRAIT fonctionner)

```
┌─────────────────────────────────────────────────────────────┐
│  ACTIVATION CRÉÉE                                           │
│  ├─ Status: 'pending'                                       │
│  ├─ frozen_amount: 5 Ⓐ                                      │
│  ├─ expires_at: NOW() + 20 minutes                          │
│  └─ users.frozen_balance: +5 Ⓐ                              │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
           ⏰ 20 MINUTES PASSENT
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  MÉCANISME #1: CRON Job (toutes les 5 min)                 │
│  ├─ cleanup-expired-activations                             │
│  ├─ Appelle Edge Function                                   │
│  └─ Traite les activations avec expires_at < NOW()          │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  MÉCANISME #2: Edge Function                                │
│  ├─ cleanup-expired-activations/index.ts                    │
│  ├─ Trouve: expires_at < NOW() AND frozen_amount > 0        │
│  ├─ Appelle: atomic_refund(user_id, activation_id)          │
│  └─ Annule sur SMS-Activate API                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  MÉCANISME #3: Fonction SQL                                 │
│  ├─ atomic_refund() OU secure_unfreeze_balance()            │
│  ├─ UPDATE users: frozen_balance = frozen_balance - 5       │
│  ├─ UPDATE activations: frozen_amount = 0, status=timeout   │
│  └─ INSERT balance_operations: refund operation             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
                   ✅ TOKENS LIBÉRÉS
```

---

## 🐛 Les 7 Points de Défaillance Possibles

### ❌ DÉFAILLANCE #1: CRON Jobs Non Configurés

**Symptômes:**

- Aucun CRON job dans `cron.job` table
- La table existe mais est vide

**Cause:**

- Le script `SETUP_CRON_JOBS.sql` n'a jamais été exécuté
- Les extensions `pg_cron` et `pg_net` ne sont pas activées

**Vérification:**

```sql
SELECT * FROM cron.job WHERE jobname LIKE '%expired%';
-- Si résultat vide → PROBLÈME #1
```

**Solution:**

```bash
# Exécuter dans Supabase Dashboard > SQL Editor
cat SETUP_CRON_JOBS.sql | psql
```

---

### ❌ DÉFAILLANCE #2: CRON Jobs Inactifs

**Symptômes:**

- Les CRON jobs existent mais `active = false`
- Aucune exécution dans `cron.job_run_details`

**Cause:**

- CRON jobs désactivés manuellement
- Erreur lors de la création initiale

**Vérification:**

```sql
SELECT jobname, active FROM cron.job
WHERE jobname = 'cleanup-expired-activations';
-- Si active = false → PROBLÈME #2
```

**Solution:**

```sql
-- Réactiver le CRON
SELECT cron.unschedule('cleanup-expired-activations');
SELECT cron.schedule(
  'cleanup-expired-activations',
  '*/5 * * * *',
  $$SELECT net.http_post(...)$$
);
```

---

### ❌ DÉFAILLANCE #3: Edge Function Échoue

**Symptômes:**

- CRON s'exécute mais retourne errors
- `cron.job_run_details` montre status='failed'
- Les activations expirées ne changent PAS de status

**Causes Possibles:**

- URL de la fonction incorrecte
- Authorization token invalide
- Fonction Edge non déployée
- Timeout de la fonction
- Erreur dans le code TypeScript

**Vérification:**

```sql
SELECT status, return_message, start_time
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname = 'cleanup-expired-activations'
ORDER BY start_time DESC LIMIT 5;
-- Si tous status='failed' → PROBLÈME #3
```

**Solution:**

```bash
# Redéployer la fonction
cd supabase/functions
supabase functions deploy cleanup-expired-activations
```

---

### ❌ DÉFAILLANCE #4: Fonction atomic_refund Manquante

**Symptômes:**

- Edge Function s'exécute mais ne libère pas les fonds
- Erreur dans les logs: `function atomic_refund does not exist`

**Cause:**

- La migration `secure_frozen_balance_system.sql` n'a pas été appliquée
- Fonction SQL non déployée

**Vérification:**

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('atomic_refund', 'secure_unfreeze_balance');
-- Si résultat vide → PROBLÈME #4
```

**Solution:**

```bash
# Déployer le système sécurisé
psql < migrations/secure_frozen_balance_system.sql
```

---

### ❌ DÉFAILLANCE #5: Race Condition / Idempotence

**Symptômes:**

- Fonction s'exécute mais certaines activations restent gelées
- Logs montrent "Already refunded" mais frozen_amount > 0

**Cause:**

- Double traitement simultané
- État inconsistent dans la DB
- Manque de locks atomiques

**Vérification:**

```sql
-- Activations avec frozen mais status=timeout
SELECT COUNT(*) FROM activations
WHERE status = 'timeout' AND frozen_amount > 0;
-- Si > 0 → PROBLÈME #5
```

**Solution:**

```sql
-- Utiliser la version atomique robuste
SELECT process_expired_activations();
```

---

### ❌ DÉFAILLANCE #6: Logique Métier Incorrecte

**Symptômes:**

- Fonction s'exécute MAIS ne traite pas certaines activations
- Critères de sélection trop restrictifs

**Causes:**

- Mauvaise condition WHERE dans la requête
- Status non inclus dans la liste ('pending', 'waiting')
- Logic flow qui skip les activations

**Vérification:**

```typescript
// Dans cleanup-expired-activations/index.ts
.not('status', 'in', '("received","refunded","completed")')
// ⚠️ Si 'timeout' ou 'cancelled' ne sont PAS exclus → ils seront retraités
```

**Solution:**
Corriger la logique de sélection pour inclure TOUS les cas.

---

### ❌ DÉFAILLANCE #7: Manque de Transaction Atomique

**Symptômes:**

- Parfois ça marche, parfois non
- État inconsistent: status=timeout mais frozen_amount > 0
- Ou: frozen_amount=0 mais users.frozen_balance pas mis à jour

**Cause:**

- Opérations non atomiques
- Pas de BEGIN/COMMIT
- Rollback partiel en cas d'erreur

**Vérification:**

```sql
-- Inconsistances dans les états
SELECT
  a.id,
  a.status,
  a.frozen_amount as "Activation frozen",
  u.frozen_balance as "User frozen"
FROM activations a
JOIN users u ON a.user_id = u.id
WHERE a.frozen_amount = 0 AND a.status = 'pending';
-- Si résultats → PROBLÈME #7
```

**Solution:**
Utiliser `process_expired_activations()` qui garantit l'atomicité.

---

## 🎯 Diagnostic Rapide (5 Minutes)

Exécutez ce script pour identifier LE problème:

```sql
-- 1. CRON configuré?
SELECT COUNT(*) as cron_count FROM cron.job
WHERE jobname = 'cleanup-expired-activations';
-- Si 0 → PROBLÈME #1 (pas de CRON)

-- 2. CRON actif?
SELECT active FROM cron.job
WHERE jobname = 'cleanup-expired-activations';
-- Si false → PROBLÈME #2 (CRON inactif)

-- 3. CRON fonctionne?
SELECT status FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname = 'cleanup-expired-activations'
ORDER BY start_time DESC LIMIT 1;
-- Si failed → PROBLÈME #3 (Edge Function échoue)

-- 4. atomic_refund existe?
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_name = 'atomic_refund';
-- Si 0 → PROBLÈME #4 (fonction SQL manquante)

-- 5. Activations bloquées?
SELECT COUNT(*) FROM activations
WHERE expires_at < NOW()
  AND frozen_amount > 0
  AND status NOT IN ('received', 'completed', 'refunded');
-- Si > 0 → Confirme le problème
```

---

## 🚀 Solutions par Ordre de Probabilité

### Solution #1: Exécution Manuelle Immédiate (90% des cas)

```sql
-- Libérer TOUS les tokens bloqués MAINTENANT
SELECT process_expired_activations();
```

### Solution #2: Configurer les CRON (si jamais fait)

```bash
# Dans Supabase Dashboard > SQL Editor
# Copier-coller SETUP_CRON_JOBS.sql
```

### Solution #3: Déployer le Système Sécurisé (si manquant)

```bash
cd migrations
psql < secure_frozen_balance_system.sql
psql < 20251203_create_atomic_timeout_processor.sql
```

### Solution #4: Redéployer l'Edge Function

```bash
supabase functions deploy cleanup-expired-activations
```

---

## 📈 Monitoring Post-Fix

Après avoir appliqué les solutions, monitorer:

```sql
-- Vérifier qu'il n'y a plus d'activations bloquées
SELECT COUNT(*) FROM activations
WHERE expires_at < NOW()
  AND frozen_amount > 0
  AND status NOT IN ('received', 'completed', 'refunded');
-- Devrait être 0

-- Vérifier que les CRON s'exécutent
SELECT * FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname = 'cleanup-expired-activations'
ORDER BY start_time DESC LIMIT 5;
-- Devrait montrer des exécutions récentes avec status='succeeded'

-- Vérifier la cohérence des balances
SELECT * FROM v_frozen_balance_health;
-- Devrait montrer total_discrepancy = 0
```

---

## 🏆 Recommandation Finale

**ACTION IMMÉDIATE**:

1. Exécuter `DIAGNOSTIC_EXPIRATION_TOKENS.sql` pour identifier LA cause
2. Exécuter `SELECT process_expired_activations();` pour libérer les tokens bloqués
3. Vérifier les CRON jobs avec `SELECT * FROM cron.job;`
4. Si CRON manquant, exécuter `SETUP_CRON_JOBS.sql`

**PRÉVENTION FUTURE**:

- Déployer un monitoring avec `v_frozen_balance_health`
- Alertes si `total_discrepancy > 0`
- CRON job de health check toutes les 15 min

---

## 📚 Fichiers Pertinents

1. **Diagnostic**: `DIAGNOSTIC_EXPIRATION_TOKENS.sql`
2. **CRON Setup**: `SETUP_CRON_JOBS.sql`
3. **Système Sécurisé**: `migrations/secure_frozen_balance_system.sql`
4. **Fonction Atomique**: `migrations/20251203_create_atomic_timeout_processor.sql`
5. **Edge Function**: `supabase/functions/cleanup-expired-activations/index.ts`
6. **Check Status**: `supabase/functions/check-sms-activate-status/index.ts`

---

**Date**: 2025-12-03  
**Auteur**: Analyse système ONE SMS V1  
**Priorité**: 🔴 CRITIQUE - Fonds utilisateurs gelés
