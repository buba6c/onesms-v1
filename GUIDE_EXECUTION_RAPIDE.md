# 🚀 GUIDE D'EXÉCUTION RAPIDE

## ⚡ CORRECTION IMMÉDIATE (5 minutes)

### Étape 1: Ouvrir Supabase SQL Editor

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Cliquer sur "SQL Editor" dans le menu latéral
4. Cliquer sur "+ New Query"

### Étape 2: Copier le script SQL

```bash
# Ouvrir le fichier dans votre éditeur
open scripts/fix-sms-activate-sorting.sql
```

Ou copier directement depuis VS Code:

- Fichier: `scripts/fix-sms-activate-sorting.sql`
- Tout sélectionner (Cmd+A)
- Copier (Cmd+C)

### Étape 3: Exécuter dans Supabase

1. Coller le script dans SQL Editor (Cmd+V)
2. Cliquer sur "Run" (ou Cmd+Enter)
3. Attendre ~5 minutes
4. Vérifier les logs de validation

### Étape 4: Vérifier les résultats

Exécuter cette requête pour voir le Top 30:

```sql
SELECT
  code,
  name,
  popularity_score,
  total_available,
  category,
  CASE
    WHEN code IN ('wa', 'tg', 'vi') THEN '✨ NOUVEAU'
    WHEN code IN ('go', 'ds', 'vk', 'am', 'nf') THEN '🔄 CONSOLIDÉ'
    ELSE '✅ CORRIGÉ'
  END as status
FROM services
WHERE active = true
ORDER BY popularity_score DESC, total_available DESC
LIMIT 30;
```

**Résultat attendu:**

```
wa  - WhatsApp    - 1000 - ✨ NOUVEAU
tg  - Telegram    -  990 - ✨ NOUVEAU
vi  - Viber       -  980 - ✨ NOUVEAU
ig  - Instagram   -  970 - ✅ CORRIGÉ
fb  - Facebook    -  960 - ✅ CORRIGÉ
go  - Google      -  950 - 🔄 CONSOLIDÉ
...
```

---

## 📊 VALIDATION COMPLÈTE

### 1. Vérifier les services manquants

```sql
-- Doit retourner 3 lignes (wa, tg, vi)
SELECT code, name, popularity_score, category
FROM services
WHERE code IN ('wa', 'tg', 'vi')
AND active = true;
```

### 2. Vérifier les duplicats éliminés

```sql
-- Les versions longues doivent être inactive (active = false)
SELECT code, name, active, total_available
FROM services
WHERE code IN (
  'whatsapp', 'telegram', 'viber',
  'google', 'discord', 'vkontakte',
  'amazon', 'netflix', 'uber', 'paypal'
)
ORDER BY code;
```

### 3. Vérifier les catégories

```sql
-- Doit montrer ~50 services populaires
SELECT category, COUNT(*) as count
FROM services
WHERE active = true
GROUP BY category
ORDER BY count DESC;
```

**Résultat attendu:**

```
other         - 1685
shopping      -  180
tech          -  150
social        -  120
entertainment -  110
financial     -   95
messaging     -   85
delivery      -   65
popular       -   50  ← Important!
email         -   45
dating        -   40
```

### 4. Vérifier les performances

```sql
-- Doit montrer 3 index créés
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'services'
AND indexname LIKE 'idx_services_%';
```

**Résultat attendu:**

```
idx_services_popularity_sort
idx_services_category_active
idx_services_name_search
```

---

## 🧪 TESTS DANS LE DASHBOARD

### Test 1: Ordre des services

1. Ouvrir le Dashboard
2. Vérifier que l'ordre est:
   - WhatsApp (💬)
   - Telegram (✈️)
   - Viber (📞)
   - Instagram (📷)
   - Facebook (👤)

### Test 2: Recherche

1. Chercher "whatsapp" → doit trouver 1 résultat (wa)
2. Chercher "telegram" → doit trouver 1 résultat (tg)
3. Chercher "google" → doit trouver 1 résultat (go)

### Test 3: Catégories

1. Filtrer par "popular" → doit afficher 50 services
2. Filtrer par "messaging" → doit inclure wa, tg, vi, ds
3. Filtrer par "social" → doit inclure ig, fb, tw

### Test 4: Performance

1. Ouvrir DevTools (F12)
2. Onglet Network
3. Recharger le Dashboard
4. Chercher la requête "services"
5. Vérifier que le temps < 200ms

---

## 🔄 COMPARAISON AVEC SMS-ACTIVATE

### Méthode 1: Visuelle

1. Ouvrir https://sms-activate.ae/
2. Ouvrir votre Dashboard
3. Comparer l'ordre des 20 premiers services
4. Ils doivent être identiques

### Méthode 2: API

```bash
# Récupérer l'ordre SMS-Activate
curl "https://api.sms-activate.ae/stubs/handler_api.php?api_key=YOUR_KEY&action=getNumbersStatus&country=0"

# Comparer avec notre DB
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

(async () => {
  const { data } = await supabase
    .from('services')
    .select('code, name')
    .eq('active', true)
    .order('popularity_score', { ascending: false })
    .limit(20);

  console.log('Notre ordre:');
  data.forEach((s, i) => console.log(`${i+1}. ${s.code} - ${s.name}`));
})();
EOF
```

---

