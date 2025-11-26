# ✅ CORRECTION WORKFLOWS GITHUB - SYNCHRONISATION

## 🚨 PROBLÈMES TROUVÉS

### 1. **URLs Supabase incorrectes** ❌
Les workflows pointaient vers un **AUTRE projet Supabase**:
```
https://htfqmamvmhdoixqcbbbw.supabase.co ❌ MAUVAIS PROJET
```

Au lieu de:
```
https://qepxgaozywhjbnvqkgfr.supabase.co ✅ NOTRE PROJET
```

### 2. **Workflow sync-sms-activate.yml manquant** ❌
Le workflow pour synchroniser SMS-Activate n'existait PAS!

**Impact**: 
- Synchronisation manuelle uniquement
- `total_available` jamais mis à jour automatiquement
- Services invisibles dans le Dashboard

### 3. **Fréquence trop élevée** ⚠️
`sync-service-counts.yml` s'exécutait **toutes les 5 minutes**:
- 8,640 runs/mois
- Risque de dépasser le quota GitHub Actions gratuit (2000 min/mois)

---

## ✅ CORRECTIONS APPLIQUÉES

### **1. sync-countries.yml**
```diff
- 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-countries'
+ 'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-countries'
```

### **2. sync-service-counts.yml**
```diff
- cron: '*/5 * * * *'  # Toutes les 5 minutes
+ cron: '*/15 * * * *' # Toutes les 15 minutes

- 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts'
+ 'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-service-counts'
```

