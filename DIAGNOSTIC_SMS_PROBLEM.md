# 🔍 DIAGNOSTIC COMPLET - Problème SMS non reçu

## 📱 CAS SPÉCIFIQUE: Numéro +44 7429215087

### Symptôme
- SMS reçu sur 5sim ✅
- SMS **N'apparaît PAS** sur votre plateforme ❌
- Statut reste "Waiting for SMS" ⏳

---

## 🎯 ANALYSE DES CAUSES POSSIBLES

### 1. **Système de Polling défaillant** (Probabilité: 80%)

**Vérification:**
```bash
# Ouvrir la console du navigateur (F12)
# Chercher les logs:
[POLLING] Démarrage pour...
[CHECK] Vérification SMS...
[CHECK] Résultat:...
```

**Si absent** → Le polling ne démarre pas
**Si présent mais pas de "SMS reçu"** → L'Edge Function échoue

**Causes possibles:**
- ✅ Code du polling existe (`src/hooks/useSmsPolling.ts`)
- ❌ Polling ne se déclenche pas après achat
- ❌ Edge Function `check-5sim-sms` échoue

---

### 2. **Edge Function check-5sim-sms défaillante** (Probabilité: 60%)

**Vérification:**
```bash
# Voir les logs Supabase
https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/check-5sim-sms/logs

# Chercher:
📨 [CHECK] Vérification SMS:...
❌ [CHECK] 5sim error:...
✅ [CHECK] SMS reçu !...
```

**Causes possibles:**
- ❌ `FIVE_SIM_API_KEY` non configuré → Erreur 401/403
- ❌ Order ID invalide
- ❌ Activation non trouvée en DB
- ❌ Erreur lors de la mise à jour DB

---

### 3. **Problème de statut en base de données** (Probabilité: 40%)

**Vérification:**
```sql
SELECT 
  id,
  order_id,
  phone_number,
  status,
  sms_code,
  sms_text,
  created_at,
  expires_at,
  sms_received_at
FROM activations
WHERE phone_number LIKE '%7429215087%'
ORDER BY created_at DESC;
```

**États possibles:**
- `status = 'pending'` → En attente, normal
- `status = 'received'` + `sms_code = NULL` → Bug mise à jour partielle
- `status = 'timeout'` → Expiré (mauvais)
- `status = 'cancelled'` → Annulé par erreur

---

### 4. **Webhook non configuré** (Probabilité: 30%)

**Vérification:**
```bash
# Dashboard 5sim.net → Settings → API → Webhooks
# Vérifier si configuré:
Webhook URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sms-webhook
```

**Si absent** → Pas de notifications instantanées (pas critique si polling fonctionne)

---

## 🔧 SOLUTIONS PAR ORDRE DE PRIORITÉ

### Solution 1: Vérifier et corriger le polling (PRIORITÉ HAUTE)

**Fichier:** `src/hooks/useSmsPolling.ts`

**Vérifications:**
1. Hook est-il appelé dans `DashboardPage.tsx` ?
2. `activeNumbers` contient-il le numéro acheté ?
3. Le statut est-il bien `'waiting'` ?
4. L'intervalle se déclenche-t-il ?

**Test manuel:**
```typescript
// Dans Console du navigateur (F12)
// Après achat d'un numéro:
console.log('Active numbers:', window.__activeNumbers);
```

**Correction si polling ne démarre pas:**
```typescript
// DashboardPage.tsx - Ligne ~158
useEffect(() => {
  console.log('🔍 [DEBUG] Active numbers changed:', activeNumbers.length);
  console.log('🔍 [DEBUG] Waiting numbers:', activeNumbers.filter(n => n.status === 'waiting').length);
}, [activeNumbers]);
```

---

### Solution 2: Configurer FIVE_SIM_API_KEY (PRIORITÉ HAUTE)

**1. Récupérer votre clé API:**
- Aller sur https://5sim.net/settings/api
- Copier "API Key"

**2. Ajouter dans Supabase:**
```bash
# Via Dashboard:
https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/settings/functions

# Onglet Secrets → Add secret:
Name: FIVE_SIM_API_KEY
Value: [votre clé]
```

**3. Redéployer les fonctions:**
```bash
cd "/Users/mac/Desktop/ONE SMS V1"
supabase functions deploy check-5sim-sms --project-ref htfqmamvmhdoixqcbbbw
supabase functions deploy buy-5sim-number --project-ref htfqmamvmhdoixqcbbbw
```

---

### Solution 3: Corriger manuellement l'activation en DB (TEMPORAIRE)

**Si le SMS est bien reçu sur 5sim mais pas dans votre DB:**

```sql
-- 1. Trouver l'activation
SELECT id, order_id, status, sms_code 
FROM activations 
WHERE phone_number LIKE '%7429215087%' 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Mettre à jour avec le SMS reçu (remplacer les valeurs)
UPDATE activations
SET 
  status = 'received',
  sms_code = '123456',  -- Code reçu sur 5sim
  sms_text = 'Your verification code is 123456',
  sms_received_at = NOW()
WHERE id = [ID_DE_L_ACTIVATION];

-- 3. Facturer l'utilisateur (mettre à jour transaction)
UPDATE transactions
SET 
  status = 'completed',
  completed_at = NOW()
WHERE metadata->>'activation_id' = '[ID_DE_L_ACTIVATION]'
AND status = 'pending';
```