## ⏮️ ROLLBACK (Si nécessaire)

### Si problème détecté

```sql
-- 1. Créer un backup (AVANT toute modification)
CREATE TABLE services_backup_20251126 AS
SELECT * FROM services;

-- 2. En cas d'erreur, restaurer
BEGIN;
  TRUNCATE services CASCADE;
  INSERT INTO services SELECT * FROM services_backup_20251126;
COMMIT;

-- 3. Vérifier la restauration
SELECT COUNT(*) FROM services;
```

---

## 📈 MÉTRIQUES À SURVEILLER

### Après déploiement (J+1)

1. **Temps de chargement Dashboard**

   - Cible: < 200ms
   - Mesure: DevTools Network tab

2. **Taux de conversion**

   - Services avec activations / Total services visibles
   - Cible: +20% vs avant

3. **Services populaires utilisés**

   - % d'activations sur Top 20
   - Cible: > 80%

4. **Recherche**
   - Temps de réponse
   - Cible: < 100ms

### Dashboard SQL pour monitoring

```sql
-- Créer une vue pour le monitoring
CREATE OR REPLACE VIEW services_monitoring AS
SELECT
  code,
  name,
  popularity_score,
  total_available,
  category,
  CASE
    WHEN popularity_score >= 900 THEN 'Top 10'
    WHEN popularity_score >= 800 THEN 'Top 20'
    WHEN popularity_score >= 700 THEN 'Top 30'
    WHEN category = 'popular' THEN 'Top 50'
    ELSE 'Other'
  END as tier,
  updated_at
FROM services
WHERE active = true
ORDER BY popularity_score DESC;

-- Utiliser la vue
SELECT tier, COUNT(*) as count
FROM services_monitoring
GROUP BY tier
ORDER BY
  CASE tier
    WHEN 'Top 10' THEN 1
    WHEN 'Top 20' THEN 2
    WHEN 'Top 30' THEN 3
    WHEN 'Top 50' THEN 4
    ELSE 5
  END;
```

---

## 🎯 CHECKLIST FINALE

### Avant exécution

- [ ] Backup de la table services créé
- [ ] Script SQL vérifié
- [ ] Accès Supabase SQL Editor confirmé
- [ ] Équipe informée (optionnel)

### Pendant exécution

- [ ] Script copié dans SQL Editor
- [ ] Exécution lancée (Run)
- [ ] Logs surveillés
- [ ] Pas d'erreurs affichées

### Après exécution

- [ ] Top 30 vérifié (wa, tg, vi en tête)
- [ ] Duplicats éliminés (versions longues inactive)
- [ ] 50 services "popular"
- [ ] 3 index créés
- [ ] Dashboard testé
- [ ] Performance mesurée (< 200ms)
- [ ] Comparé avec SMS-Activate

### En production

- [ ] Monitoring activé
- [ ] Métriques collectées (J+1, J+7, J+30)
- [ ] Feedback utilisateurs
- [ ] Documentation mise à jour

---

## 🆘 DÉPANNAGE

### Problème: "Function transfer_service_stock does not exist"

**Solution**: Le script crée cette fonction. Vérifiez que tout le script a été copié.

### Problème: "Timeout during execution"

**Solution**: Exécuter en plusieurs parties:

1. D'abord: Partie 1 (créer services)
2. Ensuite: Partie 2 (consolidation)
3. Enfin: Partie 3 (scores) + Partie 4 (catégories)

### Problème: "Dashboard ne montre pas les changements"

**Solution**:

1. Vider le cache du navigateur (Cmd+Shift+R)
2. Vérifier que la requête React Query est invalidée
3. Redémarrer le dev server si nécessaire

### Problème: "Services toujours en double"

**Solution**: Vérifier que active = false pour les versions longues:

```sql
SELECT code, active FROM services
WHERE code IN ('google', 'discord', 'vkontakte');
```

---

## 📞 SUPPORT

En cas de problème:

1. ✅ Vérifier cette checklist
2. 📚 Consulter `ANALYSE_COMPLETE_TRI_SERVICES.md`
3. 🔍 Exécuter les requêtes de validation
4. 💬 Créer une issue GitHub avec:
   - Message d'erreur exact
   - Logs SQL
   - Captures d'écran

---

## ✅ CONFIRMATION FINALE

Une fois tout exécuté et validé, exécuter cette requête pour générer un rapport:

```sql
SELECT
  '🎉 CORRECTION TERMINÉE' as status,
  (SELECT COUNT(*) FROM services WHERE code IN ('wa', 'tg', 'vi')) as nouveaux_services,
  (SELECT COUNT(*) FROM services WHERE code IN ('google', 'discord', 'vkontakte') AND active = false) as duplicats_elimines,
  (SELECT COUNT(*) FROM services WHERE category = 'popular') as services_populaires,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'services' AND indexname LIKE 'idx_services_%') as index_crees;
```

**Résultat attendu:**

```
status: 🎉 CORRECTION TERMINÉE
nouveaux_services: 3
duplicats_elimines: 3 (ou plus)
services_populaires: 50
index_crees: 3
```

Si tous les chiffres correspondent: **✅ SUCCESS!** 🎉

---

**Dernière mise à jour**: 26 novembre 2025  
**Temps total**: 5-10 minutes  
**Difficulté**: ⭐⭐☆☆☆ (Facile)