### **3. sync-sms-activate.yml** ✨ NOUVEAU
```yaml
name: Sync SMS-Activate

on:
  schedule:
    - cron: '*/30 * * * *' # Toutes les 30 minutes
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync-sms-activate Edge Function
        run: |
          curl -X POST \
            'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-sms-activate' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

---

## 📊 WORKFLOWS APRÈS CORRECTIONS

| Workflow | Fréquence | Edge Function | Status |
|----------|-----------|---------------|--------|
| sync-sms-activate.yml | **30min** ✨ | sync-sms-activate | ✅ Créé |
| sync-service-counts.yml | **15min** 🔧 | sync-service-counts | ✅ Corrigé |
| sync-countries.yml | **1h** | sync-countries | ✅ Corrigé |

**Tous pointent maintenant vers**: `qepxgaozywhjbnvqkgfr.supabase.co` ✅

---

## 🎯 CE QUE FONT LES WORKFLOWS

### **sync-sms-activate.yml** (30min)
1. Fetch SMS-Activate API (getPrices)
2. Insert/Update services avec:
   - Icons corrects (📷💬✈️🔍👤)
   - Catégories (social, messenger, tech...)
   - Noms lisibles (Instagram, WhatsApp...)
   - Scores de popularité (1000, 990, 980...)
3. Insert/Update pricing_rules
4. **Calcule total_available** via `calculate_service_totals()`

**Résultat**: Services affichent les vrais totaux et apparaissent dans le Dashboard

### **sync-service-counts.yml** (15min)
1. Fetch nombres disponibles par pays
2. Met à jour `total_available` pour chaque service
3. Rapide et léger

### **sync-countries.yml** (1h)
1. Fetch liste des pays depuis SMS-Activate
2. Met à jour la table `countries`
3. Peu fréquent car les pays changent rarement

---

## 🚀 DÉPLOIEMENT

✅ **Commit et push effectués**:
```bash
git add .github/workflows/*.yml
git commit -m "Fix: Corriger URLs Supabase et ajouter workflow sync-sms-activate"
git push origin main
```

**Fichiers modifiés**:
- `.github/workflows/sync-countries.yml` (URL corrigée)
- `.github/workflows/sync-service-counts.yml` (URL corrigée + fréquence)
- `.github/workflows/sync-sms-activate.yml` (nouveau)

---

## 🧪 COMMENT TESTER

### **Option 1: Script automatisé**
```bash
./test_github_workflows.sh
```

Ce script:
- ✅ Vérifie que GitHub CLI est installé
- ✅ Vérifie l'authentification
- ✅ Liste les workflows
- ✅ Vérifie les secrets
- ✅ Déclenche sync-sms-activate manuellement
- ✅ Affiche les logs

### **Option 2: Commandes manuelles**

**Lister les workflows**:
```bash
gh workflow list
```

**Déclencher manuellement**:
```bash
gh workflow run sync-sms-activate.yml
gh workflow run sync-service-counts.yml
gh workflow run sync-countries.yml
```

**Voir les runs récents**:
```bash
gh run list --limit 10
```

**Voir les logs d'un run**:
```bash
gh run view <run_id> --log
```

**Suivre en direct**:
```bash
gh run watch <run_id>
```

---

## 🔐 CONFIGURATION REQUISE

### **Secret GitHub: SUPABASE_SERVICE_ROLE_KEY**

**Vérifier s'il existe**:
```bash
gh secret list
```

**L'ajouter s'il manque**:
```bash
gh secret set SUPABASE_SERVICE_ROLE_KEY
```
Puis coller la clé depuis:
https://supabase.com/dashboard/project/qepxgaozywhjbnvqkgfr/settings/api

La clé ressemble à:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 ESTIMATION COÛTS GITHUB ACTIONS

### **Gratuit: 2000 min/mois**

**Avec les nouvelles fréquences**:
```
sync-sms-activate:    30min × 48/j × 30j = 1,440 runs/mois
sync-service-counts:  15min × 96/j × 30j = 2,880 runs/mois
sync-countries:       60min × 24/j × 30j = 720 runs/mois
                                          ────────────────
                                          5,040 runs/mois
```

**Temps moyen par run**: ~30 secondes

**Total minutes/mois**: 5,040 × 0.5min = **2,520 min/mois**

⚠️ **Légèrement au-dessus du quota gratuit**

**Solutions**:
1. Réduire sync-service-counts à 20-30 min → 1,200 min/mois ✅
2. Passer à GitHub Actions payant ($0.008/min) → $20/mois
3. Utiliser Supabase Cron Jobs (gratuit avec le plan) ✅ RECOMMANDÉ

---

## 🎯 ALTERNATIVE: SUPABASE CRON JOBS

**Plus économique et intégré**:

```sql
-- Dans Supabase SQL Editor
SELECT cron.schedule(
  'sync-sms-activate-every-30min',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-sms-activate',
      headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

**Avantages**:
- ✅ Gratuit (inclus dans Supabase)
- ✅ Pas de quota
- ✅ Plus rapide (même infrastructure)
- ✅ Logs dans Supabase Dashboard

---

## ✅ CHECKLIST DE VALIDATION

- [x] URLs Supabase corrigées dans tous les workflows
- [x] Fréquence sync-service-counts réduite (5min → 15min)
- [x] Workflow sync-sms-activate.yml créé
- [x] Commit et push effectués
- [ ] Secret SUPABASE_SERVICE_ROLE_KEY configuré
- [ ] Workflows testés manuellement
- [ ] Logs vérifiés sans erreur
- [ ] Services s'affichent dans le Dashboard après sync

---

## 🔍 DIAGNOSTIC

### **Si les workflows échouent**:

**1. Vérifier les secrets**:
```bash
gh secret list
```

**2. Voir les logs d'erreur**:
```bash
gh run list --limit 5
gh run view <run_id> --log
```

**3. Erreurs courantes**:

**"401 Unauthorized"**:
- Secret SUPABASE_SERVICE_ROLE_KEY manquant ou incorrect
- Solution: `gh secret set SUPABASE_SERVICE_ROLE_KEY`

**"404 Not Found"**:
- URL Supabase incorrecte
- Edge Function pas déployée
- Solution: Vérifier l'URL et déployer la fonction

**"Timeout"**:
- Edge Function prend trop de temps (>5 min)
- Solution: Optimiser la fonction ou augmenter le timeout

---

## 🎉 RÉSULTAT ATTENDU

Après configuration:

```
GitHub Actions:
├── sync-sms-activate.yml ✅
│   └── Toutes les 30 min
│       └── Services + Pricing + Totals
│
├── sync-service-counts.yml ✅
│   └── Toutes les 15 min
│       └── Update counts rapide
│
└── sync-countries.yml ✅
    └── Toutes les 1h
        └── Update pays

Logs GitHub Actions:
✅ Sync SMS-Activate completed successfully
✅ 1024 services updated
✅ 2046 pricing rules synced
✅ Service totals calculated
```

Dashboard:
```
✅ Instagram: 350,000 numbers
✅ WhatsApp: 543,868 numbers
✅ Telegram: 250,000 numbers
✅ Services dans le bon ordre
✅ Icons et catégories corrects
```

---

## 📝 COMMANDES UTILES

```bash
# Lister workflows
gh workflow list

# Déclencher manuellement
gh workflow run sync-sms-activate.yml

# Voir runs récents
gh run list --limit 10

# Voir détails
gh run view <run_id>

# Voir logs
gh run view <run_id> --log

# Suivre en direct
gh run watch <run_id>

# Lister secrets
gh secret list

# Ajouter secret
gh secret set SUPABASE_SERVICE_ROLE_KEY
```

---

## 🚀 PROCHAINES ÉTAPES

1. **Configurer le secret GitHub** (si pas fait):
   ```bash
   gh secret set SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Tester les workflows**:
   ```bash
   ./test_github_workflows.sh
   ```

3. **Vérifier les logs**:
   ```bash
   gh run list
   gh run view <run_id> --log
   ```

4. **Valider dans le Dashboard**:
   - Ouvrir http://localhost:3001
   - Vérifier que les services s'affichent
   - Vérifier les totaux et l'ordre

5. **Optionnel: Migrer vers Supabase Cron** (recommandé):
   - Plus économique
   - Pas de quota
   - Meilleure intégration