---

### Solution 4: Activer le webhook 5sim (RECOMMANDÉ)

**Configuration:**

1. **Sur 5sim.net:**
   - Aller dans Settings → API → Webhooks
   - Ajouter:
     ```
     URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sms-webhook
     Method: POST
     Events: SMS Received, Order Status Changed
     ```

2. **Vérifier l'Edge Function:**
   ```bash
   # Voir les logs:
   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/sms-webhook/logs
   ```

3. **Tester:**
   ```bash
   curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sms-webhook' \
     -H 'Content-Type: application/json' \
     -d '{
       "id": 12345,
       "phone": "+447429215087",
       "status": "RECEIVED",
       "sms": [{
         "sender": "Test",
         "text": "Test SMS 123456",
         "code": "123456",
         "date": "2025-11-21T20:00:00Z"
       }]
     }'
   ```

---

## 🧪 SCRIPT DE TEST COMPLET

**Créé:** `test_5sim_api.mjs`

**Usage:**
```bash
export FIVE_SIM_API_KEY=votre_cle_5sim
node test_5sim_api.mjs
```

**Ce qu'il fait:**
1. ✅ Vérifie la connexion à l'API 5sim
2. ✅ Récupère l'historique des commandes
3. ✅ Cherche le numéro +44 7429215087
4. ✅ Affiche les SMS reçus (si présents)
5. ✅ Diagnostique le problème

---

## 📊 CHECKLIST DE DIAGNOSTIC

### Étape 1: Vérifier 5sim
- [ ] SMS bien reçu sur 5sim.net ? (vérifier dans Orders)
- [ ] Clé API 5sim valide ?
- [ ] Balance suffisante ?

### Étape 2: Vérifier Supabase
- [ ] `FIVE_SIM_API_KEY` configuré ?
- [ ] Edge Functions déployées ?
- [ ] Logs des Edge Functions (erreurs ?) ?

### Étape 3: Vérifier Base de données
- [ ] Activation existe en DB ?
- [ ] Statut de l'activation ?
- [ ] SMS code présent en DB ?

### Étape 4: Vérifier Frontend
- [ ] Console browser: logs de polling ?
- [ ] Hook `useSmsPolling` s'exécute ?
- [ ] Numéro bien dans `activeNumbers` ?

### Étape 5: Vérifier Webhook (optionnel)
- [ ] Webhook configuré sur 5sim ?
- [ ] Logs webhook dans Supabase ?

---

## 🚨 ACTIONS IMMÉDIATES

### 1. Exécuter le script de diagnostic
```bash
cd "/Users/mac/Desktop/ONE SMS V1"
export FIVE_SIM_API_KEY=votre_cle_5sim
node test_5sim_api.mjs
```

### 2. Vérifier les logs Supabase
```
https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions/check-5sim-sms/logs
```

### 3. Vérifier la console navigateur
- Ouvrir http://localhost:3000
- F12 → Console
- Acheter un numéro test
- Regarder les logs `[POLLING]` et `[CHECK]`

### 4. Si le problème persiste
- Envoyez-moi:
  1. Output du script `test_5sim_api.mjs`
  2. Logs Supabase Edge Functions
  3. Logs console navigateur
  4. SQL query result de l'activation

---

## 🎯 SOLUTION RAPIDE POUR LE NUMÉRO +44 7429215087

**Si vous voulez juste afficher le SMS reçu immédiatement:**

1. Allez sur https://5sim.net/orders
2. Trouvez l'order avec +44 7429215087
3. Copiez le code SMS reçu
4. Exécutez dans Supabase SQL Editor:

```sql
-- Trouver l'activation
SELECT id, order_id, status FROM activations 
WHERE phone_number LIKE '%7429215087%' 
ORDER BY created_at DESC LIMIT 1;

-- Mettre à jour (remplacer ID et CODE)
UPDATE activations
SET 
  status = 'received',
  sms_code = 'VOTRE_CODE_ICI',
  sms_text = 'Le texte complet du SMS ici',
  sms_received_at = NOW()
WHERE id = 'ID_TROUVE_CI_DESSUS';
```

Ensuite rafraîchir votre dashboard (F5).

---

## 📞 PROCHAINES ÉTAPES

1. **Urgent**: Configurer `FIVE_SIM_API_KEY` dans Supabase
2. **Important**: Tester le polling en live (acheter un numéro test)
3. **Recommandé**: Configurer le webhook 5sim
4. **Optionnel**: Améliorer les logs de debug

---

**Date**: 21 novembre 2025  
**Statut**: Diagnostic complet terminé  
**Action requise**: Exécuter les tests et corrections ci-dessus
