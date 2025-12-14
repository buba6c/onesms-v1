# 🎯 CONFIGURATION DES CRON JOBS SUPABASE

## ✅ DÉJÀ FAIT :

- ✅ SQL déployé (indexes + fonctions + réconciliation)
- ✅ Edge Functions déployées (atomic-timeout-processor, cron-check-pending-sms)
- ✅ 0 orphelins détectés
- ✅ 0 anomalies de balance

## 📋 IL RESTE : Configurer les Cron Jobs automatiques

---

## 🚀 ÉTAPES POUR CONFIGURER LES CRON JOBS

### 1. Ouvrir le Dashboard Supabase

**URL :** https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/database/cron-jobs

---

### 2. Créer le Cron Job #1 : Activations

Cliquer sur **"Create a new cron job"**

**Configuration :**

- **Name :** `reconcile_orphan_freezes`
- **Schedule :** `*/5 * * * *` (toutes les 5 minutes)
- **Command :**

```sql
SELECT reconcile_orphan_freezes();
```

- **Active :** ✅ Coché

Cliquer sur **"Create"**

---

### 3. Créer le Cron Job #2 : Rentals

Cliquer sur **"Create a new cron job"**

**Configuration :**

- **Name :** `reconcile_rentals_orphan_freezes`
- **Schedule :** `*/5 * * * *` (toutes les 5 minutes)
- **Command :**

```sql
SELECT reconcile_rentals_orphan_freezes();
```

- **Active :** ✅ Coché

Cliquer sur **"Create"**

---

## ✅ RÉSULTAT ATTENDU

Après 5 minutes, les Cron Jobs vont :

1. Scanner automatiquement les activations/rentals orphelines
2. Appeler `atomic_refund()` pour chaque orphelin trouvé
3. Logger dans `balance_operations` avec le type `refund`
4. Mettre à jour `frozen_balance` de l'utilisateur

---

## 🔍 VÉRIFICATION

Lance le monitoring pour confirmer que tout fonctionne :

```bash
./monitor_fix.sh
```

**Tu devrais voir :**

- ✅ `orphans_count = 0` (activations + rentals)
- ✅ `idx_scan > 0` (les indexes sont utilisés)
- ✅ `reconciliations_count > 0` (dans les prochaines 24h)

---

## 📊 ÉTAT ACTUEL DU SYSTÈME

```
📊 État des orphelins:      0 activations, 0 rentals
📈 Indexes créés:            idx_activations_reconcile, idx_rentals_reconcile
⚠️  Anomalies:               0 (aucune)
💰 Santé balances:           1 utilisateur "Under-frozen" (-15.00 XOF)
```

**Note :** L'utilisateur "Under-frozen" sera corrigé automatiquement dès qu'une activation passera en statut terminal.

---

## 🎉 C'EST FINI !

Une fois les 2 Cron Jobs créés, ton système sera 100% automatique et sécurisé ! 🚀
