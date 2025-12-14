# 🔧 Configuration Cron Jobs Supabase

## Instructions pour configurer les Cron Jobs

### 1. Accéder au Dashboard Supabase

1. Ouvrir https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw
2. Aller dans **Database** → **Cron Jobs** (ou via pg_cron extension)

### 2. Activer pg_cron Extension

Si pas déjà activé, exécuter dans SQL Editor:

```sql
-- Activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 3. Créer le Cron Job: sync-service-counts

**Exécuter ce SQL dans SQL Editor:**

```sql
-- Créer une fonction wrapper pour appeler l'Edge Function
CREATE OR REPLACE FUNCTION trigger_sync_service_counts()
RETURNS void AS $$
DECLARE
  response TEXT;
BEGIN
  -- Appeler l'Edge Function via pg_net
  SELECT
    net.http_post(
      url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) INTO response;

  RAISE NOTICE 'Sync service counts triggered: %', response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le Cron Job (toutes les 5 minutes)
SELECT cron.schedule(
  'sync-service-counts-every-5min',
  '*/5 * * * *',
  'SELECT trigger_sync_service_counts();'
);
```

### 4. Vérifier les Cron Jobs actifs

```sql
-- Lister tous les cron jobs
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### 5. Alternative: Utiliser Supabase Database Webhooks

Si pg_cron ne fonctionne pas, utiliser **Database Webhooks**:

1. Aller dans **Database** → **Webhooks**
2. Créer un nouveau Webhook:
   - **Table**: `sync_logs` (ou créer une table trigger)
   - **Events**: INSERT
   - **HTTP Request**:
     - URL: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts`
     - Method: POST
     - Headers:
       ```json
       {
         "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY",
         "Content-Type": "application/json"
       }
       ```

### 6. Alternative 2: Utiliser Service Externe (Cron-job.org)

**Utiliser un service externe gratuit:**

1. Aller sur https://cron-job.org
2. Créer un compte gratuit
3. Créer un nouveau Cron Job:
   - **URL**: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts`
   - **Schedule**: `*/5 * * * *` (toutes les 5 minutes)
   - **Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Content-Type: application/json
     ```
   - **Body**: `{}`

### 7. Alternative 3: GitHub Actions (Recommandé)

**Créer `.github/workflows/sync-service-counts.yml`:**

```yaml
name: Sync Service Counts

on:
  schedule:
    # Toutes les 5 minutes
    - cron: "*/5 * * * *"
  workflow_dispatch: # Permet déclenchement manuel

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync-service-counts
        run: |
          curl -X POST \
            'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'

      - name: Check response
        run: echo "Sync triggered successfully"
```

**Configurer le secret:**

1. Aller dans Settings → Secrets → Actions
2. Créer `SUPABASE_SERVICE_ROLE_KEY`
3. Valeur: Votre service role key Supabase

### 8. Tester manuellement

**Test 1: Via curl**

```bash
curl -X POST \
  'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Test 2: Via Supabase Client**

```typescript
const { data, error } = await supabase.functions.invoke("sync-service-counts");
console.log("Sync result:", data);
```

**Test 3: Via SQL**

```sql
-- Créer une entrée test pour déclencher un webhook
INSERT INTO sync_trigger (triggered_at) VALUES (NOW());
```

### 9. Monitoring

**Vérifier les logs d'exécution:**

```sql
-- Voir les dernières syncs
SELECT * FROM sync_logs
WHERE sync_type = 'services'
ORDER BY started_at DESC
LIMIT 10;

-- Statistiques
SELECT
  status,
  COUNT(*) as count,
  AVG(services_synced) as avg_services,
  MAX(started_at) as last_run
FROM sync_logs
WHERE sync_type = 'services'
GROUP BY status;
```

**Via Edge Function logs:**

```bash
npx supabase functions logs sync-service-counts --tail
```

### 10. Recommandation Finale

**Option la plus simple et fiable: GitHub Actions**

✅ **Avantages:**

- Gratuit (2000 minutes/mois)
- Logs détaillés
- Retry automatique
- Déclenchement manuel possible
- Pas de config Supabase complexe

❌ **Alternatives pg_cron:**

- Nécessite configuration PostgreSQL
- Peut être désactivé selon plan Supabase
- Logs moins accessibles

---

## Résumé Configuration

1. ✅ Edge Functions créées et déployées

   - `sync-service-counts` (66.44kB)
   - `get-country-availability` (22.02kB)

2. ✅ Frontend optimisé

   - Services: Lecture DB directe
   - Pays: Vraies quantités via Edge Function

3. ⏳ À faire: Configurer Cron Job

   - **Recommandé**: GitHub Actions (voir ci-dessus)
   - **Alternative**: Cron-job.org
   - **Avancé**: pg_cron PostgreSQL

4. 🎯 Résultat attendu:
   - Services mis à jour toutes les 5 min
   - Chargement < 500ms (vs 1-2s avant)
   - Counts toujours précis (max 5min retard)

---

## Contact Support

Si problème avec pg_cron:

- Vérifier plan Supabase (Pro+ recommandé)
- Contacter support Supabase
- Utiliser GitHub Actions en attendant
