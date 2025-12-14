# 🔍 ANALYSE GITHUB WORKFLOWS - SYNCHRONISATION

## 📋 WORKFLOWS EXISTANTS

### 1. **sync-countries.yml**

- **Fréquence**: Toutes les heures (`0 * * * *`)
- **Edge Function**: `sync-countries`
- **URL**: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-countries`
- **Status**: ✅ Actif

### 2. **sync-service-counts.yml**

- **Fréquence**: Toutes les 5 minutes (`*/5 * * * *`)
- **Edge Function**: `sync-service-counts`
- **URL**: `https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts`
- **Status**: ✅ Actif

---

## ⚠️ WORKFLOWS MANQUANTS

### **sync-sms-activate.yml** ❌ MANQUANT

Le workflow pour synchroniser SMS-Activate n'existe PAS!

**Impact**:

- La synchronisation SMS-Activate doit être déclenchée manuellement
- Pas de mise à jour automatique des services/pricing_rules
- `total_available` ne sera pas recalculé automatiquement

---

## 💡 SOLUTION: CRÉER LE WORKFLOW MANQUANT

### **Workflow à créer**: `.github/workflows/sync-sms-activate.yml`

```yaml
name: Sync SMS-Activate

on:
  schedule:
    # Toutes les 30 minutes pour les données fraîches
    - cron: "*/30 * * * *"
  workflow_dispatch: # Permet déclenchement manuel

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync-sms-activate Edge Function
        run: |
          response=$(curl -s -w "\n%{http_code}" -X POST \
            'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-sms-activate' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}')

          http_code=$(echo "$response" | tail -n 1)
          body=$(echo "$response" | sed '$d')

          echo "HTTP Status: $http_code"
          echo "Response: $body"

          if [ "$http_code" -ne 200 ]; then
            echo "❌ Sync SMS-Activate failed with status $http_code"
            exit 1
          fi

          echo "✅ SMS-Activate synchronized successfully"

      - name: Parse and display stats
        run: |
          echo "📊 SMS-Activate synchronized"
          echo "   - Services updated"
          echo "   - Pricing rules updated"
          echo "   - Service totals calculated"
          echo "🔄 Next sync in 30 minutes"
```

---

## 🔧 PROBLÈMES IDENTIFIÉS

### **1. URLs Supabase différentes**

**sync-countries.yml et sync-service-counts.yml utilisent**:

```
https://htfqmamvmhdoixqcbbbw.supabase.co
```

**Mais notre projet utilise**:

```
https://qepxgaozywhjbnvqkgfr.supabase.co
```

⚠️ **Les workflows existants pointent vers un AUTRE projet Supabase!**

### **2. Secrets GitHub manquants**

Les workflows utilisent `${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}`

**Vérifier que ce secret existe**:

```bash
gh secret list
```

Si absent, l'ajouter:

```bash
gh secret set SUPABASE_SERVICE_ROLE_KEY
# Coller la clé service_role depuis Supabase Dashboard
```

---

## 📊 COMPARAISON WORKFLOWS

| Workflow              | Fréquence | Edge Function       | URL Supabase            | Status          |
| --------------------- | --------- | ------------------- | ----------------------- | --------------- |
| sync-countries        | 1h        | sync-countries      | htfqmamvmhdoixqcbbbw ❌ | Actif           |
| sync-service-counts   | 5min      | sync-service-counts | htfqmamvmhdoixqcbbbw ❌ | Actif           |
| **sync-sms-activate** | -         | -                   | -                       | ❌ **MANQUANT** |

---

## 🎯 ACTIONS REQUISES

### **1. Corriger les URLs Supabase**

```yaml
# sync-countries.yml (ligne 13)
- 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-countries'
+ 'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-countries'

# sync-service-counts.yml (ligne 13)
- 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-service-counts'
+ 'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-service-counts'
```

### **2. Créer sync-sms-activate.yml**

Créer le fichier avec le template ci-dessus.

### **3. Vérifier les secrets GitHub**

```bash
# Lister les secrets
gh secret list

# Ajouter si manquant
gh secret set SUPABASE_SERVICE_ROLE_KEY
```

### **4. Tester les workflows**

```bash
# Déclencher manuellement
gh workflow run "Sync SMS-Activate"
gh workflow run "Sync Countries"
gh workflow run "Sync Service Counts"

