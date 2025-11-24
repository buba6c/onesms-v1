# 🔧 CONFIGURATION REQUISE POUR LE CRON

## ⚠️ PROBLÈME ACTUEL

L'Edge Function `sync-service-counts` renvoie une erreur 401 car elle n'a pas accès aux variables d'environnement nécessaires.

## 📋 ÉTAPES DE CONFIGURATION

### 1. Configurer les variables d'environnement Supabase

Va sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/settings/functions

Clique sur **"Edge Functions"** → **"Add new secret"**

Ajoute ces 2 secrets:

#### Secret 1:
```
Name: SMS_ACTIVATE_API_KEY
Value: d29edd5e1d04c3127d5253d5eAe70de8
```

#### Secret 2:
```
Name: SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac
```

**Note:** PROJECT_URL n'est pas nécessaire (l'URL est hardcodée dans le code)

### 2. Configurer le secret GitHub (pour le cron)

Va sur: https://github.com/buba6c/onesms-v1/settings/secrets/actions

Clique sur **"New repository secret"**

#### Secret GitHub:
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac
```

### 3. Tester l'Edge Function

Une fois les secrets Supabase configurés, teste avec:

```bash
./test-github-workflow.sh
```

Tu devrais voir: `✅ SUCCESS: Le workflow fonctionne correctement!`

### 4. Activer le cron GitHub Actions

Va sur: https://github.com/buba6c/onesms-v1/actions/workflows/sync-service-counts.yml

Clique sur **"Run workflow"** pour tester manuellement

Le cron automatique s'exécutera ensuite **toutes les 5 minutes** automatiquement.

---

## 📊 VÉRIFICATION

### Après configuration, vérifie:

1. **Edge Function fonctionne:**
   ```bash
   ./test-github-workflow.sh
   ```
   Devrait retourner HTTP 200 avec stats

2. **Logs de sync:**
   ```sql
   SELECT * FROM sync_logs 
   WHERE sync_type = 'services'
   ORDER BY started_at DESC 
   LIMIT 5;
   ```

3. **Services mis à jour:**
   ```sql
   SELECT code, name, total_available, updated_at
   FROM services
   WHERE active = true
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

4. **GitHub Actions:**
   - Va sur https://github.com/buba6c/onesms-v1/actions
   - Tu devrais voir un workflow ✅ vert toutes les 5 minutes

---

## 🎯 RÉSULTAT FINAL

Une fois configuré:
- ✅ Sync automatique toutes les 5 minutes
- ✅ Counts toujours à jour (max 5 min de retard)
- ✅ Frontend charge les services en <500ms
- ✅ Logs complets dans `sync_logs` table

---

## 🔗 LIENS RAPIDES

- **Supabase Edge Functions**: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/settings/functions
- **GitHub Secrets**: https://github.com/buba6c/onesms-v1/settings/secrets/actions
- **GitHub Actions**: https://github.com/buba6c/onesms-v1/actions
- **Supabase Logs**: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/logs/edge-functions

---

**⏰ Temps estimé:** 5 minutes de configuration
**✨ Après:** Système 100% automatique!
