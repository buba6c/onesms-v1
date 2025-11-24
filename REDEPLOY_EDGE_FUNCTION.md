# 🚀 REDÉPLOYER L'EDGE FUNCTION sync-5sim

## ⚡ PROBLÈME RÉSOLU

**Erreur HTTP 546 - WORKER_LIMIT** : L'Edge Function consommait trop de ressources

**Correction appliquée** : 
- Chunk size réduit de **1000 → 500** 
- Suppression du doublon sync_log dans le frontend

## 📝 MÉTHODE 1: Via Dashboard Supabase (RECOMMANDÉ)

### Étapes :

1. **Aller sur** : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions

2. **Cliquer sur** `sync-5sim`

3. **Onglet "Code"** → Cliquer "Edit"

4. **Trouver la ligne 179** qui contient :
   ```typescript
   const chunkSize = 1000
   ```

5. **Remplacer par** :
   ```typescript
   const chunkSize = 500
   ```

6. **Trouver la ligne 177** qui contient :
   ```typescript
   console.log(`Inserting ${pricingRulesToInsert.length} pricing rules in chunks of 1000...`)
   ```

7. **Remplacer par** :
   ```typescript
   console.log(`Inserting ${pricingRulesToInsert.length} pricing rules in chunks of 500...`)
   ```

8. **Cliquer "Deploy"**

9. **Attendre 30 secondes** que le déploiement se termine

10. **Tester** : Lancer un sync depuis Dashboard → Services → "Sync from 5sim"

---

## 📝 MÉTHODE 2: Via CLI (si vous avez un access token)

```bash
cd "/Users/mac/Desktop/ONE SMS V1"

# Option A: Si vous avez le token
export SUPABASE_ACCESS_TOKEN="votre_token_ici"
npx supabase functions deploy sync-5sim --project-ref htfqmamvmhdoixqcbbbw

# Option B: Login interactif (ne fonctionne pas toujours en terminal)
npx supabase login
npx supabase functions deploy sync-5sim --project-ref htfqmamvmhdoixqcbbbw
```

---

## ✅ VÉRIFICATION

Après le redéploiement, tester :

```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-5sim' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg" \
  -H "Content-Type: application/json"
```

**Résultat attendu** : Pas d'erreur 546, sync réussi

---

## 🎯 RÉSUMÉ DES CORRECTIONS

| Problème | Solution |
|----------|----------|
| ❌ HTTP 546 WORKER_LIMIT | ✅ Chunk 1000 → 500 |
| ❌ 400 sur sync_logs | ✅ Supprimé doublon frontend |
| ❌ ti.png 404 | ✅ Ajouté 'tit': 'tt' |
| ❌ CORS countries | ⏳ Se résoudra après sync |

---

**Date** : 21 novembre 2025 - 22:15  
**Status** : Frontend redéployé ✅ | Edge Function à redéployer ⏳
