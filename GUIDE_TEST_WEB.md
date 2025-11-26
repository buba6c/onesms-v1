# 📱 Guide de Test - Interface Web

## 🎯 Tests à Effectuer sur http://localhost:3001

### ✅ Test 1: Vérifier les Stats Corrigées

**Page**: http://localhost:3001/admin/services

**À vérifier**:
1. **Total Numbers** ne doit PAS afficher 5,000,000 ou 10,000,000
2. **Pricing rules** doit afficher le vrai nombre (pas 1000)
3. Console browser doit afficher: `[STATS] Pricing rules: XXXX, Total available: XXXX (from YYYY records)`

**Console Browser (F12)**:
```
📊 [STATS] Services: 2433 Active: XX Popular: XX Pricing rules: 25835 Total available: XXXXXXX (from 25835 records)
```

---

### ✅ Test 2: Nettoyer et Synchroniser

**Page**: http://localhost:3001/admin/services

**Actions**:
1. Ouvrir la console browser (F12)
2. Cliquer sur "Synchroniser avec SMS-Activate"
3. Attendre la fin (5-10 secondes)
4. Vérifier le toast de succès

**Résultat attendu**:
```
Toast: "Sync completed!"
Description: "Synced 1024 services, 205 countries, 2000+ prices"
```

---

### ✅ Test 3: Vérifier l'Ordre des Services

**Page**: http://localhost:3001 (Dashboard)

**À vérifier**:
Les 10 premiers services doivent être dans cet ordre:
1. **Instagram** (ig)
2. **WhatsApp** (wa)
3. **Telegram** (tg)
4. **Google** (go)
5. **Facebook** (fb)
6. **VK** (vk)
7. **Twitter** (tw)
8. **OK** (ok)
9. **Viber** (vi)
10. **Discord** (ds)

**❌ Ordre INCORRECT (avant correction)**:
1. WhatsApp
2. Telegram
3. PayPal
4. Badoo
...

---

### ✅ Test 4: Vérifier les Nombres Disponibles

**Page**: http://localhost:3001 (Dashboard)

**Actions**:
1. Sélectionner service: **WhatsApp**
2. Sélectionner pays: **United States**
3. Vérifier le nombre affiché

**Résultat attendu**:
- **Avant**: 999 numbers available
- **Après**: ~73,000 numbers available

**Autres exemples**:
- Philippines: ~29,000 numbers
- Indonesia: ~70,000 numbers
- India: ~2,700 numbers
- Canada: ~138,000 numbers

---

### ✅ Test 5: Vérifier les Prix

**Page**: http://localhost:3001 (Dashboard)

**À vérifier**:
- WhatsApp USA: $2.50
- WhatsApp Philippines: $0.28
- WhatsApp Indonesia: $0.18
- WhatsApp India: $0.50
- WhatsApp Canada: $0.40

**❌ Prix INCORRECTS (avant)**:
- Tous à 999 ou mélangés

---

## 🔧 Commandes Terminal (si nécessaire)

### Nettoyer les anciennes pricing_rules
```bash
cd "/Users/mac/Desktop/ONE SMS V1"
node cleanup_old_rules.mjs
```

**Output attendu**:
```
🧹 Nettoyage des anciennes pricing_rules...

📊 État actuel:
   sms-activate: 17 total (17 actives)
   5sim: 25000 total (20000 actives)
   ...
   
   TOTAL: 25835 règles

🗑️  Suppression des règles NON sms-activate...
✅ 25818 anciennes règles supprimées

📊 État final: 17 règles restantes (toutes sms-activate)
```

---

### Test Complet Automatisé
```bash
cd "/Users/mac/Desktop/ONE SMS V1"
./test_full_sync.sh
```

**Note**: Ce script nécessite une connexion réseau fonctionnelle à Supabase.

---

## 🐛 Problèmes Connus

### Erreur DNS (Node.js)
```
TypeError: fetch failed
Caused by: Error: getaddrinfo ENOTFOUND qepxgaozywhjbnvqkgfr.supabase.co
```

**Solution**: Utiliser l'interface web (localhost:3001) au lieu des scripts Node.js

### Serveur Dev ne démarre pas
```bash
# Vérifier si port 3001 est occupé
lsof -ti:3001

# Tuer les processus si nécessaire
kill -9 $(lsof -ti:3001)

# Redémarrer
npm run dev
```

---

## 📸 Captures d'Écran Attendues

### Admin Panel - Stats
```
┌─────────────────────────────────────────┐
│ Total Services: 2433                    │
│ Active: 1024                            │
│ Popular: 85                             │
│ Total Numbers: 543,868                  │
└─────────────────────────────────────────┘
```

### Dashboard - Services Order
```
1. 📷 Instagram      150,000 numbers
2. 💬 WhatsApp       543,868 numbers
3. ✈️  Telegram      250,000 numbers
4. 🔍 Google         189,000 numbers
5. 👤 Facebook       437,201 numbers
...
```

### Dashboard - WhatsApp Countries
```
United States       73,520 numbers    $2.50
Philippines         29,954 numbers    $0.28
Indonesia           70,776 numbers    $0.18
Canada             138,024 numbers    $0.40
India                2,723 numbers    $0.50
```

---

## ✅ Checklist de Validation

Avant de dire "C'est bon!":

- [ ] Stats affichent les vrais nombres (pas 1000/5M)
- [ ] Console affiche `(from XXXX records)` avec pagination
- [ ] Services dans le bon ordre (Instagram premier)
- [ ] WhatsApp affiche 73k+ numbers pour USA
- [ ] Prix corrects ($2.50 pour WhatsApp USA)
- [ ] Pas d'erreurs dans la console browser
- [ ] Sync fonctionne sans erreur
- [ ] Toast "Sync completed!" s'affiche

---

## 🚀 Après Validation Complète

Quand TOUT fonctionne localement:

1. Commit les changements:
   ```bash
   git add .
   git commit -m "fix: corrections stats pagination + ordre services SMS-Activate"
   git push
   ```

2. Déployer sur Netlify:
   - Netlify va automatiquement builder et déployer
   - Attendre 2-3 minutes
   - Tester sur https://onesms-v1.netlify.app

3. Vérifier en production:
   - Mêmes tests que localement
   - S'assurer que tout fonctionne
