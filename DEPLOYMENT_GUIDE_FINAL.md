# 🚀 GUIDE DE DÉPLOIEMENT FINAL - ONE SMS V1

## 📋 DIAGNOSTIC COMPLET

### ✅ Ce qui fonctionne

- ✅ **API 5sim** : Opérationnelle à 100%
- ✅ **Database** : Toutes les tables accessibles
- ✅ **Column delivery_rate** : Créée dans pricing_rules
- ✅ **Country flags** : Tous les mappings complets
- ✅ **Frontend** : Buildé et déployé avec PM2
- ✅ **Edge Function** : Déployée sur Supabase

### ❌ Problème identifié

**L'Edge Function sync-5sim ne s'exécute PAS**

**Raison**: Secret `FIVE_SIM_API_KEY` non configuré dans Supabase

## 🔧 SOLUTION (3 ÉTAPES SIMPLES)

### Étape 1: Ajouter la clé API 5sim

1. Aller sur : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions
2. Cliquer sur `sync-5sim`
3. Onglet "Secrets"
4. Ajouter :
   - **Name**: `FIVE_SIM_API_KEY`
   - **Value**: [Votre clé depuis https://5sim.net/settings/api]
5. Save

### Étape 2: Tester le Sync

Connectez-vous comme admin et cliquez "Sync from 5sim" dans Services

**OU** via terminal :

```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-5sim' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg" \
  -H "Content-Type: application/json"
```

### Étape 3: Vérifier le Résultat

```bash
curl -s 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/sync_logs?select=*&order=started_at.desc&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg"
```

**Résultat attendu**: `"status": "success"`

## 🎨 BADGES DE COULEUR (après sync)

- 🟢 **VERT** : ≥95% (Excellent)
- 🟡 **JAUNE** : 85-94% (Bon)
- 🟠 **ORANGE** : 70-84% (Moyen)
- 🔴 **ROUGE** : <70% (Faible)

## 📊 TESTS EFFECTUÉS

### Test API 5sim ✅

```bash
curl 'https://5sim.net/v1/guest/prices?country=france&product=google'
# → 200 OK avec données complètes + rate field
```

### Test Edge Function ✅

```bash
curl -X OPTIONS 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-5sim'
# → 200 OK (fonction déployée)
```

### Test Database ✅

```bash
curl 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/countries?limit=1'
curl 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/pricing_rules?select=delivery_rate&limit=1'
# → Tous OK (tables accessibles, column delivery_rate existe)
```

### Test Frontend ✅

```bash
npm run build && pm2 restart onesms-frontend
# → Build OK (1,211 kB), PM2 online (2 workers)
```

## ✅ CHECKLIST

- [x] API 5sim testée et fonctionnelle
- [x] Database tables accessibles
- [x] Column delivery_rate créée
- [x] Country flags mappings complets
- [x] Frontend buildé et déployé
- [x] Edge Function déployée
- [ ] **Secret FIVE_SIM_API_KEY ajouté** ← À FAIRE
- [ ] Sync testé et réussi
- [ ] Badges colorés visibles

---

**Dernière mise à jour**: 21 novembre 2025 - 21:50  
**Statut**: ✅ Prêt pour sync (manque juste la clé API)
