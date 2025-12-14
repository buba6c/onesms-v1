# ✅ CONFIGURATION FINALE SIMPLIFIÉE

## 🎯 Ce qui a été fait automatiquement

✅ Code poussé sur GitHub: https://github.com/buba6c/onesms-v1
✅ Edge Functions déployées (sync-service-counts + get-country-availability)
✅ GitHub Actions workflow créé (cron toutes les 5 minutes)

## 📋 Configuration manuelle requise (2 étapes simples)

### Étape 1: Configurer le secret Supabase (1 minute)

1. Va sur: **https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/settings/functions**

2. Clique sur **"Add new secret"**

3. Ajoute **UN SEUL** secret:

   ```
   Name:  SMS_ACTIVATE_API_KEY
   Value: d29edd5e1d04c3127d5253d5eAe70de8
   ```

4. Clique sur **"Save"**

**Note:** SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont automatiquement injectés par Supabase ✅

### Étape 2: Configurer le secret GitHub (1 minute)

1. Va sur: **https://github.com/buba6c/onesms-v1/settings/secrets/actions**

2. Clique sur **"New repository secret"**

3. Ajoute:

   ```
   Name:  SUPABASE_SERVICE_ROLE_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac
   ```

4. Clique sur **"Add secret"**

---

## 🧪 Test (30 secondes)

Après avoir configuré le secret Supabase, teste avec:

```bash
./test-github-workflow.sh
```

Si ça fonctionne (HTTP 200), passe à l'étape suivante.

---

## ▶️ Activation du cron (30 secondes)

1. Va sur: **https://github.com/buba6c/onesms-v1/actions/workflows/sync-service-counts.yml**

2. Clique sur **"Run workflow"** (bouton à droite)

3. Clique à nouveau sur **"Run workflow"** (menu déroulant)

4. Attends 10-20 secondes et rafraîchis

5. Tu devrais voir un workflow ✅ **vert**

---

## 🎉 Résultat final

Une fois configuré:

✅ Synchronisation automatique **toutes les 5 minutes**
✅ Counts toujours à jour (max 5 min de retard)
✅ Services load: **<500ms** (au lieu de 1-2s)
✅ Vraies quantités pays (au lieu d'approximations)
✅ Logs complets dans `sync_logs` table

---

## 📊 Vérification

### Services mis à jour:

```sql
SELECT code, name, total_available, updated_at
FROM services
WHERE active = true
ORDER BY updated_at DESC
LIMIT 10;
```

### Logs de sync:

```sql
SELECT * FROM sync_logs
WHERE sync_type = 'services'
ORDER BY started_at DESC
LIMIT 5;
```

### GitHub Actions:

→ https://github.com/buba6c/onesms-v1/actions

---

## 🔗 Liens rapides

- **Supabase Functions Settings**: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/settings/functions
- **GitHub Secrets**: https://github.com/buba6c/onesms-v1/settings/secrets/actions
- **GitHub Actions**: https://github.com/buba6c/onesms-v1/actions
- **Edge Function Logs**: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/logs/edge-functions

---

**⏰ Temps total:** 3 minutes
**🚀 Après:** Système 100% automatique!