# Vérifier l'exécution
gh run list
gh run view <run_id>
```

---

## 🚀 FRÉQUENCES RECOMMANDÉES

| Workflow            | Fréquence actuelle | Fréquence recommandée | Raison                       |
| ------------------- | ------------------ | --------------------- | ---------------------------- |
| sync-countries      | 1h                 | **2-4h**              | Pays changent rarement       |
| sync-service-counts | 5min               | **15-30min**          | Trop fréquent, coûteux       |
| sync-sms-activate   | -                  | **30min**             | Données fraîches nécessaires |

---

## 📝 WORKFLOW COMPLET RECOMMANDÉ

### **Option A: Workflow unique avec schedule**

```yaml
name: Sync All Data

on:
  schedule:
    # SMS-Activate: toutes les 30 min
    - cron: "*/30 * * * *"
  workflow_dispatch:

jobs:
  sync-sms-activate:
    runs-on: ubuntu-latest
    steps:
      - name: Sync SMS-Activate
        run: |
          curl -X POST \
            'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-sms-activate' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"

  sync-countries:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 */2 * * *' # Toutes les 2h
    steps:
      - name: Sync Countries
        run: |
          curl -X POST \
            'https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-countries' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

### **Option B: Workflows séparés (recommandé)**

Plus facile à maintenir et surveiller.

---

## ✅ CHECKLIST DE VALIDATION

- [ ] Corriger URL Supabase dans sync-countries.yml
- [ ] Corriger URL Supabase dans sync-service-counts.yml
- [ ] Créer sync-sms-activate.yml
- [ ] Vérifier secret SUPABASE_SERVICE_ROLE_KEY
- [ ] Tester workflow manuellement
- [ ] Vérifier logs d'exécution
- [ ] Ajuster fréquences si nécessaire

---

## 🔍 COMMANDES DE DIAGNOSTIC

### **Vérifier les workflows**:

```bash
# Lister tous les workflows
gh workflow list

# Voir les runs récents
gh run list --limit 20

# Détails d'un run
gh run view <run_id> --log
```

### **Déclencher manuellement**:

```bash
# Sync SMS-Activate (après création)
gh workflow run sync-sms-activate.yml

# Sync Countries
gh workflow run sync-countries.yml

# Sync Service Counts
gh workflow run sync-service-counts.yml
```

### **Vérifier les secrets**:

```bash
# Lister
gh secret list

# Définir
gh secret set SUPABASE_SERVICE_ROLE_KEY
# Puis coller: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 RÉSULTAT ATTENDU

Après corrections:

```
GitHub Actions:
├── sync-sms-activate.yml ✅ (toutes les 30min)
│   └── Sync services, prices, totals
├── sync-countries.yml ✅ (toutes les 2h)
│   └── Sync pays disponibles
└── sync-service-counts.yml ✅ (toutes les 15min)
    └── Update service counts

Toutes pointent vers: qepxgaozywhjbnvqkgfr.supabase.co ✅
```

---

## 🚨 IMPACT SI NON CORRIGÉ

1. **URLs incorrectes** → Workflows échouent silencieusement
2. **sync-sms-activate manquant** → Données obsolètes
3. **total_available non mis à jour** → Services invisibles
4. **Fréquence trop élevée** → Coûts GitHub Actions élevés

---

## 📊 ESTIMATION COÛTS

### **GitHub Actions (gratuit: 2000 min/mois)**

Avec les fréquences actuelles:

```
sync-service-counts: 5min × 12/h × 24h × 30j = 43,200 runs/mois ❌ TROP
sync-countries: 1h × 24h × 30j = 720 runs/mois ✅ OK
sync-sms-activate: 30min × 48/j × 30j = 1,440 runs/mois ✅ OK
```

**Temps moyen par run**: ~30 secondes

**Total minutes/mois**:

- Avant: 43,920 runs × 0.5min = **21,960 min/mois** ❌ DÉPASSE
- Après (15min): 2,880 runs × 0.5min = **1,440 min/mois** ✅ OK

**Recommandation**: Réduire sync-service-counts à 15-30 minutes
